import {
  LocalDecisionState,
  NetworkStateSnapshot,
  NetworkTelemetry,
  PeerConnectionState,
  PeerLinkState,
  PeerNetworkMessage,
} from './networkTypes.js';
import { MessageType } from './message.js';

export class NetworkStateTracker {
  private messageHistory: PeerNetworkMessage[] = [];
  private sequenceCounter = 0;
  private linkOverrides: Map<string, { state: PeerLinkState; latencyMs: number; packetLoss: number }> = new Map();
  private localDecisions: Map<string, LocalDecisionState> = new Map();

  // Metrics counters
  private totalMessages = 0;
  private conflictNegotiations = 0;
  private yieldRequests = 0;
  private localReplans = 0;
  private lastSimTime = 0;
  private messagesThisWindow = 0;
  private currentMsgRate = 0;
  private lastWindowTime = 0;

  constructor() {}

  /**
   * Record a peer-to-peer message into the live stream
   */
  public logMessage(
    senderId: string,
    receiverId: string,
    type: MessageType | 'LOCAL_REPLAN',
    payloadSummary: string,
    simTimeSec: number
  ): void {
    this.sequenceCounter++;
    this.totalMessages++;
    this.messagesThisWindow++;

    if (type === 'CONFLICT_NOTIFICATION') this.conflictNegotiations++;
    if (type === 'YIELD_REQUEST') this.yieldRequests++;
    if (type === 'LOCAL_REPLAN') this.localReplans++;

    const msg: PeerNetworkMessage = {
      id: `p2p_${this.sequenceCounter}_${Math.round(simTimeSec * 1000)}`,
      timestampSec: simTimeSec,
      senderId,
      receiverId,
      type,
      payloadSummary,
      sequence: this.sequenceCounter,
    };

    this.messageHistory.unshift(msg);
    if (this.messageHistory.length > 80) {
      this.messageHistory.pop();
    }
  }

  /**
   * Record or update an AMR's local decision state
   */
  public recordLocalDecision(decision: LocalDecisionState): void {
    this.localDecisions.set(decision.robotId, decision);
  }

  /**
   * Set manual link degradation override for demo purposes
   */
  public setLinkOverride(
    robotA: string,
    robotB: string,
    state: PeerLinkState,
    latencyMs = 15,
    packetLoss = 0.0
  ): void {
    const key1 = `${robotA}_${robotB}`;
    const key2 = `${robotB}_${robotA}`;
    this.linkOverrides.set(key1, { state, latencyMs, packetLoss });
    this.linkOverrides.set(key2, { state, latencyMs, packetLoss });
  }

  /**
   * Restore all link overrides back to healthy CONNECTED
   */
  public restoreAllLinks(): void {
    this.linkOverrides.clear();
  }

  /**
   * Clear the message log buffer
   */
  public clearMessages(): void {
    this.messageHistory = [];
  }

  /**
   * Compute and generate full NetworkStateSnapshot for the frame
   */
  public getSnapshot(
    mode: 'BASELINE' | 'PROPOSED' | 'SIDE_BY_SIDE',
    simTimeSec: number,
    robotIds: string[]
  ): NetworkStateSnapshot {
    // Update message rate window (every 1.0s)
    if (simTimeSec - this.lastWindowTime >= 1.0) {
      this.currentMsgRate = Math.round(this.messagesThisWindow / Math.max(1, simTimeSec - this.lastWindowTime));
      this.messagesThisWindow = 0;
      this.lastWindowTime = simTimeSec;
    }
    this.lastSimTime = simTimeSec;

    const p2pEnabled = mode === 'PROPOSED' || mode === 'SIDE_BY_SIDE';
    const topology: PeerConnectionState[] = [];

    let totalLatency = 0;
    let linkCount = 0;
    let connectedCount = 0;
    let degradedCount = 0;
    let staleCount = 0;

    // Build pairwise topology mesh across AMRs
    for (let i = 0; i < robotIds.length; i++) {
      const idA = robotIds[i]!;
      for (let j = i + 1; j < robotIds.length; j++) {
        const idB = robotIds[j]!;
        const key = `${idA}_${idB}`;
        const override = this.linkOverrides.get(key);

        let state: PeerLinkState = p2pEnabled ? 'CONNECTED' : 'DISCONNECTED';
        let latencyMs = p2pEnabled ? 8 + ((i + j) % 6) : 0;
        let packetLoss = p2pEnabled ? 0.01 : 1.0;

        if (override) {
          state = override.state;
          latencyMs = override.latencyMs;
          packetLoss = override.packetLoss;
        }

        if (state === 'CONNECTED') connectedCount++;
        else if (state === 'DEGRADED') degradedCount++;
        else if (state === 'STALE') staleCount++;

        if (state !== 'DISCONNECTED') {
          totalLatency += latencyMs;
          linkCount++;
        }

        topology.push({
          localRobotId: idA,
          peerRobotId: idB,
          state,
          latencyMs,
          packetLoss,
          lastSeenSec: simTimeSec,
          messagesSent: Math.floor(this.totalMessages / Math.max(1, robotIds.length)),
          messagesReceived: Math.floor(this.totalMessages / Math.max(1, robotIds.length)),
        });
      }
    }

    const telemetry: NetworkTelemetry = {
      activePeers: p2pEnabled ? robotIds.length : 0,
      connectedPeers: connectedCount,
      degradedPeers: degradedCount,
      stalePeers: staleCount,
      avgLatencyMs: linkCount > 0 ? Math.round(totalLatency / linkCount) : 0,
      packetLossPercent: p2pEnabled ? (degradedCount > 0 ? 12.5 : staleCount > 0 ? 45.0 : 1.2) : 100,
      messagesPerSec: p2pEnabled ? this.currentMsgRate : 0,
      totalP2PMessages: p2pEnabled ? this.totalMessages : 0,
      conflictNegotiations: this.conflictNegotiations,
      yieldRequests: this.yieldRequests,
      localReplans: this.localReplans,
    };

    const decisionsObj: Record<string, LocalDecisionState> = {};
    for (const [rId, dec] of this.localDecisions.entries()) {
      decisionsObj[rId] = dec;
    }

    return {
      p2pEnabled,
      topology,
      recentMessages: [...this.messageHistory],
      localDecisions: decisionsObj,
      telemetry,
    };
  }
}
