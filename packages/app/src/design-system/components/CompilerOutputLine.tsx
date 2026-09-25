import React from 'react';
import { colors } from '../tokens';

interface CompilerOutputLineProps {
  severity: 'INFO' | 'WARNING' | 'ERROR';
  stage: string;
  message: string;
  onClick?: () => void;
}

export const CompilerOutputLine: React.FC<CompilerOutputLineProps> = ({
  severity,
  stage,
  message,
  onClick,
}) => {
  const icon =
    severity === 'ERROR' ? '✗' : severity === 'WARNING' ? '⚠' : '✓';
  const color =
    severity === 'ERROR'
      ? colors.critical
      : severity === 'WARNING'
      ? colors.warning
      : colors.success;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '3px 6px',
        fontSize: '11px',
        fontFamily: "'IBM Plex Mono', monospace",
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: `1px solid ${colors.borderLight}22`,
      }}
    >
      <span style={{ color, fontWeight: 700, width: 14 }}>{icon}</span>
      <span style={{ color: colors.textSecondary, fontWeight: 600 }}>[{stage}]</span>
      <span style={{ color: severity === 'ERROR' ? colors.critical : colors.textPrimary }}>
        {message}
      </span>
    </div>
  );
};
