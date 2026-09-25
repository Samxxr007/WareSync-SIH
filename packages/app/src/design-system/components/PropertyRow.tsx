import React from 'react';
import { colors } from '../tokens';

interface PropertyRowProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  mono?: boolean;
}

export const PropertyRow: React.FC<PropertyRowProps> = ({
  label,
  value,
  unit,
  mono = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 0',
        fontSize: '12px',
        borderBottom: `1px solid ${colors.borderLight}44`,
      }}
    >
      <span style={{ color: colors.textSecondary, fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          style={{
            color: colors.textPrimary,
            fontWeight: 600,
            fontFamily: mono ? "'IBM Plex Mono', monospace" : 'inherit',
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>{unit}</span>
        )}
      </div>
    </div>
  );
};

interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const PropertySection: React.FC<PropertySectionProps> = ({
  title,
  children,
}) => {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: colors.textMuted,
          paddingBottom: 4,
          marginBottom: 4,
          borderBottom: `1px solid ${colors.borderLight}`,
        }}
      >
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
};
