import React from 'react';
import { colors } from '../tokens';

interface AlertBannerProps {
  title: string;
  message: string;
  severity?: 'WARNING' | 'CRITICAL' | 'INFO';
  onDismiss?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  title,
  message,
  severity = 'WARNING',
  onDismiss,
}) => {
  const isCritical = severity === 'CRITICAL';
  const borderColor = isCritical ? colors.critical : colors.warning;
  const bgColor = isCritical ? colors.criticalBg : colors.warningBg;
  const textColor = isCritical ? colors.critical : colors.warning;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        backgroundColor: bgColor,
        borderLeft: `4px solid ${borderColor}`,
        borderBottom: `1px solid ${colors.borderLight}`,
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontWeight: 700,
            color: textColor,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {title}
        </span>
        <span style={{ color: colors.textPrimary }}>{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            border: 'none',
            background: 'none',
            color: colors.textSecondary,
            fontSize: '11px',
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          DISMISS
        </button>
      )}
    </div>
  );
};
