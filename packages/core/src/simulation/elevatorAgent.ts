import { ElevatorSimulationState } from './types.js';

export class ElevatorAgent {
  public readonly id: string;
  public readonly connectedFloors: string[];
  public readonly floorElevations: Record<string, number>;
  public readonly travelSpeedMps: number;

  public currentHeightMeters = 0;
  public targetHeightMeters = 0;
  public doorState: 'CLOSED' | 'OPENING' | 'OPEN' | 'CLOSING' = 'CLOSED';
  public doorTimerSec = 0;
  public occupantRobotId?: string | undefined;
  public queueRobotIds: string[] = [];

  constructor(
    id: string,
    connectedFloors: string[],
    floorElevations: Record<string, number>,
    travelSpeedMps = 1.2
  ) {
    this.id = id;
    this.connectedFloors = connectedFloors;
    this.floorElevations = floorElevations;
    this.travelSpeedMps = travelSpeedMps;

    const initialFloor = connectedFloors[0] ?? 'floor-1';
    this.currentHeightMeters = floorElevations[initialFloor] ?? 0;
    this.targetHeightMeters = this.currentHeightMeters;
  }

  public requestElevator(robotId: string, targetFloorId: string): void {
    if (!this.queueRobotIds.includes(robotId) && this.occupantRobotId !== robotId) {
      this.queueRobotIds.push(robotId);
    }
    // If elevator has no occupant, dispatch it towards the calling floor
    if (!this.occupantRobotId) {
      this.targetHeightMeters = this.floorElevations[targetFloorId] ?? this.currentHeightMeters;
    }
  }

  public boardRobot(robotId: string, destinationFloorId: string): boolean {
    if (!this.occupantRobotId) {
      this.occupantRobotId = robotId;
      this.queueRobotIds = this.queueRobotIds.filter((id) => id !== robotId);
      this.targetHeightMeters = this.floorElevations[destinationFloorId] ?? this.currentHeightMeters;
      this.doorState = 'CLOSED';
      return true;
    }
    return false;
  }

  public exitRobot(robotId: string): void {
    if (this.occupantRobotId === robotId) {
      this.occupantRobotId = undefined;
      this.doorState = 'OPEN';
    }
  }

  public update(dtSec: number): void {
    // Movement logic
    const diff = this.targetHeightMeters - this.currentHeightMeters;
    if (Math.abs(diff) > 0.05) {
      const step = Math.sign(diff) * Math.min(Math.abs(diff), this.travelSpeedMps * dtSec);
      this.currentHeightMeters += step;
      this.doorState = 'CLOSED';
    } else {
      this.currentHeightMeters = this.targetHeightMeters;
      this.doorState = 'OPEN';
    }
  }

  public getState(): ElevatorSimulationState {
    // Determine closest floor
    let closestFloor = this.connectedFloors[0] ?? 'floor-1';
    let minDiff = Infinity;
    for (const fId of this.connectedFloors) {
      const elev = this.floorElevations[fId] ?? 0;
      const d = Math.abs(elev - this.currentHeightMeters);
      if (d < minDiff) {
        minDiff = d;
        closestFloor = fId;
      }
    }

    const isMoving = Math.abs(this.targetHeightMeters - this.currentHeightMeters) > 0.05;

    return {
      id: this.id,
      currentFloorId: closestFloor,
      currentHeightMeters: this.currentHeightMeters,
      doorState: this.doorState,
      occupantRobotId: this.occupantRobotId,
      queueRobotIds: [...this.queueRobotIds],
      status: isMoving ? 'MOVING' : 'IDLE',
    };
  }
}
