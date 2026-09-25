import { Floor, FloorConnection, WarehouseModel, WarehouseObject, WarehouseRule } from './types.js';

export function addObjectToModel(
  model: WarehouseModel,
  floorId: string,
  object: WarehouseObject
): WarehouseModel {
  return {
    ...model,
    updatedAt: new Date().toISOString(),
    floors: model.floors.map((floor) => {
      if (floor.id !== floorId) return floor;
      return {
        ...floor,
        objects: [...floor.objects.filter((o) => o.id !== object.id), object],
      };
    }),
  };
}

export function removeObjectFromModel(
  model: WarehouseModel,
  objectId: string
): WarehouseModel {
  return {
    ...model,
    updatedAt: new Date().toISOString(),
    floors: model.floors.map((floor) => ({
      ...floor,
      objects: floor.objects.filter((o) => o.id !== objectId),
    })),
  };
}

export function updateObjectInModel(
  model: WarehouseModel,
  objectId: string,
  updates: Partial<WarehouseObject>
): WarehouseModel {
  return {
    ...model,
    updatedAt: new Date().toISOString(),
    floors: model.floors.map((floor) => ({
      ...floor,
      objects: floor.objects.map((obj) => {
        if (obj.id !== objectId) return obj;
        return { ...obj, ...updates } as WarehouseObject;
      }),
    })),
  };
}

export function addFloorToModel(
  model: WarehouseModel,
  floor: Floor
): WarehouseModel {
  return {
    ...model,
    updatedAt: new Date().toISOString(),
    floors: [...model.floors, floor],
  };
}

export function addConnectionToModel(
  model: WarehouseModel,
  connection: FloorConnection
): WarehouseModel {
  return {
    ...model,
    updatedAt: new Date().toISOString(),
    connections: [...model.connections.filter((c) => c.id !== connection.id), connection],
  };
}

export function addRuleToModel(
  model: WarehouseModel,
  rule: WarehouseRule
): WarehouseModel {
  return {
    ...model,
    updatedAt: new Date().toISOString(),
    globalRules: [...model.globalRules.filter((r) => r.id !== rule.id), rule],
  };
}

export function findObjectById(
  model: WarehouseModel,
  objectId: string
): { object: WarehouseObject; floor: Floor } | null {
  for (const floor of model.floors) {
    const object = floor.objects.find((o) => o.id === objectId);
    if (object) return { object, floor };
  }
  return null;
}
