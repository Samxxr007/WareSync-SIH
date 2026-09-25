/**
 * HoverTooltip — renders a Drei <Html> tooltip above a hovered 3D object.
 * Usage: mount inside the hovered mesh's group with position above the object.
 */
import React from 'react';
import { Html } from '@react-three/drei';

export interface TooltipLine {
  label: string;
  value: string | number;
}

interface HoverTooltipProps {
  title: string;
  lines?: TooltipLine[];
  /** world-space Y offset above the object centre */
  yOffset?: number;
  visible?: boolean;
}

export const HoverTooltip: React.FC<HoverTooltipProps> = ({
  title,
  lines = [],
  yOffset = 1.4,
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <Html
      center
      position={[0, yOffset, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        style={{
          background: '#1B2229',
          border: '1px solid #3D4852',
          borderRadius: '3px',
          padding: '6px 10px',
          minWidth: '120px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#E8ECF0',
            marginBottom: lines.length > 0 ? '4px' : 0,
            letterSpacing: '0.03em',
          }}
        >
          {title}
        </div>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '10px',
              color: '#8A9BA8',
              lineHeight: '1.5',
            }}
          >
            <span>{l.label}</span>
            <span style={{ color: '#C5CDD5', fontFamily: 'IBM Plex Mono, monospace' }}>
              {l.value}
            </span>
          </div>
        ))}
      </div>
    </Html>
  );
};

export default HoverTooltip;
