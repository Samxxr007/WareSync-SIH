import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { compileWarehouse, snapPoint3D } from '@waresync/core';
import { useWarehouseStore } from '../store/warehouseStore';
import { useSimulationStore } from '../store/simulationStore';
import { useSelectionStore } from '../store/selectionStore';
import { useUIStore } from '../store/uiStore';
import { useCompilerStore } from '../store/compilerStore';
import { FloorLayer } from './components/FloorLayer';
import { AMRMesh } from './components/AMRMesh';
import { ElevatorMesh } from './components/ElevatorMesh';
import { RoutePaths } from './components/RoutePaths';
import { ZoneOverlay } from './components/ZoneOverlay';
import { CameraControls, CameraPreset } from './components/CameraControls';
import { DragOverlay3D } from '../ui/designer/DragOverlay';
import { AlignmentGuides } from '../ui/designer/AlignmentGuides';
import { buildDefaultObject } from '../ui/designer/defaultObjects';
import { colors } from '../design-system/tokens';

const SceneRaycasterBridge: React.FC<{
  onUpdate: (state: { camera: THREE.Camera }) => void;
}> = ({ onUpdate }) => {
  const { camera } = useThree();
  useEffect(() => {
    onUpdate({ camera });
  }, [camera, onUpdate]);
  return null;
};


export const WarehouseScene: React.FC = () => {
  const { model, activeFloorId, setActiveFloorId, addObject } = useWarehouseStore();
  const { currentFrame } = useSimulationStore();
  const { selectedObjectId, setSelectedObjectId } = useSelectionStore();
  const {
    isolatedFloorId,
    setIsolatedFloorId,
    ghostInactiveFloors,
    setGhostInactiveFloors,
    dragItem,
    setDragItem,
    setDragPosition,
  } = useUIStore();
  const { setResult: setCompilerResult } = useCompilerStore();

  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('RESET');
  const [ghostPosition, setGhostPosition] = useState<[number, number, number] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const bridgeRef = useRef<{ camera: THREE.Camera } | null>(null);

  const activeFloor = model.floors.find((f) => f.id === activeFloorId) || model.floors[0];
  const floorElevation = activeFloor?.elevationMeters || 0;

  const handleBridgeUpdate = useCallback((state: { camera: THREE.Camera }) => {
    bridgeRef.current = state;
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    if (!bridgeRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Use a fresh standalone raycaster — R3F's managed one doesn't work during HTML5 drag events
    const manualRaycaster = new THREE.Raycaster();
    manualRaycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), bridgeRef.current.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorElevation);
    const target = new THREE.Vector3();
    const hit = manualRaycaster.ray.intersectPlane(plane, target);

    if (hit) {
      const snapped = snapPoint3D({ x: target.x, y: floorElevation, z: target.z }, 0.5);
      setGhostPosition([snapped.x, floorElevation, snapped.z]);
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };


  const handleDragLeave = () => {
    setGhostPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    let itemType = '';
    try {
      const raw = e.dataTransfer.getData('application/waresync-item');
      if (raw) {
        const parsed = JSON.parse(raw);
        itemType = parsed.type;
      }
    } catch {
      // Fallback
    }

    if (!itemType) {
      itemType = e.dataTransfer.getData('text/plain') || dragItem?.type || 'rack';
    }

    const pos = ghostPosition || [-6, floorElevation, 4];
    const newObj = buildDefaultObject(itemType, activeFloorId, pos);

    addObject(activeFloorId, newObj);
    setSelectedObjectId(newObj.id);

    try {
      const compiled = compileWarehouse(useWarehouseStore.getState().model);
      setCompilerResult(compiled);
    } catch (err) {
      console.warn('[WarehouseScene] Auto-compilation notice:', err);
    }

    setGhostPosition(null);
    setDragItem(null);
    setDragPosition(null);
  };

  // Extract zones from active floor for ZoneOverlay
  const currentZones: any[] = (activeFloor?.objects || [])
    .filter((o) => ['hazard_zone', 'fire_zone', 'human_zone', 'restricted_zone'].includes(o.type))
    .map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type.replace('_zone', ''),
      bounds: {
        min: { x: o.position[0] - o.dimensions[0] / 2, z: o.position[2] - o.dimensions[2] / 2 },
        max: { x: o.position[0] + o.dimensions[0] / 2, z: o.position[2] + o.dimensions[2] / 2 },
      },
    }));

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: colors.bgWorkspace }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Viewport Control Bar Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          zIndex: 10,
          display: 'flex',
          gap: 6,
          backgroundColor: '#FFFFFFEE',
          padding: '4px 8px',
          borderRadius: '4px',
          border: `1px solid ${colors.borderLight}`,
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, color: colors.textSecondary, alignSelf: 'center', marginRight: 4 }}>
          CAMERA:
        </span>
        {(['ISOMETRIC', 'TOP', 'FLOOR', 'RESET'] as CameraPreset[]).map((p) => (
          <button
            key={p}
            onClick={() => setCameraPreset(p)}
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 600,
              backgroundColor: cameraPreset === p ? colors.bgHover : 'transparent',
              borderColor: cameraPreset === p ? colors.borderStrong : colors.borderLight,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Floor Visibility Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          zIndex: 10,
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          backgroundColor: '#FFFFFFEE',
          padding: '4px 8px',
          borderRadius: '4px',
          border: `1px solid ${colors.borderLight}`,
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, color: colors.textSecondary, marginRight: 4 }}>
          FLOORS:
        </span>
        {model.floors.map((f, idx) => {
          const isIsolated = isolatedFloorId === f.id;
          return (
            <button
              key={f.id}
              onClick={() => {
                if (isolatedFloorId === f.id) {
                  setIsolatedFloorId(null);
                } else {
                  setIsolatedFloorId(f.id);
                  setActiveFloorId(f.id);
                }
              }}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: "'IBM Plex Mono', monospace",
                backgroundColor: isIsolated ? colors.primary : 'transparent',
                color: isIsolated ? colors.textInverse : colors.textPrimary,
                borderColor: isIsolated ? colors.primary : colors.borderLight,
              }}
              title={`Isolate Floor ${idx + 1}`}
            >
              F{idx + 1}
            </button>
          );
        })}
        <button
          onClick={() => setGhostInactiveFloors(!ghostInactiveFloors)}
          style={{
            padding: '3px 8px',
            fontSize: '10px',
            fontWeight: 600,
            backgroundColor: ghostInactiveFloors ? colors.bgActive : 'transparent',
            borderColor: colors.borderLight,
          }}
          title="Toggle ghosting of inactive floors"
        >
          GHOST: {ghostInactiveFloors ? 'ON' : 'OFF'}
        </button>
      </div>

      <Canvas
        camera={{ position: [28, 22, 28], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelectedObjectId(null)}
      >
        <SceneRaycasterBridge onUpdate={handleBridgeUpdate} />
        <CameraControls preset={cameraPreset} />

        {/* Ambient & Directional Industrial Lighting */}
        <ambientLight intensity={0.85} />
        <directionalLight position={[20, 40, 20]} intensity={1.1} castShadow />
        <directionalLight position={[-20, 25, -20]} intensity={0.4} />

        {/* Floors */}
        {model.floors.map((floor) => {
          const isGhosted = isolatedFloorId ? floor.id !== isolatedFloorId : false;
          if (isolatedFloorId && floor.id !== isolatedFloorId && !ghostInactiveFloors) {
            return null;
          }
          return (
            <FloorLayer
              key={floor.id}
              floor={floor}
              isGhosted={isGhosted}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
            />
          );
        })}

        {/* Zone Overlays */}
        <ZoneOverlay zones={currentZones} floorY={floorElevation + 0.02} />

        {/* 3D Drag Ghost & Guides */}
        <DragOverlay3D ghostPosition={ghostPosition} />
        {ghostPosition && (
          <AlignmentGuides
            guides={[
              { axis: 'x', value: ghostPosition[0] },
              { axis: 'z', value: ghostPosition[2] },
            ]}
            y={floorElevation + 0.04}
          />
        )}

        {/* Elevator Shafts */}
        {currentFrame?.elevators.map((elev) => {
          const conn = model.connections.find((c) => c.id === elev.id);
          const pos = conn?.entryNodesByFloor['floor-1'] || [0, 0, 0];
          return (
            <ElevatorMesh
              key={elev.id}
              elevator={elev}
              position={pos}
              isSelected={selectedObjectId === elev.id}
              onSelect={() => setSelectedObjectId(elev.id)}
            />
          );
        })}

        {/* Route Paths */}
        {currentFrame && (
          <RoutePaths
            robots={currentFrame.robots}
            navGraphNodes={useSimulationStore.getState().currentFrame?.robots ? {} : {}}
          />
        )}

        {/* AMRs */}
        {currentFrame?.robots.map((robot) => (
          <AMRMesh
            key={robot.id}
            robot={robot}
            isSelected={selectedObjectId === robot.id}
            onSelect={() => setSelectedObjectId(robot.id)}
          />
        ))}
      </Canvas>
    </div>
  );
};

export default WarehouseScene;
