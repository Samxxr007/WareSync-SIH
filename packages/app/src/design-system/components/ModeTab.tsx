import React from 'react';
import { colors } from '../tokens';

export type AppMode = 'DESIGN' | 'SIMULATE' | 'OPERATE' | 'VALIDATE' | 'DEPLOY';

interface ModeTabProps {
  mode: AppMode;
  active: boolean;
  onClick: (mode: AppMode) => void;
}

export const ModeTab: React.FC<ModeTabProps> = ({ mode, active, onClick }) => {
  return (
    <button
      onClick={() => onClick(mode)}
      style={{
        padding: '6px 14px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.05em',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: active ? colors.primary : 'transparent',
        color: active ? colors.textInverse : colors.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {mode}
    </button>
  );
};
