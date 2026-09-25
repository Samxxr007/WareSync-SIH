import { SimEvent } from './types.js';

export type EmergencyType =
  | 'FIRE'
  | 'HAZARD'
  | 'ELEVATOR_FAILURE'
  | 'CHARGER_FAILURE'
  | 'ROBOT_FAILURE'
  | 'NETWORK_FAILURE'
  | 'HUMAN_INTRUSION'
  | 'BLOCKED_AISLE'
  | 'CRITICAL_BATTERY';

export interface EmergencyScenario {
  id: string;
  type: EmergencyType;
  floorId: string;
  targetObjectId?: string | undefined;
  blockedNodeIds: string[];
  description: string;
  active: boolean;
  startTimeSec: number;
}

export class EmergencyManager {
  private activeScenarios: Map<string, EmergencyScenario> = new Map();

  public triggerEmergency(
    type: EmergencyType,
    floorId: string,
    blockedNodeIds: string[],
    description: string,
    simTimeSec: number,
    targetObjectId?: string
  ): { scenario: EmergencyScenario; event: SimEvent } {
    const id = `emerg_${type}_${Date.now()}`;
    const scenario: EmergencyScenario = {
      id,
      type,
      floorId,
      targetObjectId,
      blockedNodeIds,
      description,
      active: true,
      startTimeSec: simTimeSec,
    };

    this.activeScenarios.set(id, scenario);

    const event: SimEvent = {
      id: `evt_${id}`,
      simTimeSec,
      type: 'SAFETY',
      severity: 'CRITICAL',
      message: `EMERGENCY ALERT [${type}]: ${description} on floor ${floorId}. ${blockedNodeIds.length} node(s) isolated.`,
      metadata: { scenarioId: id, type, floorId, blockedNodeIds },
    };

    return { scenario, event };
  }

  public resolveEmergency(id: string, simTimeSec: number): SimEvent | null {
    const scenario = this.activeScenarios.get(id);
    if (!scenario) return null;

    scenario.active = false;
    this.activeScenarios.delete(id);

    return {
      id: `evt_res_${id}`,
      simTimeSec,
      type: 'SAFETY',
      severity: 'INFO',
      message: `EMERGENCY CLEARED: ${scenario.type} on floor ${scenario.floorId} resolved. Normal operations resuming.`,
    };
  }

  public getActiveBlockedNodes(): Set<string> {
    const blocked = new Set<string>();
    for (const scenario of this.activeScenarios.values()) {
      if (scenario.active) {
        for (const nodeId of scenario.blockedNodeIds) {
          blocked.add(nodeId);
        }
      }
    }
    return blocked;
  }

  public getActiveScenarios(): EmergencyScenario[] {
    return Array.from(this.activeScenarios.values());
  }
}
