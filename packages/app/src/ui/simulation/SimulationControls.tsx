import React from 'react';
import { Pause, Play, RotateCcw, SkipForward, AlertOctagon, Flame } from 'lucide-react';
import { useSimulationStore } from '../../store/simulationStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useUIStore } from '../../store/uiStore';
import { SimulationMode } from '@waresync/core';
import { colors } from '../../design-system/tokens';

export const SimulationControls: React.FC = () => {
  const { model } = useWarehouseStore();
  const {
    isPlaying,
    play,
    pause,
    step,
    reset,
    speed,
    setSpeed,
    mode,
    setMode,
    currentFrame,
    triggerEmergency,
  } = useSimulationStore();
  const { sideBySideMode, setSideBySideMode } = useUIStore();

  const metrics = currentFrame?.metrics;

  const formatSimTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleModeChange = (newMode: SimulationMode) => {
    if (newMode === 'SIDE_BY_SIDE') {
      setSideBySideMode(true);
      setMode('SIDE_BY_SIDE', model);
    } else {
      setSideBySideMode(false);
      setMode(newMode, model);
    }
  };

  return (
    <div
      style={{
        height: 48,
        backgroundColor: colors.bgPanel,
        borderTop: `1px solid ${colors.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        zIndex: 35,
        gap: 12,
      }}
    >
      {/* 1. PLAY / PAUSE / STEP / RESET */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isPlaying ? (
          <button
            onClick={pause}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              backgroundColor: colors.warning,
              color: colors.textInverse,
              borderColor: colors.warning,
              fontWeight: 700,
              fontSize: '11px',
            }}
          >
            <Pause size={13} /> PAUSE
          </button>
        ) : (
          <button
            onClick={play}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              backgroundColor: colors.primary,
              color: colors.textInverse,
              borderColor: colors.primary,
              fontWeight: 700,
              fontSize: '11px',
            }}
          >
            <Play size={13} /> PLAY
          </button>
        )}

        <button
          onClick={step}
          title="Step simulation forward 0.2s"
          style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 600 }}
        >
          <SkipForward size={13} />
        </button>

        <button
          onClick={() => reset(model)}
          title="Reset simulation"
          style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 600 }}
        >
          <RotateCcw size={13} />
        </button>

        {/* Speed selectors */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                padding: '4px 7px',
                fontSize: '10px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: speed === s ? 700 : 500,
                backgroundColor: speed === s ? colors.bgActive : 'transparent',
                borderColor: speed === s ? colors.borderStrong : colors.borderLight,
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* 2. MODE SELECTOR */}
      <div
        style={{
          display: 'flex',
          backgroundColor: colors.bgPanelSecondary,
          padding: 2,
          borderRadius: 4,
          border: `1px solid ${colors.borderLight}`,
        }}
      >
        <button
          onClick={() => handleModeChange('BASELINE')}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            backgroundColor: mode === 'BASELINE' && !sideBySideMode ? colors.bgPanel : 'transparent',
            color: mode === 'BASELINE' && !sideBySideMode ? colors.textPrimary : colors.textMuted,
            boxShadow: mode === 'BASELINE' && !sideBySideMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          BASELINE (Stop & Wait)
        </button>
        <button
          onClick={() => handleModeChange('PROPOSED')}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            backgroundColor: mode === 'PROPOSED' && !sideBySideMode ? colors.primary : 'transparent',
            color: mode === 'PROPOSED' && !sideBySideMode ? colors.textInverse : colors.textMuted,
            boxShadow: mode === 'PROPOSED' && !sideBySideMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          PROPOSED (Decentralized)
        </button>
        <button
          onClick={() => handleModeChange('SIDE_BY_SIDE')}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            backgroundColor: sideBySideMode ? colors.accentSteel : 'transparent',
            color: sideBySideMode ? colors.textInverse : colors.textMuted,
            boxShadow: sideBySideMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          SIDE-BY-SIDE
        </button>
      </div>

      {/* 3. SIMULATION METRICS STRIP */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
        }}
      >
        <div>
          <span style={{ color: colors.textMuted }}>TIME: </span>
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            {formatSimTime(metrics?.simTimeSec || 0)}
          </span>
        </div>
        <span style={{ color: colors.borderLight }}>|</span>
        <div>
          <span style={{ color: colors.textMuted }}>TASKS: </span>
          <span style={{ fontWeight: 700, color: colors.primary }}>
            {metrics?.completedTasks || 0}
          </span>
        </div>
        <span style={{ color: colors.borderLight }}>|</span>
        <div>
          <span style={{ color: colors.textMuted }}>WAIT: </span>
          <span style={{ fontWeight: 700, color: colors.warning }}>
            {metrics?.totalWaitTimeSec || 0}s
          </span>
        </div>
        <span style={{ color: colors.borderLight }}>|</span>
        <div>
          <span style={{ color: colors.textMuted }}>P2P MSGS: </span>
          <span style={{ fontWeight: 700 }}>{metrics?.p2pMessagesExchanged || 0}</span>
        </div>
      </div>

      {/* 4. EMERGENCY TEST INJECTORS */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={() =>
            triggerEmergency(
              'FIRE',
              'floor-2',
              ['node_floor-2_0_0', 'node_floor-2_4_0'],
              'Fire outbreak detected near Bay B'
            )
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            fontSize: '10px',
            color: colors.critical,
            borderColor: colors.critical,
          }}
          title="Simulate fire emergency on Floor 2"
        >
          <Flame size={12} /> FIRE (F2)
        </button>
        <button
          onClick={() =>
            triggerEmergency(
              'BLOCKED_AISLE',
              'floor-1',
              ['node_floor-1_0_-4'],
              'Pallet obstruction on Main Corridor'
            )
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            fontSize: '10px',
            color: colors.warning,
            borderColor: colors.warning,
          }}
          title="Simulate temporary obstruction"
        >
          <AlertOctagon size={12} /> BLOCK AISLE
        </button>
      </div>
    </div>
  );
};
