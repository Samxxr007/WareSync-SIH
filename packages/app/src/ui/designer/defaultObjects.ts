/**
 * Default factory generators for warehouse objects placed via Designer Toolbox or Drag-and-Drop
 */
export function buildDefaultObject(
  type: string,
  floorId: string,
  position: [number, number, number] = [-6, 0, 4]
): any {
  const id = `${type.toUpperCase().replace('_', '-')}-${Math.floor(100 + Math.random() * 900)}`;

  if (type === 'rack' || type === 'shelf') {
    const isShelf = type === 'shelf';
    return {
      id,
      name: `${isShelf ? 'Shelf Unit' : 'High-Bay Rack'} ${id}`,
      type: 'rack',
      floorId,
      position,
      rotation: [0, 0, 0],
      dimensions: isShelf ? [3, 2, 1] : [6, 4.5, 1.5],
      bays: isShelf ? 2 : 4,
      levels: isShelf ? 3 : 5,
      accessSide: 'FRONT',
      maxHeightMeters: isShelf ? 2.5 : 5.0,
      pickupCapabilityRequired: isShelf ? 'STANDARD_RETRIEVAL' : 'HIGH_RACK',
      inventory: [
        { sku: 'SKU-A', name: 'Precision Assembly', quantity: 20, weightPerUnitKg: 2, level: 2, bay: 1 },
      ],
    };
  }

  if (type === 'amr') {
    return {
      id,
      name: `AMR Unit ${id}`,
      type: 'amr',
      floorId,
      currentFloorId: floorId,
      position,
      rotation: [0, 0, 0],
      dimensions: [0.8, 0.35, 0.6],
      payloadCapacityKg: 400,
      currentPayloadKg: 0,
      maxSpeedMps: 1.3,
      batteryPercent: 100,
      capabilities: ['STANDARD_RETRIEVAL', 'ELEVATOR_COMPLIANT'],
      maxPickupHeightMeters: 3.5,
      elevatorCompliant: true,
      status: 'IDLE',
    };
  }

  if (type === 'charger') {
    return {
      id,
      name: `22kW Charger ${id}`,
      type: 'charger',
      floorId,
      position,
      rotation: [0, 0, 0],
      dimensions: [1.2, 1.5, 1.2],
      chargeRateKw: 22,
      capacityUnits: 1,
      connectorType: 'FAST_CONTACT',
    };
  }

  if (type === 'obstacle') {
    return {
      id,
      name: `Temporary Obstacle ${id}`,
      type: 'obstacle',
      floorId,
      position,
      rotation: [0, 0, 0],
      dimensions: [2, 1, 2],
      temporary: true,
      blocksNavigation: true,
    };
  }

  if (type === 'dock') {
    return {
      id,
      name: `Loading Dock ${id}`,
      type: 'loading_dock',
      floorId,
      position,
      rotation: [0, 0, 0],
      dimensions: [4, 1.2, 3],
      throughputPerHour: 30,
    };
  }

  if (type === 'station') {
    return {
      id,
      name: `Packing Station ${id}`,
      type: 'packing_station',
      floorId,
      position,
      rotation: [0, 0, 0],
      dimensions: [3, 1, 2],
      throughputPerHour: 45,
    };
  }

  if (type.includes('zone')) {
    return {
      id,
      name: `${type.replace('_', ' ').toUpperCase()} ${id}`,
      type,
      floorId,
      position,
      rotation: [0, 0, 0],
      dimensions: [6, 0.1, 6],
    };
  }

  return {
    id,
    name: `Facility Item ${id}`,
    type,
    floorId,
    position,
    rotation: [0, 0, 0],
    dimensions: [2, 1, 2],
  };
}
