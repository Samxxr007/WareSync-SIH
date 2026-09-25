/**
 * DropHandler — invisible R3F plane that intercepts pointer events on the
 * canvas floor and resolves drop position via raycasting.
 *
 * Usage: mount inside <Canvas> during a drag operation. On pointer-up it
 * calls onDrop with the snapped world-space position so the caller can add
 * the new object to the warehouse store.
 */
import React, { useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { snapPoint3D } from '@waresync/core';

interface DropHandlerProps {
  /** Grid cell size in metres (default 0.5 m) */
  gridSize?: number;
  /** Floor Y height to place the drop-plane at */
  floorY?: number;
  /** Called with the snapped world-space XZ position + hit normal */
  onDrop: (position: { x: number; y: number; z: number }) => void;
  /** Called when pointer moves over the drop plane (for ghost preview) */
  onHover?: (position: { x: number; y: number; z: number }) => void;
  /** Whether the drop plane is active */
  active?: boolean;
}

export const DropHandler: React.FC<DropHandlerProps> = ({
  gridSize = 0.5,
  floorY = 0,
  onDrop,
  onHover,
  active = true,
}) => {
  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!onHover) return;
      const snapped = snapPoint3D([e.point.x, floorY, e.point.z], gridSize);
      onHover({ x: snapped[0], y: snapped[1], z: snapped[2] });
    },
    [gridSize, floorY, onHover],
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const snapped = snapPoint3D([e.point.x, floorY, e.point.z], gridSize);
      onDrop({ x: snapped[0], y: snapped[1], z: snapped[2] });
    },
    [gridSize, floorY, onDrop],
  );

  if (!active) return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, floorY + 0.001, 0]}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      visible={false}
    >
      {/* Large invisible plane to catch raycasts */}
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
};

export default DropHandler;
