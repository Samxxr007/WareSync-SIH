/**
 * DragOverlay — renders a ghost preview mesh at the cursor's world-space
 * position while the operator drags a toolbox item onto the 3D canvas.
 * The ghost is a semi-transparent box matching the dragged object's footprint.
 */
import React from 'react';
import { useUIStore } from '../../store/uiStore';

/** Footprints in [w, h, d] metres per object type */
const FOOTPRINTS: Record<string, [number, number, number]> = {
  rack: [2.4, 1.8, 0.9],
  amr: [0.6, 0.4, 0.6],
  elevator: [2, 3, 2],
  charger: [0.5, 0.3, 0.5],
  workstation: [1.2, 0.9, 0.8],
  zone: [4, 0.05, 4],
};

interface DragOverlayProps {
  /** World-space position where the ghost should appear */
  ghostPosition: [number, number, number] | null;
}

/**
 * Renders a 3D ghost mesh inside the R3F scene.
 * Mount this component inside the <Canvas> when `ghostPosition` is non-null.
 */
export const DragOverlay3D: React.FC<DragOverlayProps> = ({ ghostPosition }) => {
  const { dragItem } = useUIStore();

  if (!ghostPosition || !dragItem) return null;

  const [w, h, d] = FOOTPRINTS[dragItem.type] ?? [1, 1, 1];

  return (
    <mesh position={ghostPosition}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color="#1769AA"
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </mesh>
  );
};

/**
 * HTML-layer drag overlay — a small floating chip that follows the mouse
 * outside the canvas (e.g., while the cursor is still over the toolbox).
 */
export const DragOverlayHtml: React.FC = () => {
  const { dragItem, dragPosition } = useUIStore();

  if (!dragItem || !dragPosition) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: dragPosition.x + 12,
        top: dragPosition.y + 12,
        background: '#1769AA',
        color: '#fff',
        fontSize: '11px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: '3px',
        pointerEvents: 'none',
        zIndex: 9999,
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        opacity: 0.9,
        letterSpacing: '0.03em',
      }}
    >
      + {dragItem.label}
    </div>
  );
};
