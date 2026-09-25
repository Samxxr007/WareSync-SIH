import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RobotSimulationState } from '@waresync/core';
import { colors } from '../../design-system/tokens';

interface AMRMeshProps {
  robot: RobotSimulationState;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const AMRMesh: React.FC<AMRMeshProps> = ({
  robot,
  isSelected,
  onSelect,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Smooth lerping towards target position
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = new THREE.Vector3(robot.position[0], robot.position[1] + 0.15, robot.position[2]);
    groupRef.current.position.lerp(target, Math.min(1.0, delta * 12));
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      robot.headingRad,
      Math.min(1.0, delta * 10)
    );
  });

  const getLedColor = () => {
    switch (robot.status) {
      case 'MOVING':
        return colors.success;
      case 'YIELDING':
      case 'WAITING':
        return colors.warning;
      case 'CHARGING':
        return colors.info;
      case 'FAULT':
      case 'EMERGENCY_STOP':
        return colors.critical;
      default:
        return '#8A949C';
    }
  };

  return (
    <group
      ref={groupRef}
      position={[robot.position[0], robot.position[1] + 0.15, robot.position[2]]}
      rotation={[0, robot.headingRad, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect && onSelect();
      }}
    >
      {/* AMR Main Chassis */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.7, 0.22, 0.9]} />
        <meshStandardMaterial
          color={isSelected ? colors.primary : colors.materialRobotBody}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>

      {/* Front direction notch */}
      <mesh position={[0, 0.05, 0.4]}>
        <boxGeometry args={[0.3, 0.1, 0.1]} />
        <meshStandardMaterial color="#2B3238" />
      </mesh>

      {/* Top Payload (if carrying cargo) */}
      {robot.currentPayloadKg > 0 && (
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[0.55, 0.32, 0.65]} />
          <meshStandardMaterial
            color={colors.materialBoxCardboard}
            roughness={0.8}
          />
        </mesh>
      )}

      {/* Small Status LED Indicator */}
      <mesh position={[0, 0.14, -0.3]}>
        <cylinderGeometry args={[0.04, 0.04, 0.04, 16]} />
        <meshBasicMaterial color={getLedColor()} />
      </mesh>

      {/* Left Wheel */}
      <mesh position={[-0.37, -0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 16]} />
        <meshStandardMaterial color="#1C2126" />
      </mesh>

      {/* Right Wheel */}
      <mesh position={[0.37, -0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 16]} />
        <meshStandardMaterial color="#1C2126" />
      </mesh>
    </group>
  );
};
