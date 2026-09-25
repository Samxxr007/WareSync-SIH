import { SimMetrics } from './types.js';

export class MetricsCollector {
  private metrics: SimMetrics;
  private taskCompletionDurations: number[] = [];

  constructor() {
    this.metrics = {
      simTimeSec: 0,
      activeRobots: 0,
      completedTasks: 0,
      totalTasks: 0,
      collisions: 0,
      activeConflicts: 0,
      deadlocksResolved: 0,
      totalWaitTimeSec: 0,
      totalReroutes: 0,
      avgTaskCompletionTimeSec: 0,
      taskThroughputPerMinute: 0,
      elevatorUtilizationPercent: 0,
      chargerUtilizationPercent: 0,
      totalEnergyConsumedKwh: 0,
      p2pMessagesExchanged: 0,
    };
  }

  public recordTaskCompletion(durationSec: number): void {
    this.metrics.completedTasks++;
    this.taskCompletionDurations.push(durationSec);

    const sum = this.taskCompletionDurations.reduce((a, b) => a + b, 0);
    this.metrics.avgTaskCompletionTimeSec = Math.round(sum / this.taskCompletionDurations.length);

    if (this.metrics.simTimeSec > 0) {
      this.metrics.taskThroughputPerMinute = parseFloat(
        ((this.metrics.completedTasks / this.metrics.simTimeSec) * 60).toFixed(2)
      );
    }
  }

  public recordCollision(): void {
    this.metrics.collisions++;
  }

  public recordConflict(): void {
    this.metrics.activeConflicts++;
  }

  public recordConflictResolved(): void {
    this.metrics.activeConflicts = Math.max(0, this.metrics.activeConflicts - 1);
  }

  public recordDeadlockResolved(): void {
    this.metrics.deadlocksResolved++;
  }

  public recordWaitTime(dtSec: number): void {
    this.metrics.totalWaitTimeSec = parseFloat((this.metrics.totalWaitTimeSec + dtSec).toFixed(1));
  }

  public recordReroute(): void {
    this.metrics.totalReroutes++;
  }

  public recordP2PMessage(count = 1): void {
    this.metrics.p2pMessagesExchanged += count;
  }

  public recordEnergy(kwh: number): void {
    this.metrics.totalEnergyConsumedKwh = parseFloat(
      (this.metrics.totalEnergyConsumedKwh + kwh).toFixed(3)
    );
  }

  public updateTime(simTimeSec: number, activeRobots: number): void {
    this.metrics.simTimeSec = simTimeSec;
    this.metrics.activeRobots = activeRobots;
  }

  public setResourceUtilization(elevatorPct: number, chargerPct: number): void {
    this.metrics.elevatorUtilizationPercent = elevatorPct;
    this.metrics.chargerUtilizationPercent = chargerPct;
  }

  public getSnapshot(): SimMetrics {
    return { ...this.metrics };
  }
}
