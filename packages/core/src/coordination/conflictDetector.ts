import { SIPPStep } from '../planner/sipp.js';

export type ConflictType = 'HEAD_ON' | 'INTERSECTION' | 'FOLLOW' | 'RESOURCE';

export interface ConflictEvent {
  id: string;
  robotAId: string;
  robotBId: string;
  type: ConflictType;
  locationNodeId: string;
  timestampSec: number;
  resolved: boolean;
  resolution?: {
    proceedingRobotId: string;
    yieldingRobotId: string;
    action: 'WAIT' | 'YIELD_AND_REPLAN' | 'REVERSE';
    priorityScoreA: number;
    priorityScoreB: number;
  };
}

export function detectPairwiseConflict(
  robotAId: string,
  pathA: SIPPStep[],
  robotBId: string,
  pathB: SIPPStep[],
  safetyBufferSec = 1.0
): ConflictEvent | null {
  for (let i = 0; i < pathA.length; i++) {
    const stepA = pathA[i]!;
    for (let j = 0; j < pathB.length; j++) {
      const stepB = pathB[j]!;

      // Case 1: Same node at overlapping time
      if (stepA.nodeId === stepB.nodeId) {
        const timeOverlap =
          Math.max(stepA.arrivalTimeSec, stepB.arrivalTimeSec) <=
          Math.min(stepA.departureTimeSec, stepB.departureTimeSec) + safetyBufferSec;

        if (timeOverlap) {
          // Check if head-on: next node of A is prev node of B or vice versa
          const nextA = pathA[i + 1]?.nodeId;
          const nextB = pathB[j + 1]?.nodeId;
          const isHeadOn = (nextA && nextA === pathB[j - 1]?.nodeId) || (nextB && nextB === pathA[i - 1]?.nodeId);

          return {
            id: `conf_${robotAId}_${robotBId}_${stepA.nodeId}_${Math.round(stepA.arrivalTimeSec)}`,
            robotAId,
            robotBId,
            type: isHeadOn ? 'HEAD_ON' : 'INTERSECTION',
            locationNodeId: stepA.nodeId,
            timestampSec: Math.min(stepA.arrivalTimeSec, stepB.arrivalTimeSec),
            resolved: false,
          };
        }
      }
    }
  }

  return null;
}
