/**
 * BenchmarkScreen — dedicated benchmarking screen at ui/benchmark/BenchmarkScreen.tsx
 * matching the plan's Phase 15 specification.
 *
 * Runs a full Baseline vs. Proposed comparison via the comparisonWorker,
 * streams progress, and shows ComparisonCharts + SideBySideSimulation when done.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useComparisonStore } from '../../store/comparisonStore';
import { useSimulationStore } from '../../store/simulationStore';
import { INITIAL_DEMO_TASKS } from '@waresync/core';
import { ComparisonCharts } from './ComparisonCharts';
import { SideBySideSimulation } from './SideBySideSimulation';
import { colors } from '../../design-system/tokens';

const BENCHMARK_STEPS = 300;

export const BenchmarkScreen: React.FC = () => {
  const { model } = useWarehouseStore();
  const { status, result, runDurationMs, errorMessage, setStatus, setResult, setError, reset } =
    useComparisonStore();
  const { initSimulation, play } = useSimulationStore();

  const workerRef = useRef<Worker | null>(null);
  const startTimeRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const runBenchmark = () => {
    if (status === 'running') return;
    reset();
    setProgress(0);
    setStatus('running');
    startTimeRef.current = Date.now();

    // Instantiate the comparison worker
    const worker = new Worker(
      new URL('../../workers/comparisonWorker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data as { type: string; payload?: any } & Record<string, any>;
      switch (e.data.type) {
        case 'READY':
          worker.postMessage({ type: 'RUN' });
          break;
        case 'PROGRESS':
          setProgress(Math.round((e.data.stepsDone / e.data.totalSteps) * 100));
          break;
        case 'DONE': {
          const durationMs = Date.now() - startTimeRef.current;
          setResult(e.data.result, durationMs);
          setProgress(100);
          worker.terminate();
          break;
        }
        case 'ERROR':
          setError(e.data.message ?? 'Unknown error');
          worker.terminate();
          break;
      }
    };

    worker.onerror = (err) => {
      setError(err.message);
      worker.terminate();
    };

    worker.postMessage({
      type: 'INIT',
      payload: { model, tasks: INITIAL_DEMO_TASKS, steps: BENCHMARK_STEPS, seed: 42 },
    });
  };

  const abortBenchmark = () => {
    workerRef.current?.postMessage({ type: 'ABORT' });
    workerRef.current?.terminate();
    reset();
    setProgress(0);
  };

  const openSideBySide = () => {
    initSimulation(model, 'SIDE_BY_SIDE');
    play();
  };

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '20px 24px',
        background: colors.bgWorkspace,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary, marginBottom: '4px' }}>
            Benchmark & Comparison
          </div>
          <div style={{ fontSize: '12px', color: colors.textSecondary }}>
            Run Baseline (FCFS Stop-and-Wait) vs. Proposed (Decentralised SIPP + Right-of-Way) — identical seed, {BENCHMARK_STEPS} steps
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {status === 'running' ? (
            <button
              onClick={abortBenchmark}
              style={{
                padding: '6px 16px', fontSize: '12px', fontWeight: 600,
                background: colors.critical, color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer',
              }}
            >
              Abort
            </button>
          ) : (
            <button
              onClick={runBenchmark}
              style={{
                padding: '6px 16px', fontSize: '12px', fontWeight: 600,
                background: colors.primary, color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer',
              }}
            >
              {status === 'done' ? 'Re-run Benchmark' : 'Run Benchmark'}
            </button>
          )}
          {status === 'done' && (
            <button
              onClick={openSideBySide}
              style={{
                padding: '6px 16px', fontSize: '12px', fontWeight: 600,
                background: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`,
                borderRadius: '3px', cursor: 'pointer',
              }}
            >
              Open Side-by-Side View
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {status === 'error' && (
        <div
          style={{
            padding: '12px 16px',
            background: '#FFF5F5',
            border: `1px solid ${colors.critical}`,
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '12px',
            color: colors.critical,
          }}
        >
          <strong>Benchmark Run Notice:</strong> {errorMessage || 'An issue occurred during worker execution.'}
        </div>
      )}

      {/* Progress bar */}
      {status === 'running' && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textSecondary, marginBottom: '4px' }}>
            <span>Running comparison…</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{progress}%</span>
          </div>
          <div style={{ height: '6px', background: '#E8ECF0', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%', width: `${progress}%`, background: colors.primary,
                borderRadius: '3px', transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      )}

      {/* Summary KPI strip when done */}
      {status === 'done' && result && (
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px',
          }}
        >
          {[
            { label: 'Task Time Improvement', value: `+${result.completionTimeImprovementPercent}%`, color: colors.success },
            { label: 'Wait Time Reduction', value: `+${result.waitTimeImprovementPercent}%`, color: colors.success },
            { label: 'Throughput Gain', value: `+${result.throughputImprovementPercent}%`, color: colors.primary },
            { label: 'Deadlock Reduction', value: `+${result.deadlockReductionPercent}%`, color: colors.success },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: '#FFFFFF', border: `1px solid ${colors.borderLight}`, borderRadius: '4px',
                padding: '12px 16px',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 700, color, fontFamily: 'IBM Plex Mono, monospace' }}>
                {value}
              </div>
              <div style={{ fontSize: '10px', color: colors.textSecondary, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Run duration */}
      {status === 'done' && runDurationMs !== null && (
        <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '16px', fontFamily: 'IBM Plex Mono, monospace' }}>
          Benchmark completed in {(runDurationMs / 1000).toFixed(2)}s (off-thread)
        </div>
      )}

      {/* Charts */}
      {status === 'done' && result && (
        <div style={{ background: '#FFFFFF', border: `1px solid ${colors.borderLight}`, borderRadius: '4px', padding: '16px' }}>
          <ComparisonCharts result={result} />
        </div>
      )}

      {/* Side-by-side preview */}
      {status === 'done' && (
        <div style={{ marginTop: '24px', height: '420px', border: `1px solid ${colors.borderLight}`, borderRadius: '4px', overflow: 'hidden' }}>
          <SideBySideSimulation />
        </div>
      )}

      {/* Idle state */}
      {status === 'idle' && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '300px', color: colors.textMuted, fontSize: '13px', gap: '8px',
          }}
        >
          <div style={{ fontSize: '32px' }}>📊</div>
          <div>Click <strong>Run Benchmark</strong> to compare coordination strategies.</div>
          <div style={{ fontSize: '11px' }}>Runs {BENCHMARK_STEPS} simulation steps off-thread via Web Worker.</div>
        </div>
      )}
    </div>
  );
};

export default BenchmarkScreen;
