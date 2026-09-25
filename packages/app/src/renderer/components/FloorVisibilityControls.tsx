/**
 * FloorVisibilityControls — a floating 2D overlay (rendered via Drei <Html>)
 * that lets the operator toggle individual floor slabs visible / ghosted.
 * Rendered inside the R3F Canvas so it can be positioned near the scene.
 */
import React from 'react';
import { Html } from '@react-three/drei';
import { useUIStore } from '../../store/uiStore';

interface FloorVisibilityControlsProps {
  floors: Array<{ id: string; level: number; name?: string }>;
  /** Canvas-space position anchor */
  position?: [number, number, number];
}

export const FloorVisibilityControls: React.FC<FloorVisibilityControlsProps> = ({
  floors,
  position = [-6, 4, 0],
}) => {
  const { visibleFloors, toggleFloorVisibility, isBooting } = useUIStore();
  if (isBooting) return null;

  return (
    <Html position={position} style={{ pointerEvents: 'auto' }}>
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #D5DADE',
          borderRadius: '3px',
          padding: '8px 10px',
          fontFamily: 'Inter, sans-serif',
          minWidth: '110px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#5E6B78',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '6px',
          }}
        >
          Floors
        </div>
        {floors
          .slice()
          .sort((a, b) => b.level - a.level)
          .map((floor) => {
            const isVisible = visibleFloors.has(floor.id);
            return (
              <label
                key={floor.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: isVisible ? '#1B2229' : '#8A9BA8',
                  marginBottom: '4px',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => toggleFloorVisibility(floor.id)}
                  style={{ accentColor: '#1769AA', cursor: 'pointer' }}
                />
                {floor.name ?? `Floor ${floor.level}`}
              </label>
            );
          })}
      </div>
    </Html>
  );
};

export default FloorVisibilityControls;
