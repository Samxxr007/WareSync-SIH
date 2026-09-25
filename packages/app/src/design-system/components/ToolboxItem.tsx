import React from 'react';
import { colors } from '../tokens';

interface ToolboxItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onClick?: () => void;
}

export const ToolboxItem: React.FC<ToolboxItemProps> = ({
  id,
  label,
  icon,
  onDragStart,
  onClick,
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, id)}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        marginBottom: 4,
        backgroundColor: colors.bgPanel,
        border: `1px solid ${colors.borderLight}`,
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        color: colors.textPrimary,
        cursor: 'grab',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.bgHover;
        e.currentTarget.style.borderColor = colors.borderStrong;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.bgPanel;
        e.currentTarget.style.borderColor = colors.borderLight;
      }}
    >
      <span style={{ color: colors.textSecondary, display: 'flex' }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
};
