/**
 * simulationStore — Zustand store for simulation state.
 *
 * Architecture: The PROPOSED and BASELINE single-mode simulations run inside a
 * Web Worker (simulationWorker.ts) to keep the UI thread free. SIDE_BY_SIDE
 * mode runs inline on the main thread (two engines) since it must coordinate
 * both canvases simultaneously.
 *
 * Worker message protocol:
 *   IN:  INIT | PLAY | PAUSE | STEP | TRIGGER_EMERGENCY
 *   OUT: FRAME { frame: SimulationFrame }
 */
import { create } from 'zustand';
import {
  compileWarehouse,
  INITIAL_DEMO_TASKS,
  SimulationEngine,
  SimulationFrame,
  SimulationMode,
  WarehouseModel,
} from '@waresync/core';

/** Create a typed worker pointing at the simulation worker module */
function createSimWorker(): Worker {
  return new Worker(
    new URL('../workers/simulationWorker.ts', import.meta.url),
    { type: 'module' },
  );
}

interface SimulationStore {
  mode: SimulationMode;
  isPlaying: boolean;
  speed: number;

  /** Live frame from the worker (PROPOSED / BASELINE modes) */
  currentFrame: SimulationFrame | null;

  /** Baseline frame — only populated in SIDE_BY_SIDE mode (main thread) */
  baselineFrame: SimulationFrame | null;

  initSimulation: (model: WarehouseModel, mode?: SimulationMode) => void;
  play: () => void;
  pause: () => void;
  step: () => void;
  reset: (model: WarehouseModel) => void;
  setSpeed: (speed: number) => void;
  setMode: (mode: SimulationMode, model: WarehouseModel) => void;
  triggerEmergency: (type: any, floorId: string, blockedNodes: string[], desc: string) => void;
  addTask: (task: WarehouseTask) => void;
  addTasks: (tasks: WarehouseTask[]) => void;
  addDynamicObstacle: (obj: any) => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => {
  // --- Worker state (module-level, outside Zustand) ---
  let worker: Worker | null = null;

  // --- Inline engines for SIDE_BY_SIDE ---
  let sideEngine: SimulationEngine | null = null;
  let sideBaseline: SimulationEngine | null = null;
  let sideTimer: any = null;

  /** Tear down the current worker and inline engines */
  const teardown = () => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    if (sideTimer) {
      clearInterval(sideTimer);
      sideTimer = null;
    }
    sideEngine = null;
    sideBaseline = null;
  };

  /** Attach the standard frame listener to a freshly created worker */
  const attachWorkerListener = (w: Worker) => {
    w.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'FRAME') {
        set({ currentFrame: e.data.frame });
      }
    };
    w.onerror = (err) => console.error('[SimWorker]', err);
  };

  return {
    mode: 'PROPOSED',
    isPlaying: false,
    speed: 1,
    currentFrame: null,
    baselineFrame: null,

    initSimulation: (model, targetMode = 'PROPOSED') => {
      teardown();

      if (targetMode === 'SIDE_BY_SIDE') {
        // --- Inline dual engines ---
        const compilation = compileWarehouse(model);
        sideEngine = new SimulationEngine(
          JSON.parse(JSON.stringify(model)),
          compilation.navGraph,
          { mode: 'PROPOSED' },
        );
        sideBaseline = new SimulationEngine(
          JSON.parse(JSON.stringify(model)),
          compilation.navGraph,
          { mode: 'BASELINE' },
        );
        sideEngine.addTasks(JSON.parse(JSON.stringify(INITIAL_DEMO_TASKS)));
        sideBaseline.addTasks(JSON.parse(JSON.stringify(INITIAL_DEMO_TASKS)));

        const pFrame = sideEngine.createFrameSnapshot();
        const bFrame = sideBaseline.createFrameSnapshot();

        set({ mode: targetMode, isPlaying: false, currentFrame: pFrame, baselineFrame: bFrame });

        // Start ticker — only steps when isPlaying
        sideTimer = setInterval(() => {
          if (!get().isPlaying) return;
          const { speed } = get();
          const pf = sideEngine!.step(0.2 * speed);
          const bf = sideBaseline!.step(0.2 * speed);
          set({ currentFrame: pf, baselineFrame: bf });
        }, 100);
      } else {
        // --- Worker-based single engine ---
        worker = createSimWorker();
        attachWorkerListener(worker);

        worker.postMessage({
          type: 'INIT',
          payload: {
            model,
            mode: targetMode,
            tasks: INITIAL_DEMO_TASKS,
          },
        });

        set({ mode: targetMode, isPlaying: false, currentFrame: null, baselineFrame: null });
      }
    },

    play: () => {
      const { mode, speed } = get();
      set({ isPlaying: true });
      if (mode !== 'SIDE_BY_SIDE' && worker) {
        worker.postMessage({ type: 'PLAY', payload: { speed } });
      }
    },

    pause: () => {
      const { mode } = get();
      set({ isPlaying: false });
      if (mode !== 'SIDE_BY_SIDE' && worker) {
        worker.postMessage({ type: 'PAUSE' });
      }
    },

    step: () => {
      const { mode } = get();
      if (mode === 'SIDE_BY_SIDE') {
        if (sideEngine && sideBaseline) {
          const pf = sideEngine.step(0.2);
          const bf = sideBaseline.step(0.2);
          set({ currentFrame: pf, baselineFrame: bf });
        }
      } else if (worker) {
        worker.postMessage({ type: 'STEP' });
      }
    },

    reset: (model) => {
      get().initSimulation(model, get().mode);
    },

    setSpeed: (speed) => {
      set({ speed });
      // If currently playing in worker mode, restart the play loop at new speed
      const { mode, isPlaying } = get();
      if (mode !== 'SIDE_BY_SIDE' && isPlaying && worker) {
        worker.postMessage({ type: 'PLAY', payload: { speed } });
      }
    },

    setMode: (mode, model) => {
      get().initSimulation(model, mode);
    },

    triggerEmergency: (type, floorId, blockedNodes, desc) => {
      const { mode } = get();
      if (mode !== 'SIDE_BY_SIDE' && worker) {
        worker.postMessage({
          type: 'TRIGGER_EMERGENCY',
          payload: { emType: type, floorId, blockedNodes, desc },
        });
      } else if (sideEngine) {
        sideEngine.triggerEmergencyEvent(type, floorId, blockedNodes, desc);
        set({ currentFrame: sideEngine.createFrameSnapshot() });
      }
    },

    addTask: (task: WarehouseTask) => {
      const { mode } = get();
      if (mode !== 'SIDE_BY_SIDE' && worker) {
        worker.postMessage({ type: 'ADD_TASK', payload: task });
      } else if (sideEngine) {
        sideEngine.addTask(task);
        if (sideBaseline) sideBaseline.addTask(JSON.parse(JSON.stringify(task)));
        set({ currentFrame: sideEngine.createFrameSnapshot() });
      }
    },

    addTasks: (tasks: WarehouseTask[]) => {
      const { mode } = get();
      if (mode !== 'SIDE_BY_SIDE' && worker) {
        worker.postMessage({ type: 'ADD_TASKS', payload: tasks });
      } else if (sideEngine) {
        sideEngine.addTasks(tasks);
        if (sideBaseline) sideBaseline.addTasks(JSON.parse(JSON.stringify(tasks)));
        set({ currentFrame: sideEngine.createFrameSnapshot() });
      }
    },

    addDynamicObstacle: (obj: any) => {
      const { mode } = get();
      if (mode !== 'SIDE_BY_SIDE' && worker) {
        worker.postMessage({ type: 'ADD_OBSTACLE', payload: obj });
      } else if (sideEngine) {
        sideEngine.addDynamicObstacle(obj);
        if (sideBaseline) sideBaseline.addDynamicObstacle(JSON.parse(JSON.stringify(obj)));
        set({ currentFrame: sideEngine.createFrameSnapshot() });
      }
    },
  };
});
