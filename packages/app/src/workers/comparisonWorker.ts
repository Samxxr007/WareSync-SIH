/**
 * comparisonWorker — Web Worker that runs two SimulationEngine instances
 * (Baseline + Proposed) in parallel and streams dual frames back to the main
 * thread, then posts a final ComparisonRunResults when the run ends.
 *
 * Messages IN:
 *   { type: 'INIT', payload: { model, navGraph, tasks, steps, seed } }
 *   { type: 'RUN' }   — start streaming steps
 *   { type: 'ABORT' } — cancel the run
 *
 * Messages OUT:
 *   { type: 'PROGRESS', stepsDone, totalSteps, baseline: SimulationFrame, proposed: SimulationFrame }
 *   { type: 'DONE', result: ComparisonRunResults }
 *   { type: 'ERROR', message: string }
 */
import { compileWarehouse } from '@waresync/core';
import { ComparisonRunner } from '@waresync/core';
import type { WarehouseModel } from '@waresync/core';
import type { WarehouseTask } from '@waresync/core';

let runner: ComparisonRunner | null = null;
let totalSteps = 0;
let aborted = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data as {
    type: string;
    payload: {
      model: WarehouseModel;
      tasks: WarehouseTask[];
      steps: number;
      seed?: number;
    };
  };

  switch (type) {
    case 'INIT': {
      try {
        const { model, tasks, steps, seed = 42 } = payload;
        const compilation = compileWarehouse(model);
        runner = new ComparisonRunner(model, compilation.navGraph, tasks, seed);
        totalSteps = steps ?? 300;
        aborted = false;
        self.postMessage({ type: 'READY' });
      } catch (err) {
        self.postMessage({ type: 'ERROR', message: String(err) });
      }
      break;
    }

    case 'RUN': {
      if (!runner) {
        self.postMessage({ type: 'ERROR', message: 'Runner not initialised. Send INIT first.' });
        return;
      }
      aborted = false;

      // Run in chunks so the worker remains responsive to ABORT messages
      const CHUNK_SIZE = 20;
      let stepsDone = 0;

      while (stepsDone < totalSteps && !aborted) {
        const batchEnd = Math.min(stepsDone + CHUNK_SIZE, totalSteps);
        let lastFrames: { baseline: any; proposed: any } | null = null;

        for (let s = stepsDone; s < batchEnd; s++) {
          lastFrames = runner.step(0.2);
        }

        stepsDone = batchEnd;

        if (lastFrames) {
          self.postMessage({
            type: 'PROGRESS',
            stepsDone,
            totalSteps,
            baseline: lastFrames.baseline,
            proposed: lastFrames.proposed,
          });
        }

        // Yield to the event loop so ABORT can come through
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }

      if (!aborted) {
        const result = runner.computeResults();
        self.postMessage({ type: 'DONE', result });
      }
      break;
    }

    case 'ABORT': {
      aborted = true;
      break;
    }
  }
};
