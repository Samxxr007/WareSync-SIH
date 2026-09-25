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

const STORAGE_KEY = 'waresync_warehouse_model_v1';

function getInitialModel(): WarehouseModel {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
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
      const next = addObjectToModel(state.model, floorId, obj);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
