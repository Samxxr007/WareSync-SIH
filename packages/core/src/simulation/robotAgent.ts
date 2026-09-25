import { euclideanDistance, NavigationGraph } from '../compiler/navigationGraph.js';
import { StopAndWaitCoordinator } from '../coordination/baseline/stopAndWait.js';
import { DistributedIntentStore } from '../coordination/distributedIntentStore.js';
import { IntentBroadcastMessage, NodeReservation } from '../coordination/message.js';
import { astar, PathStep } from '../planner/astar.js';
import { planSIPP, SIPPStep } from '../planner/sipp.js';
import { WarehouseTask } from '../planner/taskAllocator.js';
import { AMRStatus, AMRObject, Vec3 } from '../warehouse/types.js';
import { EnergyModel } from './energyModel.js';
import { RobotSimulationState } from './types.js';

export class RobotAgent {
  public readonly id: string;
  public readonly initialSpec: AMRObject;
  public readonly intentStore: DistributedIntentStore;

  public floorId: string;
  public position: Vec3;
  public headingRad = 0;
  public speedMps = 0;
  public maxSpeedMps = 1.2;
  public batteryPercent: number;
  public payloadCapacityKg: number;
  public currentPayloadKg = 0;
  public status: AMRStatus = 'IDLE';

  public currentTask?: WarehouseTask | undefined;
  public taskPhase: 'NAV_TO_PICKUP' | 'PICKING' | 'NAV_TO_DROP' | 'DROPPING' | 'NAV_TO_CHARGE' | 'CHARGING' = 'NAV_TO_PICKUP';

  // Planned trajectory
  public currentPath: Array<{ nodeId: string; position: Vec3; floorId: string }> = [];
  public currentPathIndex = 0;
  public currentTargetPos: Vec3;

  public waitTimeSec = 0;
  public rerouteCount = 0;
  public taskStartTimeSec = 0;
  public lastOccupiedNodeId?: string;

  constructor(spec: AMRObject) {
    this.id = spec.id;
    this.initialSpec = spec;
    this.intentStore = new DistributedIntentStore(spec.id);
    this.floorId = spec.currentFloorId || spec.floorId;
    this.position = [...spec.position];
    this.currentTargetPos = [...spec.position];
    this.batteryPercent = spec.batteryPercent;
    this.payloadCapacityKg = spec.payloadCapacityKg;
    this.maxSpeedMps = spec.maxSpeedMps || 1.2;
  }

  /**
   * Plan navigation to target node
   */
  public planRoute(
    graph: NavigationGraph,
    startNodeId: string,
    goalNodeId: string,
    currentSimTimeSec: number,
    mode: 'BASELINE' | 'PROPOSED',
    blockedNodes: Set<string>
  ): boolean {
    if (mode === 'PROPOSED') {
      const sippPlan = planSIPP(
        graph,
        startNodeId,
        goalNodeId,
        currentSimTimeSec,
        this.intentStore,
        this.id,
        this.maxSpeedMps
      );

      if (sippPlan && sippPlan.steps.length > 0) {
        this.currentPath = sippPlan.steps.map((s) => ({
          nodeId: s.nodeId,
          position: s.position,
          floorId: s.floorId,
        }));
        this.currentPathIndex = 0;
        this.intentStore.setMyPlan(sippPlan.reservations);
        return true;
      }
    }

    // Fallback or Baseline: Standard A*
    const astarPath = astar(graph, startNodeId, goalNodeId, {
      blockedNodeIds: blockedNodes,
    });

    if (astarPath && astarPath.length > 0) {
      this.currentPath = astarPath.map((p) => ({
        nodeId: p.nodeId,
        position: p.position,
        floorId: p.floorId,
      }));
      this.currentPathIndex = 0;
      return true;
    }

    return false;
  }

  /**
   * Update robot physics and state machine for dtSec
   */
  public update(
    dtSec: number,
    currentSimTimeSec: number,
    graph: NavigationGraph,
    mode: 'BASELINE' | 'PROPOSED',
    stopAndWaitCoordinator: StopAndWaitCoordinator,
    blockedNodes: Set<string>,
    onTaskCompleted: (task: WarehouseTask, durationSec: number) => void,
    onLogEvent: (msg: string, type: 'ROBOT' | 'TASK' | 'CONFLICT' | 'SAFETY') => void
  ): void {
    // 1. Energy drain/charge
    if (this.status === 'CHARGING') {
      this.batteryPercent = EnergyModel.calculateCharge(this.batteryPercent, dtSec, 22);
      if (this.batteryPercent >= 95) {
        this.status = 'IDLE';
        onLogEvent(`${this.id} fully charged (${Math.round(this.batteryPercent)}%). Resuming duty.`, 'ROBOT');
      }
      return;
    }

    const isMoving = this.status === 'MOVING';
    this.batteryPercent = EnergyModel.calculateDrain(
      this.batteryPercent,
      dtSec,
      isMoving,
      this.speedMps,
      this.maxSpeedMps,
      this.currentPayloadKg,
      this.payloadCapacityKg
    );

    // Critical battery check
    if (this.batteryPercent < 15 && this.status !== 'FAULT') {
      this.status = 'CHARGING';
      onLogEvent(`${this.id} low battery (${Math.round(this.batteryPercent)}%). Routed to nearest charger.`, 'ROBOT');
    }

    // 2. Dynamic obstacle & blocked aisle detection
    if (this.currentPath.length > 0 && this.currentPathIndex < this.currentPath.length && blockedNodes.size > 0) {
      const upcomingSteps = this.currentPath.slice(this.currentPathIndex);
      const blockedStep = upcomingSteps.find((s) => blockedNodes.has(s.nodeId));
      if (blockedStep) {
        onLogEvent(
          `⚠️ ${this.id} detected obstacle/blocked corridor at ${blockedStep.nodeId}. Re-routing via SIPP...`,
          'CONFLICT'
        );
        this.rerouteCount++;
        const currentStart = this.findNearestNodeId(graph, this.position, this.floorId);
        let goalNode = '';
        if (this.taskPhase === 'NAV_TO_PICKUP' && this.currentTask) {
          goalNode = `pickup_${this.currentTask.pickupRackId}`;
        } else if (this.taskPhase === 'NAV_TO_DROP' && this.currentTask) {
          goalNode = this.resolveDropNodeId(graph, this.currentTask.dropStationId, this.currentTask.dropFloorId);
        } else if (this.currentPath.length > 0) {
          goalNode = this.currentPath[this.currentPath.length - 1]!.nodeId;
        }

        if (goalNode) {
          const replanned = this.planRoute(graph, currentStart, goalNode, currentSimTimeSec, mode, blockedNodes);
          if (replanned) {
            onLogEvent(`✓ ${this.id} successfully replanned detour around blocked aisle. Resuming navigation.`, 'ROBOT');
            return;
          } else {
            onLogEvent(`🛑 ${this.id} goal node ${goalNode} unreachable due to blockage. Suspending task.`, 'TASK');
            this.status = 'WAITING';
            this.speedMps = 0;
            return;
          }
        }
      }
    }

    // 3. Trajectory following
    if (this.currentPath.length > 0 && this.currentPathIndex < this.currentPath.length) {
      const targetWaypoint = this.currentPath[this.currentPathIndex]!;

      // YIELDING: paused by coordination loop — always wait (will be released by runDecentralizedCoordination)
      if (this.status === 'YIELDING') {
        this.speedMps = 0;
        this.waitTimeSec += dtSec;
        return;
      }

      // WAITING in PROPOSED: paused by elevator/obstacle — will be released by engine coordination
      if (this.status === 'WAITING' && mode !== 'BASELINE') {
        this.speedMps = 0;
        this.waitTimeSec += dtSec;
        return;
      }

      // In BASELINE mode: check stop-and-wait lock (retry each tick even if currently WAITING)
      if (mode === 'BASELINE') {
        const canEnter = stopAndWaitCoordinator.tryAcquireNode(
          targetWaypoint.nodeId,
          this.id,
          currentSimTimeSec
        );
        if (!canEnter) {
          this.status = 'WAITING';
          this.speedMps = 0;
          this.waitTimeSec += dtSec;
          return;
        }
      }

      this.status = 'MOVING';
      this.speedMps = this.maxSpeedMps;

      // Kinematics: move towards targetWaypoint.position
      const targetPos = targetWaypoint.position;
      const dx = targetPos[0] - this.position[0];
      const dz = targetPos[2] - this.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.05) {
        this.headingRad = Math.atan2(dx, dz);
        const moveStep = Math.min(dist, this.speedMps * dtSec);
        this.position[0] += (dx / dist) * moveStep;
        this.position[2] += (dz / dist) * moveStep;
        if (targetWaypoint.floorId === this.floorId) {
          this.position[1] = targetPos[1]; // Elevation
        }
      } else {
        // If this waypoint is an elevator transition to a different floor, do NOT advance!
        // The simulation engine elevator orchestrator will advance the robot once the elevator cab reaches destination.
        if (targetWaypoint.nodeId.startsWith('elev_node_') && targetWaypoint.floorId !== this.floorId) {
          this.status = 'WAITING';
          this.speedMps = 0;
          return;
        }

        // Arrived at standard waypoint
        this.position[0] = targetPos[0];
        this.position[2] = targetPos[2];

        if (mode === 'BASELINE') {
          if (this.lastOccupiedNodeId && this.lastOccupiedNodeId !== targetWaypoint.nodeId) {
            stopAndWaitCoordinator.releaseNode(this.lastOccupiedNodeId, this.id);
          }
          this.lastOccupiedNodeId = targetWaypoint.nodeId;
        }

        this.currentPathIndex++;

        // If arrived at end of path
        if (this.currentPathIndex >= this.currentPath.length) {
          this.onPathDestinationReached(
            currentSimTimeSec,
            graph,
            mode,
            blockedNodes,
            onTaskCompleted,
            onLogEvent
          );
        }
      }
    } else {
      if (this.status === 'MOVING') {
        this.status = 'IDLE';
        this.speedMps = 0;
      }
    }
  }

  private findNearestNodeId(graph: NavigationGraph, pos: Vec3, floorId: string): string {
    let nearest = '';
    let minDist = Infinity;
    for (const node of Object.values(graph.nodes)) {
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
    return nearest || Object.keys(graph.nodes)[0] || 'node_0_0';
  }

  private resolveDropNodeId(graph: NavigationGraph, dropStationId?: string, dropFloorId?: string): string {
    if (dropStationId) {
      const candidates = [
        `station_${dropStationId}`,
        `dock_${dropStationId}`,
        dropStationId,
      ];
      for (const c of candidates) {
        if (graph.nodes[c]) return c;
      }
    }
    const targetFloor = dropFloorId || 'floor-1';
    for (const node of Object.values(graph.nodes)) {
      if (node.floorId === targetFloor && (node.type === 'STATION' || node.type === 'DOCK')) {
        return node.id;
      }
    }
    for (const node of Object.values(graph.nodes)) {
      if (node.floorId === targetFloor) return node.id;
    }
    return Object.keys(graph.nodes)[0] || 'node_0_0';
  }

  private onPathDestinationReached(
    currentSimTimeSec: number,
    graph: NavigationGraph,
    mode: 'BASELINE' | 'PROPOSED',
    blockedNodes: Set<string>,
    onTaskCompleted: (task: WarehouseTask, durationSec: number) => void,
    onLogEvent: (msg: string, type: 'ROBOT' | 'TASK' | 'CONFLICT' | 'SAFETY') => void
  ): void {
    this.speedMps = 0;
    this.currentPath = [];
    this.currentPathIndex = 0;

    if (!this.currentTask) {
      this.status = 'IDLE';
      return;
    }

    if (this.taskPhase === 'NAV_TO_PICKUP') {
      this.taskPhase = 'NAV_TO_DROP';
      this.currentPayloadKg = this.currentTask.weightKg;
      onLogEvent(
        `${this.id} picked up SKU ${this.currentTask.sku} (${this.currentTask.quantity} units, ${this.currentPayloadKg}kg). Routing to delivery station.`,
        'TASK'
      );
      const startNode = this.findNearestNodeId(graph, this.position, this.floorId);
      const dropNode = this.resolveDropNodeId(graph, this.currentTask.dropStationId, this.currentTask.dropFloorId);
      const planned = this.planRoute(graph, startNode, dropNode, currentSimTimeSec, mode, blockedNodes);
      if (planned) {
        this.status = 'MOVING';
      } else {
        this.status = 'IDLE';
      }
    } else if (this.taskPhase === 'NAV_TO_DROP') {
      const duration = currentSimTimeSec - this.taskStartTimeSec;
      const completedTask = this.currentTask;
      this.currentPayloadKg = 0;
      this.status = 'IDLE';
      this.currentTask = undefined;
      onTaskCompleted(completedTask, Math.max(1, duration));
      onLogEvent(
        `✓ ${this.id} delivered TASK-${completedTask.id} at ${completedTask.dropStationId || 'Station'} in ${Math.round(duration)}s.`,
        'TASK'
      );
    }
  }

  public generateIntentBroadcast(currentSimTimeSec: number, priorityScore: number): IntentBroadcastMessage {
    const plannedReservations: NodeReservation[] = [];
    let estTime = currentSimTimeSec;

    for (let i = this.currentPathIndex; i < this.currentPath.length; i++) {
      const step = this.currentPath[i]!;
      plannedReservations.push({
        nodeId: step.nodeId,
        interval: {
          startSec: estTime,
          endSec: estTime + 1.5,
        },
        robotId: this.id,
      });
      estTime += 2.0;
    }

    return {
      id: `intent_${this.id}_${Math.round(currentSimTimeSec)}`,
      senderId: this.id,
      type: 'INTENT_BROADCAST',
      timestampSec: currentSimTimeSec,
      plannedNodeReservations: plannedReservations,
      taskId: this.currentTask?.id,
      priorityScore,
    };
  }

  public getState(): RobotSimulationState {
    const nextWaypoint = this.currentPath[this.currentPathIndex];
    return {
      id: this.id,
      floorId: this.floorId,
      position: [...this.position],
      targetPosition: nextWaypoint ? [...nextWaypoint.position] : [...this.position],
      speedMps: this.speedMps,
      headingRad: this.headingRad,
      status: this.status,
      batteryPercent: Math.round(this.batteryPercent),
      currentPayloadKg: this.currentPayloadKg,
      currentTaskId: this.currentTask?.id,
      currentRouteNodeIds: this.currentPath.map((p) => p.nodeId),
      totalWaitTimeSec: parseFloat(this.waitTimeSec.toFixed(1)),
      rerouteCount: this.rerouteCount,
    };
  }
}
