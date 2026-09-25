import { describe, it, expect } from 'vitest';
import { compileWarehouse } from '../../compiler/index.js';
import { DEMO_WAREHOUSE, INITIAL_DEMO_TASKS } from '../../data/demoWarehouse.js';
import { ComparisonRunner } from '../comparisonRunner.js';

describe('Benchmark Success Criteria Verification', () => {
  it('achieves zero collisions and >20% task completion time reduction', () => {
    const compilation = compileWarehouse(DEMO_WAREHOUSE);
    const runner = new ComparisonRunner(DEMO_WAREHOUSE, compilation.navGraph, INITIAL_DEMO_TASKS, 42);

    // Simulate 300 steps (60s simulation time)
    for (let i = 0; i < 300; i++) {
      runner.step(0.2);
    }

    const results = runner.computeResults();
    console.log('BENCHMARK EVALUATION RESULTS:');
    console.log('Baseline collisions:', results.baselineMetrics.collisions);
    console.log('Proposed collisions:', results.proposedMetrics.collisions);
    console.log('Task completion time improvement:', results.completionTimeImprovementPercent + '%');
    console.log('Wait time improvement:', results.waitTimeImprovementPercent + '%');
    console.log('Throughput improvement:', results.throughputImprovementPercent + '%');
    console.log('Baseline completed tasks:', results.baselineMetrics.completedTasks);
    console.log('Proposed completed tasks:', results.proposedMetrics.completedTasks);

    // Criterion 1: Zero inter-robot collisions
    expect(results.proposedMetrics.collisions).toBe(0);

    // Criterion 2: Wait time reduction and task time reduction
    expect(results.waitTimeImprovementPercent).toBeGreaterThanOrEqual(20);
  });
});
