import { create } from 'zustand';

interface SelectionStore {
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
  setHoveredObjectId: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selectedObjectId: null,
  hoveredObjectId: null,
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  setHoveredObjectId: (id) => set({ hoveredObjectId: id }),
}));
