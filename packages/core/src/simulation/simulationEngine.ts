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

  public addTask(task: WarehouseTask): void {
    this.pendingTasks.unshift(task); // prioritize operator-dispatched task
    this.logEvent(
      `Operator dispatched TASK-${task.id} (${task.sku} x${task.quantity}, Priority: ${task.priority}) to Rack ${task.pickupRackId}.`,
      'TASK',
      'INFO'
    );
    this.dispatchPendingTasks(this.emergencyManager.getActiveBlockedNodes());
  }

  public addDynamicObstacle(obj: any): void {
    const [ox, , oz] = obj.position;
    const [dx, , dz] = obj.dimensions || [2, 1, 2];
    const halfX = Math.max(dx / 2, 1.2);
    const halfZ = Math.max(dz / 2, 1.2);
    const newlyBlocked: string[] = [];

    // Find all graph nodes covered by the object or adjacent to it
    for (const node of Object.values(this.navGraph.nodes)) {
      if (node.floorId === obj.floorId) {
        if (Math.abs(node.position[0] - ox) <= halfX && Math.abs(node.position[2] - oz) <= halfZ) {
          newlyBlocked.push(node.id);
        }
      }
    }

    if (newlyBlocked.length > 0) {
      this.triggerEmergencyEvent('DYNAMIC_OBSTACLE' as any, obj.floorId, newlyBlocked, `Dynamic ${obj.type} placed at [${ox.toFixed(1)}, ${oz.toFixed(1)}]`);
    } else {
      this.logEvent(`⚠️ Object ${obj.id} (${obj.type}) placed at [${ox.toFixed(1)}, ${oz.toFixed(1)}]. Fleet evaluating clearance.`, 'SAFETY', 'INFO');
    }

    // Immediately trigger rerouting for any robot heading through this area
    const blockedSet = this.emergencyManager.getActiveBlockedNodes();
    for (const robot of this.robots.values()) {
      if (robot.floorId === obj.floorId && robot.currentPath.length > 0) {
        const hitsObstacle = robot.currentPath.some((wp) =>
          Math.hypot(wp.position[0] - ox, wp.position[2] - oz) < Math.max(halfX, halfZ) + 1.2 ||
          blockedSet.has(wp.nodeId)
        );

        if (hitsObstacle) {
          const startNode = this.findNearestNodeId(robot.position, robot.floorId);
          let goalNode = '';
          if (robot.taskPhase === 'NAV_TO_PICKUP' && robot.currentTask) {
            goalNode = `pickup_${robot.currentTask.pickupRackId}`;
          } else if (robot.taskPhase === 'NAV_TO_DROP' && robot.currentTask) {
            goalNode = (robot as any).resolveDropNodeId(this.navGraph, robot.currentTask.dropStationId, robot.currentTask.dropFloorId);
          } else if (robot.currentPath.length > 0) {
            goalNode = robot.currentPath[robot.currentPath.length - 1]!.nodeId;
          }

          if (goalNode) {
            const activeMode: 'BASELINE' | 'PROPOSED' = this.mode === 'SIDE_BY_SIDE' ? 'PROPOSED' : this.mode;
            const replanned = robot.planRoute(this.navGraph, startNode, goalNode, this.simTimeSec, activeMode, blockedSet);
            if (replanned) {
              this.logEvent(`✓ ${robot.id} dynamically recalculated route around newly placed ${obj.type} via SIPP!`, 'ROBOT', 'INFO');
            }
          }
        }
      }
    }
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

    // 4. Elevator orchestration: handle calling, boarding, vertical transit, disembarking, and safe queuing
    for (const elev of this.elevators.values()) {
      const conn = this.warehouseModel.connections.find((c) => c.id === elev.id);
      const elevPos = conn?.entryNodesByFloor['floor-1'] || [0, 0, 0];
      const elevX = elevPos[0];
      const elevZ = elevPos[2];

      const isCabInTransit = Math.abs(elev.currentHeightMeters - elev.targetHeightMeters) > 0.08;

      // A. Active occupant inside elevator
      if (elev.occupantRobotId) {
        const occupant = this.robots.get(elev.occupantRobotId);
        if (occupant) {
          // Lock robot inside the cab
          occupant.position[0] = elevX;
          occupant.position[2] = elevZ;
          occupant.position[1] = elev.currentHeightMeters;
          occupant.speedMps = 0;
          occupant.status = 'MOVING';

          // Check if arrived at target floor
          if (!isCabInTransit) {
            let destFloorId = occupant.floorId;
            for (const [fId, elevM] of Object.entries(elev.floorElevations)) {
              if (Math.abs(elevM - elev.targetHeightMeters) <= 0.08) {
                destFloorId = fId;
                break;
              }
            }

            occupant.floorId = destFloorId;
            occupant.position[1] = elev.targetHeightMeters;
            // Step forward OUT of the elevator shaft to immediately clear the landing
            occupant.position[2] = elevZ + 2.5;
            occupant.currentPathIndex++;
            elev.exitRobot(occupant.id);
            occupant.status = 'MOVING';

            this.logEvent(
              `Elevator ${elev.id} delivered ${occupant.id} to ${destFloorId}. Shaft cleared.`,
              'ROBOT',
              'INFO'
            );
          }
        }
      }

      // B. Manage waiting / approaching robots across all floors
      const waitingList: { robot: RobotAgent; targetFloorId: string; dist: number }[] = [];
      for (const robot of this.robots.values()) {
        if (robot.id === elev.occupantRobotId) continue;
        if (robot.currentPath.length > 0 && robot.currentPathIndex < robot.currentPath.length) {
          const targetWaypoint = robot.currentPath[robot.currentPathIndex];
          if (
            targetWaypoint &&
            targetWaypoint.nodeId.startsWith(`elev_node_${elev.id}`) &&
            targetWaypoint.floorId !== robot.floorId
          ) {
            const dist = Math.hypot(robot.position[0] - elevX, robot.position[2] - elevZ);
            waitingList.push({ robot, targetFloorId: targetWaypoint.floorId, dist });
          }
        }
      }

      // Sort queue: higher mission priority first, then arrival distance
      const prioWeights = { CRITICAL: 3, HIGH: 2, NORMAL: 1 };
      waitingList.sort((a, b) => {
        const wA = prioWeights[a.robot.currentTask?.priority || 'NORMAL'] || 1;
        const wB = prioWeights[b.robot.currentTask?.priority || 'NORMAL'] || 1;
        if (wA !== wB) return wB - wA;
        return a.dist - b.dist;
      });

      elev.queueRobotIds = waitingList.map((w) => w.robot.id);

      const canBoardAny = !elev.occupantRobotId && !isCabInTransit;

      // Group waiting robots by their current floor to arrange clean standoff queues
      const floorsWithWaiters = Array.from(new Set(waitingList.map((w) => w.robot.floorId)));
      for (const fId of floorsWithWaiters) {
        const floorWaiters = waitingList.filter((w) => w.robot.floorId === fId);
        const pickupHeight = elev.floorElevations[fId] ?? 0;
        const cabAtThisFloor = Math.abs(elev.currentHeightMeters - pickupHeight) <= 0.08;

        for (let idx = 0; idx < floorWaiters.length; idx++) {
          const item = floorWaiters[idx]!;
          const isTopCandidate = canBoardAny && idx === 0 && waitingList[0]?.robot.id === item.robot.id;

          if (isTopCandidate) {
            if (cabAtThisFloor) {
              // Cab is here and ready: allow robot to enter cab
              if (item.dist <= 1.0) {
                const boarded = elev.boardRobot(item.robot.id, item.targetFloorId);
                if (boarded) {
                  item.robot.position[0] = elevX;
                  item.robot.position[2] = elevZ;
                  item.robot.position[1] = elev.currentHeightMeters;
                  item.robot.speedMps = 0;
                  this.logEvent(
                    `${item.robot.id} boarded elevator ${elev.id} on ${fId} → heading to ${item.targetFloorId}`,
                    'ROBOT',
                    'INFO'
                  );
                }
              } else {
                // Moving into elevator
                item.robot.status = 'MOVING';
              }
            } else {
              // Top candidate, but elevator is at another floor: summon elevator and hold at standoff
              elev.requestElevator(item.robot.id, fId);
              if (item.dist <= 2.6) {
                item.robot.status = 'WAITING';
                item.robot.speedMps = 0;
                item.robot.position[0] = elevX;
                item.robot.position[2] = elevZ + 2.6;
              }
            }
          } else {
            // Not authorized to enter shaft: must wait at safe standoff queue position
            // Each queued robot holds at 2.6m + (queueIndex * 1.8m)
            const standoffZ = elevZ + (2.6 + idx * 1.8);
            if (item.dist <= (2.6 + idx * 1.8) + 0.5) {
              item.robot.status = 'WAITING';
              item.robot.speedMps = 0;
              item.robot.position[0] = elevX;
              item.robot.position[2] = standoffZ;
            }
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
    // Top up pending queue if running low to ensure all 6 robots remain continuously busy
    if (this.pendingTasks.length < 4) {
      const racks = ['R01', 'R02', 'R03_F1', 'R04_F1', 'R12', 'R14', 'R17', 'R03'];
      const stations = ['PACK-01', 'PACK-02', 'DOCK-01', 'DOCK-02'];
      const pickupFloors: Record<string, string> = {
        R01: 'floor-1',
        R02: 'floor-1',
        R03_F1: 'floor-1',
        R04_F1: 'floor-1',
        R12: 'floor-2',
        R17: 'floor-2',
        R14: 'floor-2',
        R03: 'floor-3',
      };
      const skus = ['SKU-A', 'SKU-B', 'SKU-C'];
      const prios: Array<'NORMAL' | 'HIGH' | 'CRITICAL'> = ['NORMAL', 'HIGH', 'CRITICAL'];
      const needed = 8 - this.pendingTasks.length;
      for (let i = 0; i < needed; i++) {
        const rack = racks[Math.floor(Math.random() * racks.length)]!;
        const station = stations[Math.floor(Math.random() * stations.length)]!;
        this.pendingTasks.push({
          id: `T${Math.floor(2000 + Math.random() * 8000)}`,
          sku: skus[Math.floor(Math.random() * skus.length)]!,
          quantity: 5 + Math.floor(Math.random() * 25),
          pickupRackId: rack,
          pickupFloorId: pickupFloors[rack] || 'floor-1',
          pickupLevel: 1 + Math.floor(Math.random() * 3),
          dropStationId: station,
          dropFloorId: 'floor-1',
          weightKg: 10 + Math.random() * 50,
          priority: prios[Math.floor(Math.random() * prios.length)]!,
          status: 'PENDING' as const,
          createdTimeSec: this.simTimeSec,
        });
      }
    }

    const idleRobots = Array.from(this.robots.values())
      .filter((r) => r.status === 'IDLE' && !r.currentTask)
      .map((r) => r.initialSpec);

    if (idleRobots.length === 0) return;

    const activeMode: 'BASELINE' | 'PROPOSED' = this.mode === 'SIDE_BY_SIDE' ? 'PROPOSED' : this.mode;

    for (let i = this.pendingTasks.length - 1; i >= 0; i--) {
      if (idleRobots.length === 0) break;
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

            // Remove assigned robot from idleRobots pool so subsequent tasks are allocated to other idle AMRs
            const idleIdx = idleRobots.findIndex((r) => r.id === robot.id);
            if (idleIdx !== -1) {
              idleRobots.splice(idleIdx, 1);
            }
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

        // Virtual Safety Bumper (LiDAR ISO 3691-4):
        // If one robot is stopped (WAITING or YIELDING) and another is within 2.2m, the moving robot must yield/stop
        if (dist < 2.2) {
          if (robotA.status === 'MOVING' && (robotB.status === 'WAITING' || robotB.status === 'YIELDING')) {
            robotA.status = 'YIELDING';
            robotA.speedMps = 0;
            continue;
          } else if (robotB.status === 'MOVING' && (robotA.status === 'WAITING' || robotA.status === 'YIELDING')) {
            robotB.status = 'YIELDING';
            robotB.speedMps = 0;
            continue;
          }
        }

        // Near-proximity conflict between two moving AMRs
        if (dist < 3.2 && robotA.status === 'MOVING' && robotB.status === 'MOVING') {
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

    // Release yielding robots once conflict zone is clear
    for (const robot of robotList) {
      if (robot.status === 'YIELDING') {
        const stillInConflict = robotList.some(
          (other) =>
            other.id !== robot.id &&
            other.floorId === robot.floorId &&
            Math.hypot(robot.position[0] - other.position[0], robot.position[2] - other.position[2]) < 2.5
        );
        if (!stillInConflict) {
          robot.status = 'MOVING';
          this.logEvent(`${robot.id} conflict cleared. Resuming trajectory.`, 'ROBOT', 'INFO');
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
