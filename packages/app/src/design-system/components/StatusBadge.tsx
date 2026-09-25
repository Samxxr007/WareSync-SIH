import React from 'react';
import { colors } from '../tokens';

export type StatusTone = 'success' | 'warning' | 'critical' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  dotOnly?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  tone = 'neutral',
  dotOnly = false,
}) => {
  const toneMap: Record<StatusTone, { color: string; bg: string }> = {
    success: { color: colors.success, bg: colors.successBg },
    warning: { color: colors.warning, bg: colors.warningBg },
    critical: { color: colors.critical, bg: colors.criticalBg },
    info: { color: colors.info, bg: colors.infoBg },
    neutral: { color: colors.textSecondary, bg: colors.bgPanelSecondary },
  };

  const style = toneMap[tone];

  if (dotOnly) {
    return (
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: style.color,
          marginRight: 6,
        }}
        title={label}
      />
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: style.bg,
        color: style.color,
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        border: `1px solid ${style.color}33`,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: style.color,
          marginRight: 5,
        }}
      />
      {label}
    </span>
  );
};
