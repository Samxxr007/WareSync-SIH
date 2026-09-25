import React from 'react';
import { useUIStore } from '../store/uiStore';
import { useWarehouseStore } from '../store/warehouseStore';
import { useSimulationStore } from '../store/simulationStore';
import { useCompilerStore } from '../store/compilerStore';
import { ModeTab, AppMode } from '../design-system/components/ModeTab';
import { colors } from '../design-system/tokens';
import { AddTaskModal } from '../ui/tasks/AddTaskModal';
import { Plus } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { mode, setMode, setIsBooting } = useUIStore();
  const { model, resetToDemo } = useWarehouseStore();
  const { currentFrame, isPlaying } = useSimulationStore();
  const { compile, isCompiling } = useCompilerStore();

  const robotCount = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'amr')).length;
  const floorCount = model.floors.length;
  const [isAddTaskOpen, setIsAddTaskOpen] = React.useState(false);

  return (
    <header
      style={{
        height: 44,
        backgroundColor: colors.bgPanel,
        borderBottom: `1px solid ${colors.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 50,
      }}
    >
      {/* LEFT: Industrial Brand & Project */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Simple geometric industrial mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9" height="9" stroke={colors.primary} strokeWidth="2.2" />
            <rect x="13" y="2" width="9" height="9" stroke={colors.textPrimary} strokeWidth="2.2" />
            <rect x="2" y="13" width="9" height="9" stroke={colors.textPrimary} strokeWidth="2.2" />
            <rect x="13" y="13" width="9" height="9" stroke={colors.primary} strokeWidth="2.2" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 800,
                fontSize: '13px',
                letterSpacing: '0.08em',
                color: colors.textPrimary,
              }}
            >
              WARESYNC
            </span>
            <span style={{ fontSize: '9px', color: colors.textMuted, letterSpacing: '0.04em' }}>
              INDUSTRIAL ORCHESTRATION
            </span>
          </div>
        </div>

        <div style={{ width: 1, height: 22, backgroundColor: colors.borderLight }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '11px', color: colors.textMuted, fontWeight: 500 }}>
            FACILITY:
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: colors.textPrimary }}>
            {model.name}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontFamily: "'IBM Plex Mono', monospace",
              backgroundColor: colors.bgPanelSecondary,
              padding: '1px 5px',
              borderRadius: '3px',
              color: colors.textSecondary,
              border: `1px solid ${colors.borderLight}`,
            }}
          >
            {model.id}
          </span>
        </div>
      </div>

      {/* CENTER: Operational Modes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {(['DESIGN', 'SIMULATE', 'OPERATE', 'VALIDATE', 'DEPLOY'] as AppMode[]).map((m) => (
          <ModeTab key={m} mode={m} active={mode === m} onClick={setMode} />
        ))}
      </div>

      {/* RIGHT: Telemetry Status & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {mode === 'DESIGN' && (
          <button
            onClick={() => compile(model)}
            disabled={isCompiling}
            style={{
              backgroundColor: colors.primary,
              color: colors.textInverse,
              borderColor: colors.primary,
              fontWeight: 700,
              fontSize: '11px',
              padding: '4px 10px',
              letterSpacing: '0.04em',
            }}
          >
            {isCompiling ? 'COMPILING...' : 'COMPILE WAREHOUSE'}
          </button>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: isPlaying ? colors.success : colors.warning,
              }}
            />
            <span style={{ color: colors.textSecondary }}>
              {isPlaying ? 'ONLINE' : 'STANDBY'}
            </span>
          </div>

          <span style={{ color: colors.textMuted }}>|</span>

          <span style={{ color: colors.textSecondary }}>
            <strong style={{ color: colors.textPrimary }}>{robotCount}</strong> AMRs
          </span>

          <span style={{ color: colors.textMuted }}>|</span>

          <span style={{ color: colors.textSecondary }}>
            <strong style={{ color: colors.textPrimary }}>{floorCount}</strong> FLOORS
          </span>

          <span style={{ color: colors.textMuted }}>|</span>

          <span style={{ color: colors.success }}>
            <strong>0</strong> COLLISIONS
          </span>
        </div>

        <button
          onClick={() => setIsAddTaskOpen(true)}
          title="Create and dispatch a new warehouse mission to the fleet"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            backgroundColor: colors.primary,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          <Plus size={13} strokeWidth={2.5} /> NEW TASK
        </button>

        <button
          onClick={() => setIsBooting(true)}
          title="Replay Smart India Hackathon boot telemetry sequence"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 8px',
            backgroundColor: colors.bgHover,
            color: colors.primary,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          REPLAY BOOT
        </button>

        <button
          onClick={resetToDemo}
          title="Reset facility model to default state"
          style={{
            fontSize: '10px',
            padding: '3px 8px',
            color: colors.textSecondary,
          }}
        >
          RESET DEMO
        </button>
      </div>

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
      />
    </header>
  );
};
