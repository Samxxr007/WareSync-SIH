import React from 'react';
import * as THREE from 'three';
import { RackObject } from '@waresync/core';
import { colors } from '../../design-system/tokens';

interface RackMeshProps {
  rack: RackObject;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const RackMesh: React.FC<RackMeshProps> = ({
  rack,
  isSelected,
  onSelect,
}) => {
  const [width, height, depth] = rack.dimensions;
  const levels = rack.levels || 4;
  const levelHeight = height / levels;

  return (
    <group
      position={rack.position}
      rotation={rack.rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect && onSelect();
      }}
    >
      {/* 4 Corner Steel Uprights */}
      {[-width / 2, width / 2].map((x) =>
        [-depth / 2, depth / 2].map((z) => (
          <mesh
            key={`upright_${x}_${z}`}
            position={[x, height / 2, z]}
          >
            <boxGeometry args={[0.08, height, 0.08]} />
            <meshStandardMaterial
              color={isSelected ? colors.primary : colors.materialRackSteel}
              roughness={0.6}
            />
          </mesh>
        ))
      )}

      {/* Horizontal Shelves */}
      {Array.from({ length: levels + 1 }).map((_, i) => (
        <mesh
          key={`shelf_${i}`}
          position={[0, i * levelHeight, 0]}
        >
          <boxGeometry args={[width, 0.05, depth]} />
          <meshStandardMaterial
            color={isSelected ? colors.accentSteel : '#5A626A'}
            roughness={0.7}
          />
        </mesh>
      ))}

      {/* Inventory Boxes placed on shelves */}
      {rack.inventory.map((item, idx) => {
        const itemY = (item.level - 1) * levelHeight + 0.2;
        const itemX = -width / 4 + (idx % 2) * (width / 2);
        return (
          <mesh
            key={`inv_${item.sku}_${idx}`}
            position={[itemX, itemY, 0]}
          >
            <boxGeometry args={[0.6, 0.35, 0.5]} />
            <meshStandardMaterial
              color={colors.materialBoxCardboard}
              roughness={0.8}
            />
          </mesh>
        );
      })}

      {/* Subtle selection boundary */}
      {isSelected && (
        <lineSegments position={[0, height / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(width + 0.1, height + 0.1, depth + 0.1)]} />
          <lineBasicMaterial color={colors.primary} linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
};
