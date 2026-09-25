import { Vec3 } from '../warehouse/types.js';

export type MessageType =
  | 'POSITION_BROADCAST'
  | 'INTENT_BROADCAST'
  | 'CONFLICT_NOTIFICATION'
  | 'YIELD_REQUEST'
  | 'YIELD_ACCEPT'
  | 'YIELD_REJECT'
  | 'RESOURCE_REQUEST'
  | 'RESOURCE_GRANT'
  | 'RESOURCE_DENY'
  | 'EMERGENCY_BROADCAST';

export interface TimeInterval {
  startSec: number;
  endSec: number;
}

export interface NodeReservation {
  nodeId: string;
  interval: TimeInterval;
  robotId: string;
}

export interface BaseP2PMessage {
  id: string;
  senderId: string;
  targetId?: string; // undefined = broadcast
  type: MessageType;
  timestampSec: number;
}

export interface PositionBroadcastMessage extends BaseP2PMessage {
  type: 'POSITION_BROADCAST';
  position: Vec3;
  floorId: string;
  speedMps: number;
  headingRad: number;
}

export interface IntentBroadcastMessage extends BaseP2PMessage {
  type: 'INTENT_BROADCAST';
  plannedNodeReservations: NodeReservation[];
  taskId?: string | undefined;
  priorityScore: number;
}

export interface ConflictNotificationMessage extends BaseP2PMessage {
  type: 'CONFLICT_NOTIFICATION';
  targetId: string;
  conflictType: 'HEAD_ON' | 'INTERSECTION' | 'FOLLOW' | 'RESOURCE';
  locationNodeId: string;
  expectedTimeSec: number;
}

export interface YieldRequestMessage extends BaseP2PMessage {
  type: 'YIELD_REQUEST';
  targetId: string;
  locationNodeId: string;
  myPriorityScore: number;
}

export interface YieldResponseMessage extends BaseP2PMessage {
  type: 'YIELD_ACCEPT' | 'YIELD_REJECT';
  targetId: string;
  locationNodeId: string;
}

export interface ResourceRequestMessage extends BaseP2PMessage {
  type: 'RESOURCE_REQUEST';
  resourceId: string;
  requestedInterval: TimeInterval;
  priorityScore: number;
}

export interface EmergencyBroadcastMessage extends BaseP2PMessage {
  type: 'EMERGENCY_BROADCAST';
  emergencyType: string;
  affectedFloorId: string;
  affectedZoneId?: string;
  blockedNodeIds: string[];
}

export type P2PMessage =
  | PositionBroadcastMessage
  | IntentBroadcastMessage
  | ConflictNotificationMessage
  | YieldRequestMessage
  | YieldResponseMessage
  | ResourceRequestMessage
  | EmergencyBroadcastMessage;
