import React from 'react';
import { colors } from '../tokens';

interface EventLogLineProps {
  timestampSec: number;
  type: string;
  message: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}

export const EventLogLine: React.FC<EventLogLineProps> = ({
  timestampSec,
  type,
  message,
  severity = 'INFO',
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const severityColor =
    severity === 'CRITICAL'
      ? colors.critical
      : severity === 'WARNING'
      ? colors.warning
      : colors.info;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '3px 6px',
        fontSize: '11px',
        fontFamily: "'IBM Plex Mono', monospace",
        borderBottom: `1px solid ${colors.borderLight}22`,
      }}
    >
      <span style={{ color: colors.textMuted, flexShrink: 0 }}>
        {formatTime(timestampSec)}
      </span>
      <span
        style={{
          color: severityColor,
          fontWeight: 600,
          flexShrink: 0,
          fontSize: '10px',
        }}
      >
        [{type}]
      </span>
      <span style={{ color: colors.textPrimary, wordBreak: 'break-word' }}>
        {message}
      </span>
    </div>
  );
};
