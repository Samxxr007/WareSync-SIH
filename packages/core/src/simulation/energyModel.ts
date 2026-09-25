export class EnergyModel {
  /**
   * Drain battery percent during dtSec
   * Base idle: ~0.005%/s
   * Moving: + (speed / maxSpeed) * 0.03%/s
   * Loaded factor: + (payload / maxPayload) * 0.02%/s
   */
  public static calculateDrain(
    currentBatteryPercent: number,
    dtSec: number,
    isMoving: boolean,
    speedMps: number,
    maxSpeedMps: number,
    payloadKg: number,
    maxPayloadKg: number
  ): number {
    let drainRatePercentPerSec = 0.002; // idle

    if (isMoving) {
      const speedRatio = Math.min(1.0, speedMps / (maxSpeedMps || 1.2));
      const loadRatio = Math.min(1.0, payloadKg / (maxPayloadKg || 500));
      drainRatePercentPerSec += speedRatio * 0.025 + loadRatio * 0.015;
    }

    const drain = drainRatePercentPerSec * dtSec;
    return Math.max(0, currentBatteryPercent - drain);
  }

  /**
   * Charge battery during dtSec at a charger
   * 22 kW charger typically gives ~0.2% battery per second
   */
  public static calculateCharge(
    currentBatteryPercent: number,
    dtSec: number,
    chargeRateKw = 22
  ): number {
    const chargePerSec = (chargeRateKw / 22) * 0.35;
    return Math.min(100, currentBatteryPercent + chargePerSec * dtSec);
  }
}
