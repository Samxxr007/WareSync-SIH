export interface WaitForRelation {
  waitingRobotId: string;
  blockedByRobotId: string;
  nodeId: string;
  durationSec: number;
}

export interface DeadlockCycle {
  cycleRobotIds: string[];
  culpritRobotId: string; // lowest priority to be forced into backoff
}

export class DeadlockDetector {
  /**
   * Detect cycles in the wait-for relationships
   */
  public static detectDeadlocks(relations: WaitForRelation[]): DeadlockCycle[] {
    // Build adjacency list: waitingRobot -> [blockedByRobot]
    const adj = new Map<string, string[]>();
    for (const rel of relations) {
      if (!adj.has(rel.waitingRobotId)) {
        adj.set(rel.waitingRobotId, []);
      }
      adj.get(rel.waitingRobotId)!.push(rel.blockedByRobotId);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];
    const deadlocks: DeadlockCycle[] = [];

    function dfs(u: string): void {
      visited.add(u);
      recStack.add(u);
      path.push(u);

      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (!visited.has(v)) {
          dfs(v);
        } else if (recStack.has(v)) {
          // Cycle found!
          const cycleStartIdx = path.indexOf(v);
          if (cycleStartIdx !== -1) {
            const cycle = path.slice(cycleStartIdx);
            deadlocks.push({
              cycleRobotIds: [...cycle],
              culpritRobotId: cycle[cycle.length - 1]!, // designated backoff candidate
            });
          }
        }
      }

      path.pop();
      recStack.delete(u);
    }

    for (const robotId of adj.keys()) {
      if (!visited.has(robotId)) {
        dfs(robotId);
      }
    }

    return deadlocks;
  }
}
