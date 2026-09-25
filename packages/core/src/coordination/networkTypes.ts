import { MessageType } from './message.js';

export type PeerLinkState = 'CONNECTED' | 'DEGRADED' | 'STALE' | 'DISCONNECTED';

export interface PeerConnectionState {
  localRobotId: string;
  peerRobotId: string;
  state: PeerLinkState;
  latencyMs: number;
  packetLoss: number; // 0.0 to 1.0
  lastSeenSec: number;
  messagesSent: number;
  messagesReceived: number;
}

export interface PeerNetworkMessage {
  id: string;
  timestampSec: number;
  senderId: string;
  receiverId: string; // 'BROADCAST' or specific robot ID
  type: MessageType | 'LOCAL_REPLAN';
  payloadSummary: string;
  sequence: number;
}

export interface LocalDecisionState {
  robotId: string;
  intentStorePeerCount?: number;
  plannerType?: 'SIPP' | 'ASTAR';
  commState?: PeerLinkState;
  status?: string;
  activeGoal?: string;
  currentConflict?: {
    conflictId: string;
    type: string;
    opponentId: string;
    locationNodeId: string;
    expectedTimeSec: number;
  };
  myPriorityScore?: number;
  localPriorityScore?: number;
  peerPriorityScore?: number;
  waitCompensation?: number;
  decision?: 'YIELD' | 'PROCEED' | 'HOLD' | 'NONE';
  action?: 'LOCAL SIPP REPLAN' | 'MAINTAIN TRAJECTORY' | 'YIELD AND WAIT' | 'NONE';
  decisionTimestampSec?: number;
  simTimeSec?: number;
  decisionReason?: string;
  nextPlannedAction?: string;
  evaluatedPeers?: string[];
  explanation?: string;
}

export interface NetworkTelemetry {
  activePeers: number;
  connectedPeers: number;
  degradedPeers: number;
  stalePeers: number;
  avgLatencyMs: number;
  packetLossPercent: number;
  messagesPerSec: number;
  totalP2PMessages: number;
  conflictNegotiations: number;
  yieldRequests: number;
  localReplans: number;
}

export interface NetworkStateSnapshot {
  p2pEnabled: boolean;
  topology: PeerConnectionState[];
  recentMessages: PeerNetworkMessage[];
  localDecisions: Record<string, LocalDecisionState>;
  telemetry: NetworkTelemetry;
}
