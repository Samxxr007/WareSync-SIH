export interface BaselineNodeLock {
  nodeId: string;
  lockedByRobotId: string;
  acquiredAtSec: number;
}

export class StopAndWaitCoordinator {
  private activeLocks: Map<string, BaselineNodeLock> = new Map();

  /**
   * Attempt to lock a node before entering (First-Come First-Served)
   */
  public tryAcquireNode(nodeId: string, robotId: string, currentSimTimeSec: number): boolean {
    const existing = this.activeLocks.get(nodeId);
    if (!existing || existing.lockedByRobotId === robotId) {
      this.activeLocks.set(nodeId, {
        nodeId,
        lockedByRobotId: robotId,
        acquiredAtSec: currentSimTimeSec,
      });
      return true;
    }
    // Blocked: must stop and wait
    return false;
  }

  /**
   * Release node lock after vacating
   */
  public releaseNode(nodeId: string, robotId: string): void {
    const existing = this.activeLocks.get(nodeId);
    if (existing && existing.lockedByRobotId === robotId) {
      this.activeLocks.delete(nodeId);
    }
  }

  public releaseAllForRobot(robotId: string): void {
    for (const [nodeId, lock] of this.activeLocks.entries()) {
      if (lock.lockedByRobotId === robotId) {
        this.activeLocks.delete(nodeId);
      }
    }
  }

  public isNodeLocked(nodeId: string, queryRobotId: string): boolean {
    const lock = this.activeLocks.get(nodeId);
    return !!lock && lock.lockedByRobotId !== queryRobotId;
  }
}
