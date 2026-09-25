/**
 * SideBySideSimulation — benchmark-specific wrapper that imports the renderer
 * SideBySideScene and wires it to the comparisonStore. Placed under ui/benchmark/
 * to match the plan's directory structure. The actual dual-canvas R3F rendering
 * lives in renderer/SideBySideScene.tsx; this module is the UI integration.
 */
import React from 'react';
import { SideBySideScene } from '../../renderer/SideBySideScene';
import { useComparisonStore } from '../../store/comparisonStore';
import { useSimulationStore } from '../../store/simulationStore';
import { colors } from '../../design-system/tokens';

export const SideBySideSimulation: React.FC = () => {
  const { status, result, runDurationMs } = useComparisonStore();
  const { mode } = useSimulationStore();

  const showScene = mode === 'comparison';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Status banner when a comparison run is available */}
      {status === 'done' && result && (
        <div
          style={{
            padding: '6px 16px',
            background: '#F0F9F4',
            borderBottom: `1px solid ${colors.success}`,
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
            fontSize: '11px',
            fontFamily: 'IBM Plex Mono, monospace',
          }}
        >
          <span style={{ color: colors.success, fontWeight: 700 }}>
            ✓ BENCHMARK COMPLETE
          </span>
          {runDurationMs !== null && (
            <span style={{ color: colors.textSecondary }}>
              Run time: {(runDurationMs / 1000).toFixed(2)}s
            </span>
          )}
          <span style={{ color: colors.textSecondary }}>
            Wait ↓{result.waitTimeImprovementPercent}%
          </span>
          <span style={{ color: colors.textSecondary }}>
            Throughput ↑{result.throughputImprovementPercent}%
          </span>
          <span style={{ color: colors.textSecondary }}>
            Deadlocks ↓{result.deadlockReductionPercent}%
          </span>
        </div>
      )}

      {/* Running indicator */}
      {status === 'running' && (
        <div
          style={{
            padding: '6px 16px',
            background: '#F3F5F7',
            borderBottom: `1px solid ${colors.borderLight}`,
            fontSize: '11px',
            color: colors.textSecondary,
            fontFamily: 'IBM Plex Mono, monospace',
          }}
        >
          ⏳ Benchmark running…
        </div>
      )}

      {/* Error indicator */}
      {status === 'error' && (
        <div
          style={{
            padding: '6px 16px',
            background: '#FFF5F5',
            borderBottom: `1px solid ${colors.critical}`,
            fontSize: '11px',
            color: colors.critical,
            fontFamily: 'IBM Plex Mono, monospace',
          }}
        >
          ✗ Benchmark error — check console
        </div>
      )}

      {/* Scene or placeholder */}
      <div style={{ flex: 1 }}>
        {showScene ? (
          <SideBySideScene />
        ) : (
          <div
            style={{
              display: 'flex',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textMuted,
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Switch to <strong style={{ margin: '0 4px' }}>Side-by-Side</strong> mode in
            the simulation controls to view the dual-canvas comparison.
          </div>
        )}
      </div>
    </div>
  );
};

export default SideBySideSimulation;
