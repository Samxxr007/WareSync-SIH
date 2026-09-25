import { IntentBroadcastMessage, NodeReservation, TimeInterval } from './message.js';

export interface LocalSafeInterval {
  startSec: number;
  endSec: number;
}

/**
 * Distributed Intent Store
 * Each AMR maintains its own instance. It stores its own reservations
 * and integrates broadcasted intents received from neighboring AMRs via P2P.
 */
export class DistributedIntentStore {
  public readonly ownerRobotId: string;
  // Map of nodeId -> Array of reservations from all known robots (including self)
  private reservationsByNode: Map<string, NodeReservation[]> = new Map();
  // Map of robotId -> their latest known intent message
  private peerIntents: Map<string, IntentBroadcastMessage> = new Map();

  constructor(ownerRobotId: string) {
    this.ownerRobotId = ownerRobotId;
  }

  /**
   * Set or update this robot's own planned reservations
   */
  public setMyPlan(reservations: NodeReservation[]): void {
    // Remove old reservations by this robot
    for (const [nodeId, list] of this.reservationsByNode.entries()) {
      const filtered = list.filter((r) => r.robotId !== this.ownerRobotId);
      if (filtered.length > 0) {
        this.reservationsByNode.set(nodeId, filtered);
      } else {
        this.reservationsByNode.delete(nodeId);
      }
    }

    // Insert new reservations
    for (const res of reservations) {
      if (!this.reservationsByNode.has(res.nodeId)) {
        this.reservationsByNode.set(res.nodeId, []);
      }
      this.reservationsByNode.get(res.nodeId)!.push(res);
    }
  }

  /**
   * Receive and integrate an intent broadcast from another AMR
   */
  public receivePeerIntent(msg: IntentBroadcastMessage): void {
    if (msg.senderId === this.ownerRobotId) return;

    this.peerIntents.set(msg.senderId, msg);

    // Clear old reservations for this sender
    for (const [nodeId, list] of this.reservationsByNode.entries()) {
      const filtered = list.filter((r) => r.robotId !== msg.senderId);
      if (filtered.length > 0) {
        this.reservationsByNode.set(nodeId, filtered);
      } else {
        this.reservationsByNode.delete(nodeId);
      }
    }

    // Insert new reservations from the broadcast
    for (const res of msg.plannedNodeReservations) {
      if (!this.reservationsByNode.has(res.nodeId)) {
        this.reservationsByNode.set(res.nodeId, []);
      }
      this.reservationsByNode.get(res.nodeId)!.push(res);
    }
  }

  /**
   * Check if a node is available for a given time window according to local view
   */
  public isNodeFree(nodeId: string, interval: TimeInterval, ignoreRobotId?: string): boolean {
    const list = this.reservationsByNode.get(nodeId);
    if (!list || list.length === 0) return true;

    for (const res of list) {
      if (ignoreRobotId && res.robotId === ignoreRobotId) continue;
      // Overlap condition: not (res.end <= req.start || res.start >= req.end)
      if (!(res.interval.endSec <= interval.startSec || res.interval.startSec >= interval.endSec)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Find safe intervals for SIPP at a given node between minTime and maxTime
   */
  public getSafeIntervals(
    nodeId: string,
    minTime: number,
    maxTime: number,
    ignoreRobotId?: string
  ): LocalSafeInterval[] {
    const list = (this.reservationsByNode.get(nodeId) || [])
      .filter((r) => !ignoreRobotId || r.robotId !== ignoreRobotId)
      .sort((a, b) => a.interval.startSec - b.interval.startSec);

    if (list.length === 0) {
      return [{ startSec: minTime, endSec: maxTime }];
    }

    const safeIntervals: LocalSafeInterval[] = [];
    let currentStart = minTime;

    for (const res of list) {
      if (res.interval.startSec > currentStart) {
        safeIntervals.push({
          startSec: currentStart,
          endSec: Math.min(res.interval.startSec, maxTime),
        });
      }
      currentStart = Math.max(currentStart, res.interval.endSec);
      if (currentStart >= maxTime) break;
    }

    if (currentStart < maxTime) {
      safeIntervals.push({
        startSec: currentStart,
        endSec: maxTime,
      });
    }

    return safeIntervals;
  }

  /**
   * Prune reservations that occurred before current simulated time
   */
  public pruneOldReservations(currentSimTimeSec: number): void {
    for (const [nodeId, list] of this.reservationsByNode.entries()) {
      const active = list.filter((r) => r.interval.endSec > currentSimTimeSec);
      if (active.length > 0) {
        this.reservationsByNode.set(nodeId, active);
      } else {
        this.reservationsByNode.delete(nodeId);
      }
    }
  }

  /**
   * Get all reservations for debugging / inspection
   */
  public getAllReservations(): NodeReservation[] {
    const result: NodeReservation[] = [];
    for (const list of this.reservationsByNode.values()) {
      result.push(...list);
    }
    return result;
  }
}
