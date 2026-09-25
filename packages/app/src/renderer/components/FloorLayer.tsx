import React from 'react';
import { Floor, RackObject, WarehouseObject } from '@waresync/core';
import { colors } from '../../design-system/tokens';
import { RackMesh } from './RackMesh';

interface FloorLayerProps {
  floor: Floor;
  isGhosted?: boolean;
  selectedObjectId?: string | null;
  onSelectObject?: (id: string) => void;
}

export const FloorLayer: React.FC<FloorLayerProps> = ({
  floor,
  isGhosted = false,
  selectedObjectId,
  onSelectObject,
}) => {
  const [dimX, dimZ] = floor.dimensions;
  const floorY = floor.elevationMeters;

  const opacity = isGhosted ? 0.25 : 1.0;

  return (
    <group position={[0, floorY, 0]}>
      {/* Floor Concrete Slab */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[dimX, 0.1, dimZ]} />
        <meshStandardMaterial
          color={colors.materialFloor}
          roughness={0.8}
          transparent={isGhosted}
          opacity={opacity}
        />
      </mesh>

      {/* Grid Floor Lines (Engineering grid, 2m interval) */}
      <gridHelper
        args={[dimX, dimX / 2, '#9AA5AE', '#C5CCD1']}
        position={[0, 0.005, 0]}
      />

      {/* Warehouse Objects on this floor */}
      {floor.objects.map((obj) => {
        if (obj.type === 'rack') {
          return (
            <RackMesh
              key={obj.id}
              rack={obj as RackObject}
              isSelected={selectedObjectId === obj.id}
              onSelect={() => onSelectObject && onSelectObject(obj.id)}
            />
          );
        }

        if (obj.type === 'charger') {
          const isSelected = selectedObjectId === obj.id;
          return (
            <group
              key={obj.id}
              position={obj.position}
              onClick={(e) => {
                e.stopPropagation();
                onSelectObject && onSelectObject(obj.id);
              }}
            >
              <mesh position={[0, 0.75, 0]}>
                <boxGeometry args={[1.0, 1.5, 0.8]} />
                <meshStandardMaterial
                  color={isSelected ? colors.primary : '#48525A'}
                />
              </mesh>
              {/* Charging Cable / Pad indicator */}
              <mesh position={[0, 0.02, 0.8]}>
                <cylinderGeometry args={[0.3, 0.3, 0.04, 16]} />
                <meshBasicMaterial color={colors.info} />
              </mesh>
            </group>
          );
        }

        if (obj.type === 'loading_dock' || obj.type === 'packing_station') {
          const isSelected = selectedObjectId === obj.id;
          return (
            <group
              key={obj.id}
              position={obj.position}
              onClick={(e) => {
                e.stopPropagation();
                onSelectObject && onSelectObject(obj.id);
              }}
            >
              <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={obj.dimensions} />
                <meshStandardMaterial
                  color={isSelected ? colors.primary : '#6B757F'}
                />
              </mesh>
              {/* Station outline */}
              <mesh position={[0, 0.01, 0]}>
                <planeGeometry args={[obj.dimensions[0] + 0.4, obj.dimensions[2] + 0.4]} />
                <meshBasicMaterial color="#A4ADB5" transparent opacity={0.3} />
              </mesh>
            </group>
          );
        }

        return null;
      })}
    </group>
  );
};
