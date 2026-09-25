import { create } from 'zustand';
import { AppMode } from '../design-system/components/ModeTab';

export interface DragItem {
  type: string;
  label: string;
}

interface UIStore {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  activeNav: string;
  setActiveNav: (nav: string) => void;
  isolatedFloorId: string | null;
  setIsolatedFloorId: (floorId: string | null) => void;
  ghostInactiveFloors: boolean;
  setGhostInactiveFloors: (ghost: boolean) => void;
  consoleExpanded: boolean;
  setConsoleExpanded: (expanded: boolean) => void;
  selectedEventFilter: string;
  setSelectedEventFilter: (filter: string) => void;
  sideBySideMode: boolean;
  setSideBySideMode: (enabled: boolean) => void;

  /** Floor visibility map: floorId → visible */
  visibleFloors: Set<string>;
  toggleFloorVisibility: (floorId: string) => void;
  setAllFloorsVisible: (floorIds: string[]) => void;

  /** Drag-and-drop state for toolbox items */
  dragItem: DragItem | null;
  dragPosition: { x: number; y: number } | null;
  setDragItem: (item: DragItem | null) => void;
  setDragPosition: (pos: { x: number; y: number } | null) => void;

  /** Boot/Preloader state */
  isBooting: boolean;
  setIsBooting: (isBooting: boolean) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  mode: 'SIMULATE',
  setMode: (mode) => set({ mode }),
  activeNav: 'Designer',
  setActiveNav: (activeNav) => set({ activeNav }),
  isolatedFloorId: null,
  setIsolatedFloorId: (isolatedFloorId) => set({ isolatedFloorId }),
  ghostInactiveFloors: true,
  setGhostInactiveFloors: (ghostInactiveFloors) => set({ ghostInactiveFloors }),
  consoleExpanded: true,
  setConsoleExpanded: (consoleExpanded) => set({ consoleExpanded }),
  selectedEventFilter: 'ALL',
  setSelectedEventFilter: (selectedEventFilter) => set({ selectedEventFilter }),
  sideBySideMode: false,
  setSideBySideMode: (sideBySideMode) => set({ sideBySideMode }),

  visibleFloors: new Set<string>(),
  toggleFloorVisibility: (floorId) => {
    const current = get().visibleFloors;
    const next = new Set(current);
    if (next.has(floorId)) {
      next.delete(floorId);
    } else {
      next.add(floorId);
    }
    set({ visibleFloors: next });
  },
  setAllFloorsVisible: (floorIds) => set({ visibleFloors: new Set(floorIds) }),

  dragItem: null,
  dragPosition: null,
  setDragItem: (dragItem) => set({ dragItem }),
  setDragPosition: (dragPosition) => set({ dragPosition }),

  isBooting: true,
  setIsBooting: (isBooting) => set({ isBooting }),
}));

