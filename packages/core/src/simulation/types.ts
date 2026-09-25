import { AMRStatus, Vec3 } from '../warehouse/types.js';

export type SimulationMode = 'BASELINE' | 'PROPOSED' | 'SIDE_BY_SIDE';

export interface SimEvent {
  id: string;
  simTimeSec: number;
  type: 'ROBOT' | 'TASK' | 'RESOURCE' | 'SAFETY' | 'SYSTEM' | 'CONFLICT';
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}

export interface RobotSimulationState {
  id: string;
  floorId: string;
  position: Vec3;
  targetPosition: Vec3;
  speedMps: number;
  headingRad: number;
  status: AMRStatus;
  batteryPercent: number;
  currentPayloadKg: number;
  currentTaskId?: string | undefined;
  currentRouteNodeIds: string[];
  totalWaitTimeSec: number;
  rerouteCount: number;
}

export interface ElevatorSimulationState {
  id: string;
  currentFloorId: string;
  currentHeightMeters: number;
  doorState: 'CLOSED' | 'OPENING' | 'OPEN' | 'CLOSING';
  occupantRobotId?: string | undefined;
  queueRobotIds: string[];
  status: 'IDLE' | 'MOVING' | 'MAINTENANCE';
}

export interface ChargerSimulationState {
  id: string;
  floorId: string;
  occupantRobotId?: string | undefined;
  queueRobotIds: string[];
  chargeRateKw: number;
}

export interface SimMetrics {
  simTimeSec: number;
  activeRobots: number;
  completedTasks: number;
  totalTasks: number;
  collisions: number;
  activeConflicts: number;
  deadlocksResolved: number;
  totalWaitTimeSec: number;
  totalReroutes: number;
  avgTaskCompletionTimeSec: number;
  taskThroughputPerMinute: number;
  elevatorUtilizationPercent: number;
  chargerUtilizationPercent: number;
  totalEnergyConsumedKwh: number;
  p2pMessagesExchanged: number;
}

export interface SimulationFrame {
  simTimeSec: number;
  mode: SimulationMode;
  robots: RobotSimulationState[];
  elevators: ElevatorSimulationState[];
  chargers: ChargerSimulationState[];
  events: SimEvent[];
  metrics: SimMetrics;
  blockedNodeIds: string[];
}
