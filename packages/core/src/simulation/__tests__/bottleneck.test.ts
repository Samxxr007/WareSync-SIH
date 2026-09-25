import { describe, it, expect } from 'vitest';
import { compileWarehouse } from '../../compiler/index.js';
import { DEMO_WAREHOUSE } from '../../data/demoWarehouse.js';
import { SimulationEngine } from '../simulationEngine.js';

describe('Bottleneck Overlapping Corridor Task Test', () => {
  it('measures task completion time with overlapping intersection bottleneck', () => {
    const comp = compileWarehouse(DEMO_WAREHOUSE);

    // Both robots deliver to the EXACT same station (DOCK-01) from opposite ends at the same time
    const bottleneckTasks = [
      {
        id: 'T-BN-1',
        sku: 'SKU-A',
        quantity: 15,
        pickupRackId: 'R01', // floor-1 rack
        pickupFloorId: 'floor-1',
        pickupLevel: 1,
        dropStationId: 'DOCK-01',
        dropFloorId: 'floor-1',
        weightKg: 30,
        priority: 'NORMAL' as const,
        status: 'PENDING' as const,
        createdTimeSec: 0,
      },
      {
        id: 'T-BN-2',
        sku: 'SKU-B',
        quantity: 15,
        pickupRackId: 'R04_F1', // rack from other side of floor-1
        pickupFloorId: 'floor-1',
        pickupLevel: 1,
        dropStationId: 'DOCK-01', // SAME drop station!
        dropFloorId: 'floor-1',
        weightKg: 30,
        priority: 'HIGH' as const,
        status: 'PENDING' as const,
        createdTimeSec: 0,
      },
    ];

    const baseEngine = new SimulationEngine(
      JSON.parse(JSON.stringify(DEMO_WAREHOUSE)),
      comp.navGraph,
      { mode: 'BASELINE' }
    );
    baseEngine.addTasks(JSON.parse(JSON.stringify(bottleneckTasks)));

    const propEngine = new SimulationEngine(
      JSON.parse(JSON.stringify(DEMO_WAREHOUSE)),
      comp.navGraph,
      { mode: 'PROPOSED' }
    );
    propEngine.addTasks(JSON.parse(JSON.stringify(bottleneckTasks)));

    // Run until both complete or 350 steps
    let baseBothDone = false;
    let propBothDone = false;
    let baseDoneTime = 0;
    let propDoneTime = 0;

    for (let i = 0; i < 350; i++) {
      const fb = baseEngine.step(0.2);
      const fp = propEngine.step(0.2);

      if (!baseBothDone && fb.metrics.completedTasks >= 2) {
        baseBothDone = true;
        baseDoneTime = fb.simTimeSec;
      }
      if (!propBothDone && fp.metrics.completedTasks >= 2) {
        propBothDone = true;
        propDoneTime = fp.simTimeSec;
      }
    }

    const fb = baseEngine.createFrameSnapshot();
    const fp = propEngine.createFrameSnapshot();

    console.log('=== BOTTLENECK OVERLAPPING TASK RESULTS ===');
    console.log('Baseline collisions:', fb.metrics.collisions);
    console.log('Proposed collisions:', fp.metrics.collisions);
    console.log('Baseline total tasks completed:', fb.metrics.completedTasks);
    console.log('Proposed total tasks completed:', fp.metrics.completedTasks);
    console.log('Baseline time for 2 overlapping tasks:', baseDoneTime || '>70s');
    console.log('Proposed time for 2 overlapping tasks:', propDoneTime || '>70s');
    console.log('Baseline wait time:', fb.metrics.totalWaitTimeSec.toFixed(1) + 's');
    console.log('Proposed wait time:', fp.metrics.totalWaitTimeSec.toFixed(1) + 's');

    expect(fp.metrics.collisions).toBe(0);
    expect(fb.metrics.collisions).toBe(0);
  });
});
