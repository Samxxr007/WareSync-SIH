import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ElevatorSimulationState } from '@waresync/core';
import { colors } from '../../design-system/tokens';

interface ElevatorMeshProps {
  elevator: ElevatorSimulationState;
  position: [number, number, number];
  isSelected?: boolean;
  onSelect?: () => void;
}

export const ElevatorMesh: React.FC<ElevatorMeshProps> = ({
  elevator,
  position,
  isSelected,
  onSelect,
}) => {
  const cabRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!cabRef.current) return;
    cabRef.current.position.y = THREE.MathUtils.lerp(
      cabRef.current.position.y,
      elevator.currentHeightMeters,
      Math.min(1.0, delta * 8)
    );
  });

  return (
    <group
      position={[position[0], 0, position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect && onSelect();
      }}
    >
      {/* 4 Vertical Shaft Guide Columns (15m high) */}
      {[-1.5, 1.5].map((x) =>
        [-1.5, 1.5].map((z) => (
          <mesh key={`col_${x}_${z}`} position={[x, 7.5, z]}>
            <boxGeometry args={[0.1, 15, 0.1]} />
            <meshStandardMaterial color={colors.materialElevatorShaft} />
          </mesh>
        ))
      )}

      {/* Moving Elevator Cab */}
      <group ref={cabRef} position={[0, elevator.currentHeightMeters, 0]}>
        {/* Floor platform */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[2.8, 0.1, 2.8]} />
          <meshStandardMaterial
            color={isSelected ? colors.primary : '#454C54'}
            roughness={0.7}
          />
        </mesh>

        {/* Side walls */}
        <mesh position={[-1.35, 1.2, 0]}>
          <boxGeometry args={[0.05, 2.3, 2.8]} />
          <meshStandardMaterial color="#3A4148" transparent opacity={0.6} />
        </mesh>
        <mesh position={[1.35, 1.2, 0]}>
          <boxGeometry args={[0.05, 2.3, 2.8]} />
          <meshStandardMaterial color="#3A4148" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 1.2, -1.35]}>
          <boxGeometry args={[2.8, 2.3, 0.05]} />
          <meshStandardMaterial color="#3A4148" transparent opacity={0.6} />
        </mesh>

        {/* Small top ceiling with status light */}
        <mesh position={[0, 2.35, 0]}>
          <boxGeometry args={[2.8, 0.05, 2.8]} />
          <meshStandardMaterial color="#3A4148" />
        </mesh>

        <mesh position={[0, 2.3, 1.2]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial
            color={elevator.status === 'MOVING' ? colors.warning : colors.success}
          />
        </mesh>
      </group>
    </group>
  );
};
