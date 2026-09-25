import { compileWarehouse, SimulationEngine, WarehouseModel } from '@waresync/core';

let engine: SimulationEngine | null = null;
let timer: any = null;

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT': {
      const { model, mode, tasks } = payload as {
        model: WarehouseModel;
        mode: 'BASELINE' | 'PROPOSED';
        tasks?: any[];
      };
      const compilation = compileWarehouse(model);
      engine = new SimulationEngine(model, compilation.navGraph, { mode });
      if (tasks) {
        engine.addTasks(tasks);
      }
      self.postMessage({ type: 'FRAME', frame: engine.createFrameSnapshot() });
      break;
    }

    case 'PLAY': {
      const speed = payload?.speed || 1;
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (engine) {
          const frame = engine.step(0.2 * speed);
          self.postMessage({ type: 'FRAME', frame });
        }
      }, 100);
      break;
    }

    case 'PAUSE': {
      if (timer) clearInterval(timer);
      break;
    }

    case 'STEP': {
      if (engine) {
        const frame = engine.step(0.2);
        self.postMessage({ type: 'FRAME', frame });
      }
      break;
    }

    case 'TRIGGER_EMERGENCY': {
      const { emType, floorId, blockedNodes, desc } = payload;
      if (engine) {
        engine.triggerEmergencyEvent(emType, floorId, blockedNodes, desc);
        self.postMessage({ type: 'FRAME', frame: engine.createFrameSnapshot() });
      }
      break;
    }

    case 'ADD_TASK': {
      if (engine && payload) {
        engine.addTask(payload);
        self.postMessage({ type: 'FRAME', frame: engine.createFrameSnapshot() });
      }
      break;
    }

    case 'ADD_TASKS': {
      if (engine && payload) {
        engine.addTasks(payload);
        self.postMessage({ type: 'FRAME', frame: engine.createFrameSnapshot() });
      }
      break;
    }

    case 'ADD_OBSTACLE': {
      if (engine && payload) {
        engine.addDynamicObstacle(payload);
        self.postMessage({ type: 'FRAME', frame: engine.createFrameSnapshot() });
      }
      break;
    }

    case 'TRIGGER_INTERSECTION_DEMO': {
      if (engine) {
        engine.triggerIntersectionDemo();
        self.postMessage({ type: 'FRAME', frame: engine.createFrameSnapshot() });
      }
      break;
    }

    case 'SET_PEER_DEGRADATION': {
      if (engine && payload) {
        const { robotA, robotB, state, latencyMs, packetLoss } = payload;
        engine.setPeerDegradation(robotA, robotB, state, latencyMs, packetLoss);
        self.postMessage({ type: 'FRAME', frame: engine.createFrameSnapshot() });
      }
      break;
    }

    case 'RESTORE_PEER_LINKS': {
      if (engine) {
        engine.restoreAllLinks();
        self.postMessage({ type: 'FRAME', frame: engine.createFrameSnapshot() });
      }
      break;
    }

    case 'CLEAR_MESSAGE_LOG': {
      if (engine) {
        engine.clearNetworkMessageLog();
        self.postMessage({ type: 'FRAME', frame: engine.createFrameSnapshot() });
      }
      break;
    }
  }
};
