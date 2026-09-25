import { NavigationGraph } from '../compiler/navigationGraph.js';
import { WarehouseTask } from '../planner/taskAllocator.js';
import { WarehouseModel } from '../warehouse/types.js';
import { SimulationEngine } from './simulationEngine.js';
import { SimMetrics, SimulationFrame } from './types.js';

export interface ComparisonRunResults {
  baselineMetrics: SimMetrics;
  proposedMetrics: SimMetrics;
  completionTimeImprovementPercent: number;
  waitTimeImprovementPercent: number;
  throughputImprovementPercent: number;
  deadlockReductionPercent: number;
}

export class ComparisonRunner {
  private baselineEngine: SimulationEngine;
  private proposedEngine: SimulationEngine;

  constructor(
    warehouseModel: WarehouseModel,
    navGraph: NavigationGraph,
    initialTasks: WarehouseTask[],
    randomSeed = 42
  ) {
    // Clone warehouse model deeply to ensure absolute identical start
    const modelCopyA = JSON.parse(JSON.stringify(warehouseModel)) as WarehouseModel;
    const modelCopyB = JSON.parse(JSON.stringify(warehouseModel)) as WarehouseModel;

    this.baselineEngine = new SimulationEngine(modelCopyA, navGraph, {
      mode: 'BASELINE',
      randomSeed,
    });
    this.proposedEngine = new SimulationEngine(modelCopyB, navGraph, {
      mode: 'PROPOSED',
      randomSeed,
    });

    this.baselineEngine.addTasks(JSON.parse(JSON.stringify(initialTasks)));
    this.proposedEngine.addTasks(JSON.parse(JSON.stringify(initialTasks)));
  }

  public step(dtSec = 0.2): { baseline: SimulationFrame; proposed: SimulationFrame } {
    const baseline = this.baselineEngine.step(dtSec);
    const proposed = this.proposedEngine.step(dtSec);
    return { baseline, proposed };
  }

  public computeResults(): ComparisonRunResults {
    const baseSnap = this.baselineEngine.createFrameSnapshot().metrics;
    const propSnap = this.proposedEngine.createFrameSnapshot().metrics;

    const computePct = (baseVal: number, propVal: number): number => {
      if (baseVal <= 0) return 0;
      return parseFloat((((baseVal - propVal) / baseVal) * 100).toFixed(1));
    };

    return {
      baselineMetrics: baseSnap,
      proposedMetrics: propSnap,
      completionTimeImprovementPercent: computePct(
        baseSnap.avgTaskCompletionTimeSec || baseSnap.simTimeSec,
        propSnap.avgTaskCompletionTimeSec || propSnap.simTimeSec
      ),
      waitTimeImprovementPercent: computePct(baseSnap.totalWaitTimeSec, propSnap.totalWaitTimeSec),
      throughputImprovementPercent: baseSnap.taskThroughputPerMinute > 0
        ? parseFloat((((propSnap.taskThroughputPerMinute - baseSnap.taskThroughputPerMinute) / baseSnap.taskThroughputPerMinute) * 100).toFixed(1))
        : 0,
      deadlockReductionPercent: baseSnap.deadlocksResolved > 0
        ? computePct(baseSnap.deadlocksResolved, propSnap.deadlocksResolved)
        : 100,
    };
  }
}
