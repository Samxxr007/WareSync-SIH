import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSimulationStore } from '../../store/simulationStore';
import { colors } from '../../design-system/tokens';

export const EmergencyPanel: React.FC = () => {
  const { currentFrame, reset } = useSimulationStore();

  const activeSafetyEvent = currentFrame?.events.find(
    (e) => e.type === 'SAFETY' && e.severity === 'CRITICAL'
  );

  if (!activeSafetyEvent) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 42,
        backgroundColor: colors.criticalBg,
        borderBottom: `2px solid ${colors.critical}`,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={18} color={colors.critical} />
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              fontFamily: "'IBM Plex Mono', monospace",
              color: colors.critical,
              letterSpacing: '0.05em',
            }}
          >
            ACTIVE INDUSTRIAL HAZARD / EMERGENCY
          </div>
          <div style={{ fontSize: '12px', color: colors.textPrimary, fontWeight: 500 }}>
            {activeSafetyEvent.message}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: '11px',
            fontFamily: "'IBM Plex Mono', monospace",
            color: colors.critical,
            fontWeight: 600,
          }}
        >
          DYNAMIC ISOLATION & REROUTING APPLIED
        </span>
      </div>
    </div>
  );
};
