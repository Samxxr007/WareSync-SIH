import { create } from 'zustand';
import {
  addObjectToModel,
  addRuleToModel,
  DEMO_WAREHOUSE,
  Floor,
  removeObjectFromModel,
  updateObjectInModel,
  WarehouseModel,
  WarehouseObject,
  WarehouseRule,
} from '@waresync/core';

import { useSimulationStore } from './simulationStore';

interface WarehouseStore {
  model: WarehouseModel;
  activeFloorId: string;
  setActiveFloorId: (floorId: string) => void;
  addObject: (floorId: string, obj: WarehouseObject) => void;
  removeObject: (objectId: string) => void;
  updateObject: (objectId: string, updates: Partial<WarehouseObject>) => void;
  addRule: (rule: WarehouseRule) => void;
  resetToDemo: () => void;
  loadModel: (model: WarehouseModel) => void;
}

const STORAGE_KEY = 'waresync_warehouse_model_v2';

function sanitizeModel(model: WarehouseModel): { model: WarehouseModel; cleaned: boolean } {
  let cleaned = false;
  for (const floor of model.floors) {
    floor.objects = floor.objects.filter((obj) => {
      if (obj.type !== 'elevator') {
        const [x, , z] = obj.position;
        // Elevator shaft is at [0, 0] with width/depth 3m. Remove any stray objects inside elevator shaft
        if (Math.abs(x) < 1.5 && Math.abs(z) < 1.5) {
          console.warn(`[WareSync] Purged stray object ${obj.id} (${obj.type}) from inside elevator shaft.`);
          cleaned = true;
          return false;
        }
      }
      return true;
    });
  }

  // Ensure Floor 1 has at least 6 AMRs from DEMO_WAREHOUSE
  const f1 = model.floors.find((f) => f.id === 'floor-1');
  const demoF1 = DEMO_WAREHOUSE.floors.find((f) => f.id === 'floor-1');
  if (f1 && demoF1) {
    const existingAmrIds = new Set(f1.objects.filter((o) => o.type === 'amr').map((o) => o.id));
    const demoAmrs = demoF1.objects.filter((o) => o.type === 'amr');
    for (const amr of demoAmrs) {
      if (!existingAmrIds.has(amr.id)) {
        f1.objects.push(JSON.parse(JSON.stringify(amr)));
        cleaned = true;
      }
    }
  }

  return { model, cleaned };
}

function getInitialModel(): WarehouseModel {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const { model, cleaned } = sanitizeModel(parsed);
      if (cleaned) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
      }
      return model;
    }
  } catch (e) {
    console.error('Failed to load from storage, using demo model', e);
  }
  return DEMO_WAREHOUSE;
}

export const useWarehouseStore = create<WarehouseStore>((set) => ({
  model: getInitialModel(),
  activeFloorId: 'floor-1',

  setActiveFloorId: (floorId) => set({ activeFloorId: floorId }),

  addObject: (floorId, obj) =>
    set((state) => {
      // Prevent placing objects directly inside the central elevator shaft at [0, 0]
      if (obj.type !== 'elevator') {
        const [x, y, z] = obj.position;
        if (Math.abs(x) < 1.5 && Math.abs(z) < 1.5) {
          obj.position = [-6, y, 4];
        }
      }
      const next = addObjectToModel(state.model, floorId, obj);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}

      // Notify simulation store to dynamically reroute robots around new additions
      try {
        useSimulationStore.getState().addDynamicObstacle(obj);
      } catch (e) {}

      return { model: next };
    }),

  removeObject: (objectId) =>
    set((state) => {
      const next = removeObjectFromModel(state.model, objectId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return { model: next };
    }),

  updateObject: (objectId, updates) =>
    set((state) => {
      const next = updateObjectInModel(state.model, objectId, updates);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return { model: next };
    }),

  addRule: (rule) =>
    set((state) => {
      const next = addRuleToModel(state.model, rule);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return { model: next };
    }),

  resetToDemo: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ model: DEMO_WAREHOUSE, activeFloorId: 'floor-1' });
  },

  loadModel: (model) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
    } catch (e) {}
    set({ model, activeFloorId: model.floors[0]?.id || 'floor-1' });
  },
}));
