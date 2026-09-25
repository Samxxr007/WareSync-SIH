/**
 * WareSync Core Domain Model - Warehouse Entities
 * Professional Industrial Logistics & Fleet Orchestration Platform
 */

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

export type ObjectType =
  // Structure
  | 'floor'
  | 'wall'
  | 'aisle'
  | 'corridor'
  | 'rack'
  | 'shelf'
  | 'door'
  | 'gate'
  | 'elevator'
  | 'ramp'
  // Logistics
  | 'amr'
  | 'forklift'
  | 'human'
  | 'pickup_station'
  | 'drop_station'
  | 'packing_station'
  | 'loading_dock'
  | 'production_station'
  | 'conveyor'
  | 'staging_area'
  // Resources
  | 'charger'
  | 'elevator_resource'
  | 'charging_bay'
  | 'loading_bay'
  | 'restricted_resource'
  // Environment
  | 'obstacle'
  | 'temporary_blockage'
  | 'hazard_zone'
  | 'fire_zone'
  | 'human_zone'
  | 'restricted_zone'
  | 'emergency_exit';

export type AMRStatus =
  | 'IDLE'
  | 'MOVING'
  | 'WAITING'
  | 'YIELDING'
  | 'REROUTING'
  | 'CHARGING'
  | 'ASSISTANCE_REQUIRED'
  | 'FAULT'
  | 'EMERGENCY_STOP'
  | 'OFFLINE';

export type AMRCapability =
  | 'STANDARD_RETRIEVAL'
  | 'HIGH_RACK'
  | 'EXTENDED_REACH'
  | 'HEAVY_PAYLOAD'
  | 'ELEVATOR_COMPLIANT'
  | 'COLD_STORAGE'
  | 'HAZMAT_CERTIFIED';

export type ZoneType =
  | 'SPEED_LIMIT'
  | 'ONE_WAY'
  | 'RESTRICTED'
  | 'NO_ENTRY'
  | 'EMERGENCY'
  | 'KEEP_CLEAR'
  | 'PRIORITY'
  | 'ELEVATOR_ACCESS'
  | 'CHARGER_ACCESS'
  | 'CORRIDOR_CAPACITY'
  | 'HUMAN_ONLY';

export interface InventoryItem {
  sku: string;
  name: string;
  quantity: number;
  weightPerUnitKg: number;
  level: number; // shelf level 1..N
  bay: number;   // bay index 1..N
  highRackRequired?: boolean;
}

export interface BaseWarehouseObject {
  id: string;
  name: string;
  type: ObjectType;
  floorId: string;
  position: Vec3;
  rotation: Vec3; // Euler [x, y, z] in radians
  dimensions: Vec3; // [width/length, height, depth] in meters
  locked?: boolean;
  visible?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RackObject extends BaseWarehouseObject {
  type: 'rack';
  bays: number;
  levels: number;
  accessSide: 'FRONT' | 'REAR' | 'BOTH';
  maxHeightMeters: number;
  pickupCapabilityRequired: AMRCapability;
  inventory: InventoryItem[];
}

export interface ElevatorObject extends BaseWarehouseObject {
  type: 'elevator';
  connectedFloors: string[]; // floor IDs
  capacityUnits: number; // typically 1 or 2 AMRs
  maxWeightKg: number;
  travelSpeedMps: number;
  doorCycleSeconds: number;
}

export interface ChargerObject extends BaseWarehouseObject {
  type: 'charger';
  chargeRateKw: number;
  capacityUnits: number;
  connectorType: 'STANDARD_INDUCTIVE' | 'FAST_CONTACT';
}

export interface AMRObject extends BaseWarehouseObject {
  type: 'amr';
  payloadCapacityKg: number;
  currentPayloadKg: number;
  maxSpeedMps: number;
  batteryPercent: number;
  capabilities: AMRCapability[];
  maxPickupHeightMeters: number;
  elevatorCompliant: boolean;
  status: AMRStatus;
  currentFloorId: string;
}

export interface StationObject extends BaseWarehouseObject {
  type: 'pickup_station' | 'drop_station' | 'packing_station' | 'loading_dock' | 'production_station' | 'staging_area';
  throughputPerHour: number;
  acceptedSkus?: string[];
}

export interface ZoneObject extends BaseWarehouseObject {
  type: 'hazard_zone' | 'fire_zone' | 'human_zone' | 'restricted_zone';
  zoneType: ZoneType;
  polygonPoints: Vec2[];
  maxAllowedSpeedMps?: number;
  directionAngleRad?: number;
  active: boolean;
}

export interface ObstacleObject extends BaseWarehouseObject {
  type: 'obstacle' | 'temporary_blockage';
  temporary: boolean;
  blocksNavigation: boolean;
}

export interface AisleObject extends BaseWarehouseObject {
  type: 'aisle' | 'corridor';
  direction: 'ONE_WAY_FORWARD' | 'ONE_WAY_BACKWARD' | 'TWO_WAY';
  speedLimitMps: number;
}

export interface WallObject extends BaseWarehouseObject {
  type: 'wall';
}

export interface ConveyorObject extends BaseWarehouseObject {
  type: 'conveyor';
  speedMps: number;
  direction: 'FORWARD' | 'REVERSE';
}

export type WarehouseObject =
  | RackObject
  | ElevatorObject
  | ChargerObject
  | AMRObject
  | StationObject
  | ZoneObject
  | ObstacleObject
  | AisleObject
  | WallObject
  | ConveyorObject
  | BaseWarehouseObject;

export interface Floor {
  id: string;
  name: string;
  levelIndex: number;
  elevationMeters: number;
  dimensions: Vec2; // [width, depth]
  objects: WarehouseObject[];
  gridResolutionMeters: number;
}

export interface FloorConnection {
  id: string;
  name: string;
  type: 'ELEVATOR' | 'RAMP';
  connectedFloors: string[];
  entryNodesByFloor: Record<string, Vec3>;
  exitNodesByFloor: Record<string, Vec3>;
  transitTimeSecondsPerFloor: number;
}

export interface WarehouseModel {
  id: string;
  name: string;
  version: string;
  updatedAt: string;
  floors: Floor[];
  connections: FloorConnection[];
  globalRules: WarehouseRule[];
}

export interface WarehouseRule {
  id: string;
  name: string;
  type: ZoneType;
  targetType: 'GLOBAL' | 'ZONE' | 'CORRIDOR' | 'RESOURCE';
  targetId?: string;
  floorId?: string;
  parameters: Record<string, unknown>;
  active: boolean;
}
