import { NavigationGraph } from '../compiler/navigationGraph.js';
import { StopAndWaitCoordinator } from '../coordination/baseline/stopAndWait.js';
import { ConflictEvent, detectPairwiseConflict } from '../coordination/conflictDetector.js';
import { DeadlockDetector, WaitForRelation } from '../coordination/deadlockDetector.js';
import { resolveRightOfWay } from '../coordination/rightOfWayResolver.js';
import { allocateTask, WarehouseTask } from '../planner/taskAllocator.js';
import { AMRObject, Floor, FloorConnection, WarehouseModel } from '../warehouse/types.js';
import { ElevatorAgent } from './elevatorAgent.js';
import { EmergencyManager } from './emergencyManager.js';
import { MetricsCollector } from './metricsCollector.js';
import { RobotAgent } from './robotAgent.js';
import { ChargerSimulationState, SimEvent, SimulationFrame, SimulationMode } from './types.js';

export interface SimulationConfig {
  mode: SimulationMode;
  randomSeed?: number;
  timeStepSec?: number;
}

export class SimulationEngine {
  public readonly mode: SimulationMode;
  public readonly warehouseModel: WarehouseModel;
  public readonly navGraph: NavigationGraph;

  private simTimeSec = 0;
  private timeStepSec = 0.2; // 5Hz simulation tick
  private robots: Map<string, RobotAgent> = new Map();
  private elevators: Map<string, ElevatorAgent> = new Map();
  private chargers: Map<string, { id: string; floorId: string; capacity: number; chargeRateKw: number }> = new Map();
  private pendingTasks: WarehouseTask[] = [];

  private stopAndWaitCoordinator = new StopAndWaitCoordinator();
  private emergencyManager = new EmergencyManager();
  private metricsCollector = new MetricsCollector();
  private eventLog: SimEvent[] = [];

  constructor(
    warehouseModel: WarehouseModel,
    navGraph: NavigationGraph,
    config: SimulationConfig
  ) {
    this.warehouseModel = warehouseModel;
    this.navGraph = navGraph;
    this.mode = config.mode;
    this.timeStepSec = config.timeStepSec || 0.2;

    this.initializeEntities();
  }

  private initializeEntities(): void {
    // 1. Initialize AMRs from warehouse model
    for (const floor of this.warehouseModel.floors) {
      for (const obj of floor.objects) {
        if (obj.type === 'amr') {
          const robot = new RobotAgent(obj as AMRObject);
          this.robots.set(robot.id, robot);
        } else if (obj.type === 'charger') {
          this.chargers.set(obj.id, {
            id: obj.id,
            floorId: floor.id,
            capacity: (obj as any).capacityUnits || 1,
            chargeRateKw: (obj as any).chargeRateKw || 22,
          });
        }
      }
    }

    // 2. Initialize Elevators
    const floorElevations: Record<string, number> = {};
    for (const f of this.warehouseModel.floors) {
      floorElevations[f.id] = f.elevationMeters;
    }

    for (const conn of this.warehouseModel.connections) {
      if (conn.type === 'ELEVATOR') {
        const elev = new ElevatorAgent(
          conn.id,
          conn.connectedFloors,
          floorElevations,
          conn.transitTimeSecondsPerFloor ? 5 / conn.transitTimeSecondsPerFloor : 1.2
        );
        this.elevators.set(elev.id, elev);
      }
    }

    this.logEvent(`Simulation initialized in ${this.mode} mode. ${this.robots.size} AMRs online.`, 'SYSTEM', 'INFO');
  }

  public addTasks(tasks: WarehouseTask[]): void {
    this.pendingTasks.push(...tasks);
    this.metricsCollector.updateTime(this.simTimeSec, this.robots.size);
  }

  public step(dtSec?: number): SimulationFrame {
    const dt = dtSec || this.timeStepSec;
    this.simTimeSec += dt;

    const blockedNodes = this.emergencyManager.getActiveBlockedNodes();

    // 1. Task dispatching for idle AMRs
    this.dispatchPendingTasks(blockedNodes);

    // 2. Multi-robot coordination (P2P in Proposed mode)
    if (this.mode === 'PROPOSED') {
      this.runDecentralizedCoordination(blockedNodes);
    }

    // 3. Update Robots
    const activeMode: 'BASELINE' | 'PROPOSED' = this.mode === 'SIDE_BY_SIDE' ? 'PROPOSED' : this.mode;
    for (const robot of this.robots.values()) {
      robot.update(
        dt,
        this.simTimeSec,
        this.navGraph,
        activeMode,
        this.stopAndWaitCoordinator,
        blockedNodes,
        (task, duration) => {
          this.metricsCollector.recordTaskCompletion(duration);
        },
        (msg, type) => {
          this.logEvent(msg, type, 'INFO');
        }
      );
    }

    // 4. Elevator orchestration: handle calling, boarding, vertical transit, and disembarking
    for (const elev of this.elevators.values()) {
      // Determine world X, Z coordinates for this elevator shaft
      const conn = this.warehouseModel.connections.find((c) => c.id === elev.id);
      const elevPos = conn?.entryNodesByFloor['floor-1'] || [0, 0, 0];
      const elevX = elevPos[0];
      const elevZ = elevPos[2];

      if (elev.occupantRobotId) {
        // Robot is currently riding inside the elevator cab
        const occupant = this.robots.get(elev.occupantRobotId);
        if (occupant) {
          // Lock robot position inside the cab at the elevator's current animated height
          occupant.position[0] = elevX;
          occupant.position[2] = elevZ;
          occupant.position[1] = elev.currentHeightMeters;
          occupant.speedMps = 0;
          occupant.status = 'MOVING';

          // Check if elevator arrived at destination height
          if (Math.abs(elev.currentHeightMeters - elev.targetHeightMeters) <= 0.08) {
            // Find destination floor corresponding to target height
            let destFloorId = occupant.floorId;
            for (const [fId, elevM] of Object.entries(elev.floorElevations)) {
              if (Math.abs(elevM - elev.targetHeightMeters) <= 0.08) {
                destFloorId = fId;
                break;
              }
            }

            occupant.floorId = destFloorId;
            occupant.position[1] = elev.targetHeightMeters;
            occupant.currentPathIndex++;
            elev.exitRobot(occupant.id);

            this.logEvent(
              `Elevator ${elev.id} delivered ${occupant.id} to ${destFloorId}. Resuming navigation.`,
              'ROBOT',
              'INFO'
            );
          }
        }
      } else {
        // Elevator is empty: look for robots waiting to use this elevator
        let waitingRobot: RobotAgent | null = null;
        let waitingDestFloorId = '';

        for (const robot of this.robots.values()) {
          if (robot.currentPath.length > 0 && robot.currentPathIndex < robot.currentPath.length) {
            const targetWaypoint = robot.currentPath[robot.currentPathIndex];
            if (
              targetWaypoint &&
              targetWaypoint.nodeId.startsWith(`elev_node_${elev.id}`) &&
              targetWaypoint.floorId !== robot.floorId
            ) {
              // Robot is at elevator landing wanting to go to targetWaypoint.floorId
              waitingRobot = robot;
              waitingDestFloorId = targetWaypoint.floorId;
              break;
            }
          }
        }

        if (waitingRobot && waitingDestFloorId) {
          const pickupFloorId = waitingRobot.floorId;
          const pickupHeight = elev.floorElevations[pickupFloorId] ?? 0;

          if (Math.abs(elev.currentHeightMeters - pickupHeight) <= 0.08) {
            // Elevator is already at the robot's pickup floor: board immediately!
            const boarded = elev.boardRobot(waitingRobot.id, waitingDestFloorId);
            if (boarded) {
              waitingRobot.position[0] = elevX;
              waitingRobot.position[2] = elevZ;
              waitingRobot.position[1] = elev.currentHeightMeters;
              waitingRobot.speedMps = 0;
              this.logEvent(
                `${waitingRobot.id} boarded elevator ${elev.id} on ${pickupFloorId} → heading to ${waitingDestFloorId}`,
                'ROBOT',
                'INFO'
              );
            }
          } else {
            // Call elevator to the robot's pickup floor
            elev.requestElevator(waitingRobot.id, pickupFloorId);
            waitingRobot.status = 'WAITING';
            waitingRobot.speedMps = 0;
          }
        }
      }

      // Advance elevator cab physics
      elev.update(dt);
    }

    // 5. Update Metrics
    const activeRobotsCount = Array.from(this.robots.values()).filter(
      (r) => r.status === 'MOVING' || r.status === 'WAITING' || r.status === 'YIELDING'
    ).length;
    this.metricsCollector.updateTime(Math.round(this.simTimeSec), activeRobotsCount);

    return this.createFrameSnapshot();
  }

  private dispatchPendingTasks(blockedNodes: Set<string>): void {
    // If queue is empty AND all robots are idle, recycle tasks to keep fleet busy
    if (this.pendingTasks.length === 0) {
      const anyActive = Array.from(this.robots.values()).some(
        (r) => r.status === 'MOVING' || r.status === 'WAITING' || r.status === 'YIELDING' || r.currentTask
      );
      if (!anyActive && this.simTimeSec > 5) {
        // Recycle: generate new tasks from all racks
        const racks = ['R12', 'R17', 'R14', 'R03'];
        const stations = ['PACK-01', 'PACK-02', 'DOCK-01', 'DOCK-02'];
        const pickupFloors: Record<string, string> = { R12: 'floor-2', R17: 'floor-2', R14: 'floor-2', R03: 'floor-3' };
        const skus = ['SKU-A', 'SKU-B', 'SKU-C'];
        const prios: Array<'NORMAL' | 'HIGH' | 'CRITICAL'> = ['NORMAL', 'HIGH', 'CRITICAL'];
        const recycled: any[] = [];
        for (let i = 0; i < 6; i++) {
          const rack = racks[i % racks.length]!;
          const station = stations[i % stations.length]!;
          const isF1Station = true;
          recycled.push({
            id: `R${Math.floor(2000 + Math.random() * 8000)}`,
            sku: skus[i % skus.length]!,
            quantity: 5 + Math.floor(Math.random() * 20),
            pickupRackId: rack,
            pickupFloorId: pickupFloors[rack]!,
            pickupLevel: 1 + Math.floor(Math.random() * 3),
            dropStationId: station,
            dropFloorId: 'floor-1',
            weightKg: 10 + Math.random() * 60,
            priority: prios[i % prios.length]!,
            status: 'PENDING' as const,
            createdTimeSec: this.simTimeSec,
          });
        }
        this.pendingTasks.push(...recycled);
        this.logEvent(`Task queue recycled: ${recycled.length} new tasks generated for continuous fleet operation.`, 'TASK', 'INFO');
      }
      return;
    }

    const idleRobots = Array.from(this.robots.values())
      .filter((r) => r.status === 'IDLE' && !r.currentTask)
      .map((r) => r.initialSpec);

    if (idleRobots.length === 0) return;

    const activeMode: 'BASELINE' | 'PROPOSED' = this.mode === 'SIDE_BY_SIDE' ? 'PROPOSED' : this.mode;

    for (let i = this.pendingTasks.length - 1; i >= 0; i--) {
      const task = this.pendingTasks[i]!;
      const allocation = allocateTask(task, idleRobots, this.warehouseModel.floors);

      if (allocation.assignedRobotId) {
        const robot = this.robots.get(allocation.assignedRobotId);
        if (robot) {
          robot.currentTask = task;
          robot.taskPhase = 'NAV_TO_PICKUP';
          robot.taskStartTimeSec = this.simTimeSec;

          // Find start node and pickup node
          const startNodeId = this.findNearestNodeId(robot.position, robot.floorId);
          const pickupNodeId = `pickup_${task.pickupRackId}`;

          const planned = robot.planRoute(
            this.navGraph,
            startNodeId,
            pickupNodeId,
            this.simTimeSec,
            activeMode,
            blockedNodes
          );

          if (planned) {
            this.logEvent(
              `TASK-${task.id} (${task.sku} x${task.quantity}) assigned to ${robot.id}. Routing to Rack ${task.pickupRackId}.`,
              'TASK',
              'INFO'
            );
            this.pendingTasks.splice(i, 1);
          }
        }
      }
    }
  }

  private runDecentralizedCoordination(blockedNodes: Set<string>): void {
    const robotList = Array.from(this.robots.values());

    // Broadcast intents (P2P replication)
    for (const sender of robotList) {
      if (sender.currentPath.length > 0) {
        const intentMsg = sender.generateIntentBroadcast(this.simTimeSec, 50);
        this.metricsCollector.recordP2PMessage(robotList.length - 1);

        for (const peer of robotList) {
          if (peer.id !== sender.id) {
            peer.intentStore.receivePeerIntent(intentMsg);
          }
        }
      }
    }

    // Pairwise conflict check & resolution
    for (let i = 0; i < robotList.length; i++) {
      const robotA = robotList[i]!;
      for (let j = i + 1; j < robotList.length; j++) {
        const robotB = robotList[j]!;

        if (robotA.floorId !== robotB.floorId) continue;
        if (robotA.currentPath.length === 0 || robotB.currentPath.length === 0) continue;

        // Check distance
        const dx = robotA.position[0] - robotB.position[0];
        const dz = robotA.position[2] - robotB.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Near-proximity conflict
        if (dist < 3.5 && robotA.status === 'MOVING' && robotB.status === 'MOVING') {
          this.metricsCollector.recordConflict();

          const conflict: ConflictEvent = {
            id: `conf_${robotA.id}_${robotB.id}_${Math.round(this.simTimeSec)}`,
            robotAId: robotA.id,
            robotBId: robotB.id,
            type: 'INTERSECTION',
            locationNodeId: robotA.currentPath[robotA.currentPathIndex]?.nodeId || 'J-01',
            timestampSec: this.simTimeSec,
            resolved: false,
          };

          const resolved = resolveRightOfWay(
            conflict,
            {
              id: robotA.id,
              taskPriority: robotA.currentTask?.priority || 'NORMAL',
              batteryPercent: robotA.batteryPercent,
              remainingDistanceMeters: robotA.currentPath.length * 4.0,
              timeSpentWaitingSec: robotA.waitTimeSec,
              isLoaded: robotA.currentPayloadKg > 0,
            },
            {
              id: robotB.id,
              taskPriority: robotB.currentTask?.priority || 'NORMAL',
              batteryPercent: robotB.batteryPercent,
              remainingDistanceMeters: robotB.currentPath.length * 4.0,
              timeSpentWaitingSec: robotB.waitTimeSec,
              isLoaded: robotB.currentPayloadKg > 0,
            }
          );

          if (resolved.resolution) {
            const yielding = this.robots.get(resolved.resolution.yieldingRobotId);
            const proceeding = this.robots.get(resolved.resolution.proceedingRobotId);

            if (yielding && proceeding) {
              yielding.status = 'YIELDING';
              this.logEvent(
                `CONFLICT at ${resolved.locationNodeId}: ${proceeding.id} PROCEED, ${yielding.id} YIELD`,
                'CONFLICT',
                'WARNING'
              );
              this.metricsCollector.recordConflictResolved();
            }
          }
        }
      }
    }
  }

  private findNearestNodeId(pos: [number, number, number], floorId: string): string {
    let nearest = 'node_0_0';
    let minDist = Infinity;

    for (const node of Object.values(this.navGraph.nodes)) {
      if (node.floorId === floorId) {
        const dx = node.position[0] - pos[0];
        const dz = node.position[2] - pos[2];
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minDist) {
          minDist = d;
          nearest = node.id;
        }
      }
    }
    return nearest;
  }

  public triggerEmergencyEvent(
    type: any,
    floorId: string,
    blockedNodeIds: string[],
    desc: string
  ): void {
    const { event } = this.emergencyManager.triggerEmergency(
      type,
      floorId,
      blockedNodeIds,
      desc,
      this.simTimeSec
    );
    this.eventLog.unshift(event);
  }

  public logEvent(
    message: string,
    type: 'ROBOT' | 'TASK' | 'RESOURCE' | 'SAFETY' | 'SYSTEM' | 'CONFLICT',
    severity: 'INFO' | 'WARNING' | 'CRITICAL'
  ): void {
    const evt: SimEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      simTimeSec: Math.round(this.simTimeSec),
      type,
      message,
      severity,
    };
    this.eventLog.unshift(evt);
    if (this.eventLog.length > 200) {
      this.eventLog.pop();
    }
  }

  public createFrameSnapshot(): SimulationFrame {
    const chargersList: ChargerSimulationState[] = Array.from(this.chargers.values()).map((c) => ({
      id: c.id,
      floorId: c.floorId,
      queueRobotIds: [],
      chargeRateKw: c.chargeRateKw,
    }));

    return {
      simTimeSec: Math.round(this.simTimeSec),
      mode: this.mode,
      robots: Array.from(this.robots.values()).map((r) => r.getState()),
      elevators: Array.from(this.elevators.values()).map((e) => e.getState()),
      chargers: chargersList,
      events: [...this.eventLog],
      metrics: this.metricsCollector.getSnapshot(),
      blockedNodeIds: Array.from(this.emergencyManager.getActiveBlockedNodes()),
    };
  }
}
