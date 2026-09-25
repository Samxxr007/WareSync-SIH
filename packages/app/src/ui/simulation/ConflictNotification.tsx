import React, { useEffect, useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { colors } from '../../design-system/tokens';

export const ConflictNotification: React.FC = () => {
  const { currentFrame } = useSimulationStore();
  const [latestConflict, setLatestConflict] = useState<string | null>(null);

  useEffect(() => {
    if (!currentFrame) return;
    const conflictEvt = currentFrame.events.find((e) => e.type === 'CONFLICT');
    if (conflictEvt && conflictEvt.message !== latestConflict) {
      setLatestConflict(conflictEvt.message);
      const timer = setTimeout(() => {
        setLatestConflict(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentFrame?.events]);

  if (!latestConflict) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        right: 14,
        zIndex: 40,
        backgroundColor: colors.bgPanel,
        border: `1px solid ${colors.warning}`,
        borderLeft: `4px solid ${colors.warning}`,
        borderRadius: 4,
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        maxWidth: 380,
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontWeight: 700,
          fontFamily: "'IBM Plex Mono', monospace",
          color: colors.warning,
          marginBottom: 2,
          letterSpacing: '0.04em',
        }}
      >
        DECENTRALIZED P2P CONFLICT NEGOTIATION
      </div>
      <div style={{ fontSize: '11px', color: colors.textPrimary, fontFamily: "'IBM Plex Mono', monospace" }}>
        {latestConflict}
      </div>
    </div>
  );
};
