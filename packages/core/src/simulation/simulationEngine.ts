import { NavigationGraph } from '../compiler/navigationGraph.js';
import { StopAndWaitCoordinator } from '../coordination/baseline/stopAndWait.js';
import { ConflictEvent, detectPairwiseConflict } from '../coordination/conflictDetector.js';
import { DeadlockDetector, WaitForRelation } from '../coordination/deadlockDetector.js';
import { NetworkStateTracker, PeerLinkState } from '../coordination/index.js';
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
  private taskSeqCounter = 0;

  private stopAndWaitCoordinator = new StopAndWaitCoordinator();
  private emergencyManager = new EmergencyManager();
  private metricsCollector = new MetricsCollector();
  private networkTracker = new NetworkStateTracker();
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
              this.networkTracker.logMessage(
                robot.id,
                'BROADCAST',
                'LOCAL_REPLAN',
                `Dynamically rerouted around ${obj.type} via local SIPP reservation tables`,
                this.simTimeSec
              );
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

    // 2. Elevator orchestration — runs BEFORE coordination so the top-candidate's
    //    MOVING status is set before the safety bumper logic runs.
    this.runElevatorOrchestration(dt, blockedNodes);

    // 3. Multi-robot coordination (P2P in Proposed mode)
    // SIDE_BY_SIDE also uses PROPOSED coordination for its engine instance
    if (this.mode === 'PROPOSED' || this.mode === 'SIDE_BY_SIDE') {
      this.runDecentralizedCoordination(blockedNodes);
    }

    // 4. Update Robots
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


    // 5. Update Metrics
    const activeRobotsCount = Array.from(this.robots.values()).filter(
      (r) => r.status === 'MOVING' || r.status === 'WAITING' || r.status === 'YIELDING'
    ).length;
    this.metricsCollector.updateTime(Math.round(this.simTimeSec), activeRobotsCount);

    return this.createFrameSnapshot();
  }

  private runElevatorOrchestration(dt: number, _blockedNodes: Set<string>): void {
    const landingX = 0;
    const landingZ = 2.5; // Landing threshold directly in front of elevator door
    const cabX = 0;
    const cabZ = 0;

    for (const elev of this.elevators.values()) {
      const isCabInTransit = Math.abs(elev.currentHeightMeters - elev.targetHeightMeters) > 0.08;

      // A. Lock occupant inside cab; disembark when arrived
      if (elev.occupantRobotId) {
        const occupant = this.robots.get(elev.occupantRobotId);
        if (occupant) {
          occupant.position[0] = cabX;
          occupant.position[2] = cabZ;
          occupant.position[1] = elev.currentHeightMeters;
          occupant.speedMps = 0;
          occupant.status = 'WAITING';

          if (!isCabInTransit) {
            let destFloorId = occupant.floorId;
            for (const [fId, elevM] of Object.entries(elev.floorElevations)) {
              if (Math.abs(elevM - elev.targetHeightMeters) <= 0.08) {
                destFloorId = fId;
                break;
              }
            }
            occupant.floorId = destFloorId;
            occupant.position[0] = landingX;
            occupant.position[1] = elev.targetHeightMeters;
            occupant.position[2] = landingZ;
            occupant.currentPathIndex++;
            elev.exitRobot(occupant.id);
            occupant.status = 'MOVING';
            this.logEvent(`Elevator ${elev.id} delivered ${occupant.id} to ${destFloorId}.`, 'ROBOT', 'INFO');
          }
        }
      }

      // B. Build sorted queue of robots whose route uses this elevator across floors
      const waitingList: { robot: RobotAgent; targetFloorId: string; dist: number }[] = [];
      for (const robot of this.robots.values()) {
        if (robot.id === elev.occupantRobotId) continue;
        if (robot.currentPath.length > 0 && robot.currentPathIndex < robot.currentPath.length) {
          const remaining = robot.currentPath.slice(robot.currentPathIndex);
          const elevStep = remaining.find(
            (wp) => wp.nodeId.startsWith(`elev_node_${elev.id}`) && wp.floorId !== robot.floorId
          );
          if (elevStep) {
            const dist = Math.hypot(robot.position[0] - landingX, robot.position[2] - landingZ);
            waitingList.push({ robot, targetFloorId: elevStep.floorId, dist });
          }
        }
      }

      const prioWeights = { CRITICAL: 3, HIGH: 2, NORMAL: 1, LOW: 0 };
      waitingList.sort((a, b) => {
        const wA = prioWeights[a.robot.currentTask?.priority || 'NORMAL'] || 1;
        const wB = prioWeights[b.robot.currentTask?.priority || 'NORMAL'] || 1;
        return wA !== wB ? wB - wA : a.dist - b.dist;
      });

      elev.queueRobotIds = waitingList.map((w) => w.robot.id);
      // C. Boarding & Dispatch logic (when cab is unoccupied and stopped at a floor)
      if (!elev.occupantRobotId && !isCabInTransit) {
        // Determine current floor of the cab
        let currentCabFloorId = 'floor-1';
        for (const [fId, elevM] of Object.entries(elev.floorElevations)) {
          if (Math.abs(elevM - elev.currentHeightMeters) <= 0.08) {
            currentCabFloorId = fId;
            break;
          }
        }

        // 1. First priority: board any robot waiting at the landing of the CURRENT cab floor
        const currentFloorWaiters = waitingList.filter((w) => w.robot.floorId === currentCabFloorId);
        const readyToBoard = currentFloorWaiters.find((w) => w.dist <= 2.2);

        if (readyToBoard) {
          const boarded = elev.boardRobot(readyToBoard.robot.id, readyToBoard.targetFloorId);
          if (boarded) {
            readyToBoard.robot.position[0] = cabX;
            readyToBoard.robot.position[2] = cabZ;
            readyToBoard.robot.position[1] = elev.currentHeightMeters;
            readyToBoard.robot.speedMps = 0;
            readyToBoard.robot.status = 'WAITING';
            this.logEvent(
              `${readyToBoard.robot.id} boarded elevator ${elev.id} on ${currentCabFloorId} → heading to ${readyToBoard.targetFloorId}`,
              'ROBOT',
              'INFO'
            );
          }
        } else if (currentFloorWaiters.length === 0 && waitingList.length > 0) {
          // 2. Only dispatch cab to another floor if NO robots on the current floor need the elevator
          const topWaiter = waitingList[0]!;
          if (topWaiter.robot.floorId !== currentCabFloorId) {
            elev.requestElevator(topWaiter.robot.id, topWaiter.robot.floorId);
            this.logEvent(
              `Elevator ${elev.id} dispatched from ${currentCabFloorId} to ${topWaiter.robot.floorId} for ${topWaiter.robot.id}`,
              'ROBOT',
              'INFO'
            );
          }
        }
      }

      elev.update(dt);
    }
  }

  private dispatchPendingTasks(blockedNodes: Set<string>): void {
    // Top up pending queue deterministically to ensure both BASELINE and PROPOSED get identical task streams
    if (this.pendingTasks.length < 4) {
      const REPLENISH_SPECS = [
        { rack: 'R01', floor: 'floor-1', station: 'DOCK-01', sku: 'SKU-A', qty: 15, level: 1, prio: 'NORMAL' as const },
        { rack: 'R02', floor: 'floor-1', station: 'PACK-01', sku: 'SKU-C', qty: 12, level: 2, prio: 'HIGH' as const },
        { rack: 'R12', floor: 'floor-2', station: 'DOCK-02', sku: 'SKU-B', qty: 20, level: 2, prio: 'NORMAL' as const },
        { rack: 'R03_F1', floor: 'floor-1', station: 'PACK-02', sku: 'SKU-A', qty: 10, level: 1, prio: 'CRITICAL' as const },
        { rack: 'R14', floor: 'floor-2', station: 'PACK-01', sku: 'SKU-C', qty: 14, level: 3, prio: 'NORMAL' as const },
        { rack: 'R04_F1', floor: 'floor-1', station: 'DOCK-01', sku: 'SKU-B', qty: 16, level: 2, prio: 'HIGH' as const },
        { rack: 'R17', floor: 'floor-2', station: 'DOCK-02', sku: 'SKU-A', qty: 18, level: 1, prio: 'NORMAL' as const },
        { rack: 'R03', floor: 'floor-3', station: 'PACK-02', sku: 'SKU-C', qty: 8, level: 2, prio: 'HIGH' as const },
      ];
      const needed = 8 - this.pendingTasks.length;
      for (let i = 0; i < needed; i++) {
        const spec = REPLENISH_SPECS[this.taskSeqCounter % REPLENISH_SPECS.length]!;
        this.taskSeqCounter++;
        this.pendingTasks.push({
          id: `T${2000 + this.taskSeqCounter}`,
          sku: spec.sku,
          quantity: spec.qty,
          pickupRackId: spec.rack,
          pickupFloorId: spec.floor,
          pickupLevel: spec.level,
          dropStationId: spec.station,
          dropFloorId: 'floor-1',
          weightKg: spec.qty * 2.5,
          priority: spec.prio,
          status: 'PENDING' as const,
          createdTimeSec: this.simTimeSec,
        });
      }
    }

    const idleRobots = Array.from(this.robots.values())
      .filter((r) => r.status === 'IDLE' && !r.currentTask)
      .map((r) => ({
        ...r.initialSpec,
        currentFloorId: r.floorId,
        position: [...r.position] as [number, number, number],
        batteryPercent: r.batteryPercent,
      }));

    if (idleRobots.length === 0) return;
    const activeMode: 'BASELINE' | 'PROPOSED' = this.mode === 'SIDE_BY_SIDE' ? 'PROPOSED' : this.mode;

    // FIFO assignment from front of queue
    for (let i = 0; i < this.pendingTasks.length; i++) {
      if (idleRobots.length === 0) break;
      const task = this.pendingTasks[i]!;
      const allocation = allocateTask(task, idleRobots, this.warehouseModel.floors);

      if (allocation.assignedRobotId) {
        const robot = this.robots.get(allocation.assignedRobotId);
        if (robot) {
          robot.currentTask = task;
          robot.taskPhase = 'NAV_TO_PICKUP';
          robot.taskStartTimeSec = this.simTimeSec;

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
            i--; // Adjust index after splice

            const idleIdx = idleRobots.findIndex((r) => r.id === robot.id);
            if (idleIdx !== -1) {
              idleRobots.splice(idleIdx, 1);
            }
          } else {
            // Revert assignment if route planning failed
            robot.currentTask = undefined;
            robot.taskPhase = 'NAV_TO_PICKUP';
          }
        }
      }
    }
  }

  private runDecentralizedCoordination(blockedNodes: Set<string>): void {
    const robotList = Array.from(this.robots.values());

    // Build set of robots legitimately held in an elevator queue
    const elevatorQueuedIds = new Set<string>();
    for (const elev of this.elevators.values()) {
      if (elev.occupantRobotId) elevatorQueuedIds.add(elev.occupantRobotId);
      for (const qId of elev.queueRobotIds) elevatorQueuedIds.add(qId);
    }

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

    // Periodic intent broadcast into inspector log (every ~1.0 sim-second)
    const prevSec = Math.floor(this.simTimeSec - 0.2);
    const currSec = Math.floor(this.simTimeSec);
    if (currSec !== prevSec) {
      const activeRobots = robotList.filter((r) => r.status === 'MOVING');
      for (const r of activeRobots.slice(0, 2)) {
        const nextWp = r.currentPath[r.currentPathIndex];
        this.networkTracker.logMessage(
          r.id,
          'ALL',
          'INTENT_BROADCAST',
          `Target: ${nextWp?.nodeId || 'waypoint'} | ${r.currentPath.length - r.currentPathIndex} intervals | load: ${r.currentPayloadKg > 0 ? 'Loaded' : 'Empty'}`,
          this.simTimeSec
        );
      }
    }

    // Pairwise conflict check & resolution
    for (let i = 0; i < robotList.length; i++) {
      const robotA = robotList[i]!;
      for (let j = i + 1; j < robotList.length; j++) {
        const robotB = robotList[j]!;

        if (robotA.floorId !== robotB.floorId) continue;
        if (robotA.currentPath.length === 0 || robotB.currentPath.length === 0) continue;


        const dx = robotA.position[0] - robotB.position[0];
        const dz = robotA.position[2] - robotB.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        // --- Virtual Safety Bumper ---
        // CRITICAL: Only fire when ONE side is already stopped. Never set BOTH sides to YIELDING.
        if (dist < 2.0) {
          const aIsStopped = robotA.status === 'WAITING' || robotA.status === 'YIELDING';
          const bIsStopped = robotB.status === 'WAITING' || robotB.status === 'YIELDING';

          if (aIsStopped && robotB.status === 'MOVING') {
            robotB.status = 'YIELDING';
            robotB.speedMps = 0;
            this.networkTracker.logMessage(
              robotB.id,
              robotA.id,
              'YIELD_REQUEST',
              `Safety bumper distance alert (<2.0m). Holding position behind ${robotA.id}.`,
              this.simTimeSec
            );
            continue;
          } else if (bIsStopped && robotA.status === 'MOVING') {
            robotA.status = 'YIELDING';
            robotA.speedMps = 0;
            this.networkTracker.logMessage(
              robotA.id,
              robotB.id,
              'YIELD_REQUEST',
              `Safety bumper distance alert (<2.0m). Holding position behind ${robotB.id}.`,
              this.simTimeSec
            );
            continue;
          }
        }

        // --- Moving-vs-Moving conflict: right-of-way resolution ---
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

          this.networkTracker.logMessage(
            robotA.id,
            robotB.id,
            'CONFLICT_NOTIFICATION',
            `Pairwise spatial proximity conflict at ${conflict.locationNodeId} (dist: ${dist.toFixed(2)}m)`,
            this.simTimeSec
          );

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
              const scoreA = resolved.resolution?.priorityScoreA ?? 50;
              const scoreB = resolved.resolution?.priorityScoreB ?? 50;
              const higherScore = Math.max(scoreA, scoreB);
              const lowerScore = Math.min(scoreA, scoreB);

              this.networkTracker.logMessage(
                proceeding.id,
                yielding.id,
                'YIELD_REQUEST',
                `Priority score ${higherScore.toFixed(0)} > ${lowerScore.toFixed(0)}. Requesting AMR yield right-of-way.`,
                this.simTimeSec
              );

              this.networkTracker.logMessage(
                yielding.id,
                proceeding.id,
                'YIELD_ACCEPT',
                `Yield accepted by ${yielding.id}. Pausing at node ${conflict.locationNodeId}.`,
                this.simTimeSec
              );

              this.networkTracker.recordLocalDecision({
                robotId: proceeding.id,
                simTimeSec: this.simTimeSec,
                activeGoal: proceeding.currentTask ? `Rack ${proceeding.currentTask.pickupRackId}` : 'Target',
                status: 'PROCEEDING',
                evaluatedPeers: [yielding.id],
                localPriorityScore: higherScore,
                peerPriorityScore: lowerScore,
                decisionReason: `Local priority (${higherScore.toFixed(0)}) exceeds peer (${lowerScore.toFixed(0)}). Task: ${proceeding.currentTask?.priority || 'NORMAL'}.`,
                nextPlannedAction: `Maintain speed 1.5 m/s through intersection ${conflict.locationNodeId}`,
              });

              this.networkTracker.recordLocalDecision({
                robotId: yielding.id,
                simTimeSec: this.simTimeSec,
                activeGoal: yielding.currentTask ? `Rack ${yielding.currentTask.pickupRackId}` : 'Target',
                status: 'YIELDING',
                evaluatedPeers: [proceeding.id],
                localPriorityScore: lowerScore,
                peerPriorityScore: higherScore,
                decisionReason: `Peer priority (${higherScore.toFixed(0)}) exceeds local (${lowerScore.toFixed(0)}). Yielding right-of-way.`,
                nextPlannedAction: `Wait until peer clears conflict radius (<2.0m), then resume SIPP path`,
              });
            }
          }
        }
      }
    }

    // --- Release loop ---
    for (const robot of robotList) {
      if (robot.status === 'YIELDING') {
        // Use same 2.0m radius as the bumper so there's no threshold mismatch
        const nearObstacle = robotList.some(
          (other) =>
            other.id !== robot.id &&
            other.floorId === robot.floorId &&
            (other.status === 'WAITING' || other.status === 'YIELDING') &&
            Math.hypot(robot.position[0] - other.position[0], robot.position[2] - other.position[2]) < 2.0
        );
        if (!nearObstacle) {
          robot.status = 'MOVING';
          this.logEvent(`${robot.id} conflict cleared. Resuming trajectory.`, 'ROBOT', 'INFO');
          this.networkTracker.logMessage(
            robot.id,
            'ALL',
            'LOCAL_REPLAN',
            `Corridor clearance confirmed. Resuming trajectory via local SIPP.`,
            this.simTimeSec
          );
          this.networkTracker.recordLocalDecision({
            robotId: robot.id,
            simTimeSec: this.simTimeSec,
            activeGoal: robot.currentTask ? `Rack ${robot.currentTask.pickupRackId}` : 'Target',
            status: 'PROCEEDING',
            evaluatedPeers: [],
            localPriorityScore: 50,
            peerPriorityScore: 0,
            decisionReason: 'Conflict zone cleared. No peer obstructions in safe interval window.',
            nextPlannedAction: 'Accelerating to cruising speed 1.5 m/s',
          });
        }
        // Deadlock watchdog: YIELDING robot stuck for >8s → force-resume
        if (robot.waitTimeSec > 8) {
          robot.waitTimeSec = 0;
          robot.status = 'MOVING';
          this.logEvent(`${robot.id} deadlock watchdog fired — force-resuming after >8s yield.`, 'ROBOT', 'INFO');
        }
      } else if (robot.status === 'WAITING' && robot.currentTask) {
        // Only hold WAITING if robot is physically at the elevator transition waiting to board
        const atElevatorDoor =
          robot.currentPath[robot.currentPathIndex]?.nodeId.startsWith('elev_node_') &&
          robot.currentPath[robot.currentPathIndex]?.floorId !== robot.floorId;

        if (!atElevatorDoor) {
          const pathBlocked = robot.currentPath
            .slice(robot.currentPathIndex)
            .some((wp) => blockedNodes.has(wp.nodeId));
          if (!pathBlocked) {
            robot.status = 'MOVING';
            this.logEvent(`${robot.id} WAITING released. Resuming trajectory.`, 'ROBOT', 'INFO');
          }
        }
        // Elevator watchdog: robot stuck in queue >20s → replan and force-move
        if (robot.waitTimeSec > 20 && elevatorQueuedIds.has(robot.id)) {
          const startNode = this.findNearestNodeId(robot.position, robot.floorId);
          let goalNode = '';
          if (robot.taskPhase === 'NAV_TO_PICKUP' && robot.currentTask) {
            goalNode = `pickup_${robot.currentTask.pickupRackId}`;
          } else if (robot.taskPhase === 'NAV_TO_DROP' && robot.currentTask) {
            goalNode = `station_${robot.currentTask.dropStationId}`;
          }
          if (goalNode) {
            const activeMode: 'BASELINE' | 'PROPOSED' = this.mode === 'SIDE_BY_SIDE' ? 'PROPOSED' : this.mode;
            robot.planRoute(this.navGraph, startNode, goalNode, this.simTimeSec, activeMode, blockedNodes);
            robot.waitTimeSec = 0;
            robot.status = 'MOVING';
            this.logEvent(`${robot.id} elevator watchdog: replanned + force-resumed after 20s stall.`, 'ROBOT', 'INFO');
            this.networkTracker.logMessage(
              robot.id,
              'ALL',
              'LOCAL_REPLAN',
              `Elevator stall watchdog: re-planned alternative route to ${goalNode}`,
              this.simTimeSec
            );
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

  public triggerIntersectionDemo(): void {
    const r1 = this.robots.get('AMR-01');
    const r2 = this.robots.get('AMR-02');
    if (r1 && r2) {
      r1.floorId = 'floor-1';
      r2.floorId = 'floor-1';
      r1.position = [-8, 0, 0];
      r2.position = [8, 0, 0];
      r1.status = 'MOVING';
      r2.status = 'MOVING';
      r1.speedMps = 1.5;
      r2.speedMps = 1.5;
      const start1 = this.findNearestNodeId([-8, 0, 0], 'floor-1');
      const goal1 = this.findNearestNodeId([8, 0, 0], 'floor-1');
      const start2 = this.findNearestNodeId([8, 0, 0], 'floor-1');
      const goal2 = this.findNearestNodeId([-8, 0, 0], 'floor-1');
      const activeMode: 'BASELINE' | 'PROPOSED' = this.mode === 'SIDE_BY_SIDE' ? 'PROPOSED' : this.mode;
      r1.planRoute(this.navGraph, start1, goal1, this.simTimeSec, activeMode, new Set());
      r2.planRoute(this.navGraph, start2, goal2, this.simTimeSec, activeMode, new Set());
      this.logEvent('DEMO: Triggered intersection convergence between AMR-01 and AMR-02.', 'CONFLICT', 'WARNING');
      this.networkTracker.logMessage(r1.id, r2.id, 'INTENT_BROADCAST', `En route to ${goal1} via intersection node`, this.simTimeSec);
      this.networkTracker.logMessage(r2.id, r1.id, 'INTENT_BROADCAST', `En route to ${goal2} via intersection node`, this.simTimeSec);
    }
  }

  public setPeerDegradation(
    robotA: string,
    robotB: string,
    state: PeerLinkState,
    latencyMs = 250,
    packetLoss = 0.35
  ): void {
    this.networkTracker.setLinkOverride(robotA, robotB, state, latencyMs, packetLoss);
    this.logEvent(
      `NETWORK: Peer link ${robotA} ↔ ${robotB} set to ${state} (${latencyMs}ms, ${(packetLoss * 100).toFixed(0)}% loss).`,
      'SYSTEM',
      'WARNING'
    );
  }

  public restoreAllLinks(): void {
    this.networkTracker.restoreAllLinks();
    this.logEvent('NETWORK: All peer-to-peer links restored to CONNECTED (healthy).', 'SYSTEM', 'INFO');
  }

  public clearNetworkMessageLog(): void {
    this.networkTracker.clearMessages();
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
      network: this.networkTracker.getSnapshot(
        this.mode,
        this.simTimeSec,
        Array.from(this.robots.keys())
      ),
    };
  }
}
