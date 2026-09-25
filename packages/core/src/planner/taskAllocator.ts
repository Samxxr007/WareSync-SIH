import { AMRCapability, AMRObject, Floor } from '../warehouse/types.js';

export interface WarehouseTask {
  id: string;
  sku: string;
  quantity: number;
  pickupRackId: string;
  pickupFloorId: string;
  pickupLevel: number;
  dropStationId: string;
  dropFloorId: string;
  weightKg: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED' | 'FAILED';
  assignedRobotId?: string;
  createdTimeSec: number;
  completedTimeSec?: number;
}

export interface CandidateEvaluation {
  robotId: string;
  eligible: boolean;
  score: number;
  reasons: string[];
}

export interface TaskAssignmentResult {
  taskId: string;
  assignedRobotId?: string;
  evaluations: CandidateEvaluation[];
  requiresHumanAssistance: boolean;
  explanation: string;
}

export function allocateTask(
  task: WarehouseTask,
  availableRobots: AMRObject[],
  floors: Floor[]
): TaskAssignmentResult {
  const evaluations: CandidateEvaluation[] = [];

  for (const robot of availableRobots) {
    const reasons: string[] = [];
    let eligible = true;
    let score = 100;

    // Check 1: Status
    if (robot.status === 'FAULT' || robot.status === 'OFFLINE' || robot.status === 'EMERGENCY_STOP') {
      eligible = false;
      reasons.push(`Robot in non-operational state: ${robot.status}`);
    }

    // Check 2: Battery
    if (robot.batteryPercent < 20) {
      eligible = false;
      reasons.push(`Battery critically low (${robot.batteryPercent}% < 20%)`);
    } else if (robot.batteryPercent < 40) {
      score -= 30;
      reasons.push(`Low battery reserve (${robot.batteryPercent}%)`);
    }

    // Check 3: Payload capacity
    if (task.weightKg > robot.payloadCapacityKg) {
      eligible = false;
      reasons.push(
        `Payload exceeds capacity: requires ${task.weightKg}kg, robot max ${robot.payloadCapacityKg}kg`
      );
    }

    // Check 4: High rack capability
    const isHighRack = task.pickupLevel >= 4;
    if (isHighRack) {
      const hasHighRackCap = robot.capabilities.includes('HIGH_RACK');
      if (!hasHighRackCap) {
        eligible = false;
        reasons.push(`Pickup at Level ${task.pickupLevel} requires HIGH_RACK capability`);
      } else {
        score += 20;
        reasons.push('Qualified: HIGH_RACK certified');
      }
    }

    // Check 5: Multi-floor elevator compliance
    const requiresFloorTransition = task.pickupFloorId !== task.dropFloorId || robot.currentFloorId !== task.pickupFloorId;
    if (requiresFloorTransition && !robot.elevatorCompliant) {
      eligible = false;
      reasons.push('Task requires floor transition but robot is not elevator compliant');
    }

    // Distance/floor penalty
    if (robot.currentFloorId !== task.pickupFloorId) {
      score -= 25;
      reasons.push(`Inter-floor dispatch penalty (currently on ${robot.currentFloorId})`);
    }

    evaluations.push({
      robotId: robot.id,
      eligible,
      score: eligible ? Math.max(0, score) : 0,
      reasons,
    });
  }

  // Find best candidate
  const eligibleCandidates = evaluations
    .filter((e) => e.eligible)
    .sort((a, b) => b.score - a.score);

  if (eligibleCandidates.length > 0) {
    const best = eligibleCandidates[0]!;
    return {
      taskId: task.id,
      assignedRobotId: best.robotId,
      evaluations,
      requiresHumanAssistance: false,
      explanation: `Assigned to ${best.robotId} (Score: ${best.score}): ${best.reasons.join('; ')}`,
    };
  }

  return {
    taskId: task.id,
    evaluations,
    requiresHumanAssistance: true,
    explanation: `No capable AMR available for SKU ${task.sku} (Level ${task.pickupLevel}, ${task.weightKg}kg). Manual assistance or forklift dispatch required.`,
  };
}
