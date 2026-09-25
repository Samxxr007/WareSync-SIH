import React, { useMemo } from 'react';
import * as THREE from 'three';
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
    <group>
      {/* Floor Concrete Slab */}
      <mesh position={[0, floorY - 0.05, 0]} receiveShadow>
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
        position={[0, floorY + 0.005, 0]}
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
              {/* Charging pylon base */}
              <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.35, 0.45, 0.2, 8]} />
                <meshStandardMaterial color={isSelected ? colors.primary : '#2B3238'} />
              </mesh>
              {/* Charging pylon pole */}
              <mesh position={[0, 0.8, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 1.2, 8]} />
                <meshStandardMaterial color={isSelected ? colors.primary : '#3A4550'} metalness={0.6} roughness={0.4} />
              </mesh>
              {/* Charging head box */}
              <mesh position={[0, 1.55, 0]}>
                <boxGeometry args={[0.55, 0.55, 0.3]} />
                <meshStandardMaterial color={isSelected ? colors.primary : '#1D6FA4'} />
              </mesh>
              {/* Charging indicator LED */}
              <mesh position={[0, 1.55, 0.16]}>
                <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
                <meshBasicMaterial color={colors.info} />
              </mesh>
              {/* Cable/plug dangling */}
              <mesh position={[0.3, 1.1, 0]} rotation={[0, 0, Math.PI / 4]}>
                <cylinderGeometry args={[0.025, 0.025, 0.8, 8]} />
                <meshStandardMaterial color="#1A1E22" />
              </mesh>
            </group>
          );
        }

        if (obj.type === 'elevator') {
          const isSelected = selectedObjectId === obj.id;
          // Clean floor landing zone indicator for elevator threshold
          return (
            <group
              key={`static_${obj.id}_${obj.floorId}`}
              position={obj.position}
              onClick={(e) => {
                e.stopPropagation();
                onSelectObject && onSelectObject(obj.id);
              }}
            >
              {/* Shaft threshold floor indicator */}
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[3.2, 0.02, 3.2]} />
                <meshBasicMaterial color={isSelected ? colors.primary : '#C88900'} transparent opacity={0.3} />
              </mesh>
              {/* Floor boundary border */}
              <lineSegments position={[0, 0.02, 0]}>
                <edgesGeometry args={[new THREE.BoxGeometry(3.2, 0.02, 3.2)]} />
                <lineBasicMaterial color={isSelected ? colors.primary : '#C88900'} />
              </lineSegments>
            </group>
          );
        }

        if (obj.type === 'loading_dock') {
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
              {/* Dock platform */}
              <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[obj.dimensions[0], 0.6, obj.dimensions[2]]} />
                <meshStandardMaterial color={isSelected ? colors.primary : '#4A5560'} roughness={0.7} />
              </mesh>
              {/* Dock bumper strips (yellow) */}
              <mesh position={[0, 0.62, 0]}>
                <boxGeometry args={[obj.dimensions[0] + 0.1, 0.04, obj.dimensions[2] + 0.1]} />
                <meshBasicMaterial color="#C88900" />
              </mesh>
              {/* Dock door frame */}
              <mesh position={[0, 1.2, -obj.dimensions[2] / 2]}>
                <boxGeometry args={[obj.dimensions[0] * 0.8, 1.8, 0.1]} />
                <meshStandardMaterial color={isSelected ? colors.primary : '#3A4148'} />
              </mesh>
            </group>
          );
        }

        if (obj.type === 'packing_station') {
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
              {/* Station work surface */}
              <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[obj.dimensions[0], 1.0, obj.dimensions[2]]} />
                <meshStandardMaterial color={isSelected ? colors.primary : '#5A6874'} roughness={0.6} />
              </mesh>
              {/* Station label strip (green) */}
              <mesh position={[0, 1.02, 0]}>
                <boxGeometry args={[obj.dimensions[0], 0.04, obj.dimensions[2]]} />
                <meshBasicMaterial color={isSelected ? colors.primary : colors.success} />
              </mesh>
              {/* Conveyor rollers */}
              {[-0.5, 0, 0.5].map((x) => (
                <mesh key={`roller_${x}`} position={[x, 1.08, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.06, 0.06, obj.dimensions[2] * 0.8, 8]} />
                  <meshStandardMaterial color="#8A949C" metalness={0.5} />
                </mesh>
              ))}
            </group>
          );
        }

        if (obj.type === 'obstacle') {
          const isSelected = selectedObjectId === obj.id;
          return (
            <group key={obj.id} position={obj.position}>
              {/* Obstacle base with warning coloring */}
              <mesh position={[0, obj.dimensions[1] / 2, 0]}>
                <boxGeometry args={obj.dimensions} />
                <meshStandardMaterial color={isSelected ? colors.primary : colors.critical} roughness={0.7} transparent opacity={0.75} />
              </mesh>
              {/* Warning stripes on top */}
              <mesh position={[0, obj.dimensions[1] + 0.01, 0]}>
                <boxGeometry args={[obj.dimensions[0], 0.02, obj.dimensions[2]]} />
                <meshBasicMaterial color="#F5A623" />
              </mesh>
            </group>
          );
        }

        if (obj.type === 'forklift') {
          const isSelected = selectedObjectId === obj.id;
          return (
            <group key={obj.id} position={obj.position} onClick={(e) => { e.stopPropagation(); onSelectObject && onSelectObject(obj.id); }}>
              {/* Forklift chassis */}
              <mesh position={[0, 0.4, 0]}>
                <boxGeometry args={[1.2, 0.6, 2.0]} />
                <meshStandardMaterial color={isSelected ? colors.primary : '#E5A910'} metalness={0.4} roughness={0.5} />
              </mesh>
              {/* Cab cage */}
              <mesh position={[0, 1.2, -0.2]}>
                <boxGeometry args={[1.0, 1.0, 1.1]} />
                <meshStandardMaterial color="#2B3238" transparent opacity={0.6} />
              </mesh>
              {/* Mast & Forks */}
              <mesh position={[0, 1.1, 1.05]}>
                <boxGeometry args={[0.7, 1.8, 0.08]} />
                <meshStandardMaterial color="#4A5560" />
              </mesh>
              <mesh position={[0, 0.08, 1.45]}>
                <boxGeometry args={[0.6, 0.06, 0.8]} />
                <meshStandardMaterial color="#2B3238" />
              </mesh>
            </group>
          );
        }

        if (obj.type === 'human') {
          const isSelected = selectedObjectId === obj.id;
          return (
            <group key={obj.id} position={obj.position} onClick={(e) => { e.stopPropagation(); onSelectObject && onSelectObject(obj.id); }}>
              {/* High-visibility vest torso */}
              <mesh position={[0, 1.05, 0]}>
                <boxGeometry args={[0.45, 0.55, 0.28]} />
                <meshStandardMaterial color={isSelected ? colors.primary : '#FF7A00'} />
              </mesh>
              {/* Head with safety helmet */}
              <mesh position={[0, 1.55, 0]}>
                <sphereGeometry args={[0.18, 16, 16]} />
                <meshStandardMaterial color="#F4B400" />
              </mesh>
              {/* Legs */}
              <mesh position={[-0.12, 0.4, 0]}>
                <boxGeometry args={[0.16, 0.75, 0.2]} />
                <meshStandardMaterial color="#2B3A4A" />
              </mesh>
              <mesh position={[0.12, 0.4, 0]}>
                <boxGeometry args={[0.16, 0.75, 0.2]} />
                <meshStandardMaterial color="#2B3A4A" />
              </mesh>
            </group>
          );
        }

        if (obj.type === 'aisle') {
          return (
            <group key={obj.id} position={obj.position}>
              <mesh position={[0, 0.01, 0]}>
                <planeGeometry args={[obj.dimensions?.[0] || 3, obj.dimensions?.[2] || 6]} />
                <meshBasicMaterial color="#E2E7EC" transparent opacity={0.6} />
              </mesh>
            </group>
          );
        }

        // Generic visible industrial module for any other custom component
        const isSelected = selectedObjectId === obj.id;
        const dims = (obj as any).dimensions || [1.5, 1.0, 1.5];
        return (
          <group key={obj.id} position={obj.position} onClick={(e) => { e.stopPropagation(); onSelectObject && onSelectObject(obj.id); }}>
            <mesh position={[0, dims[1] / 2, 0]}>
              <boxGeometry args={dims} />
              <meshStandardMaterial color={isSelected ? colors.primary : '#7A8894'} roughness={0.6} />
            </mesh>
          </group>
        );
      })}

    </group>
  );
};
