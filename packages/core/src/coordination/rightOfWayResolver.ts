import { ConflictEvent } from './conflictDetector.js';

export interface RobotStateForNegotiation {
  id: string;
  taskPriority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  batteryPercent: number;
  remainingDistanceMeters: number;
  timeSpentWaitingSec: number;
  isLoaded: boolean;
}

export function computePriorityScore(robot: RobotStateForNegotiation): number {
  let score = 50;

  // Task priority factor
  switch (robot.taskPriority) {
    case 'CRITICAL':
      score += 40;
      break;
    case 'HIGH':
      score += 25;
      break;
    case 'NORMAL':
      score += 10;
      break;
    case 'LOW':
      score += 0;
      break;
  }

  // Loaded robot has momentum and priority
  if (robot.isLoaded) {
    score += 15;
  }

  // Critically low battery needs urgent passage to charger
  if (robot.batteryPercent < 20) {
    score += 35;
  }

  // Anti-starvation: time spent waiting increases priority
  score += Math.min(30, robot.timeSpentWaitingSec * 2);

  return score;
}

export function resolveRightOfWay(
  conflict: ConflictEvent,
  robotA: RobotStateForNegotiation,
  robotB: RobotStateForNegotiation
): ConflictEvent {
  const scoreA = computePriorityScore(robotA);
  const scoreB = computePriorityScore(robotB);

  // Tie-breaker: lexicographical ID
  const aWins = scoreA > scoreB || (scoreA === scoreB && robotA.id < robotB.id);

  const proceedingRobotId = aWins ? robotA.id : robotB.id;
  const yieldingRobotId = aWins ? robotB.id : robotA.id;

  return {
    ...conflict,
    resolved: true,
    resolution: {
      proceedingRobotId,
      yieldingRobotId,
      action: conflict.type === 'HEAD_ON' ? 'YIELD_AND_REPLAN' : 'WAIT',
      priorityScoreA: scoreA,
      priorityScoreB: scoreB,
    },
  };
}
