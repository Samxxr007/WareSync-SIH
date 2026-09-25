import React from 'react';
import { Copy, Lock, RotateCw, Trash2, Unlock } from 'lucide-react';
import { useSelectionStore } from '../../store/selectionStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSimulationStore } from '../../store/simulationStore';
import { PropertyRow, PropertySection } from '../../design-system/components/PropertyRow';
import { RackInspector } from './inspectors/RackInspector';
import { AMRInspector } from './inspectors/AMRInspector';
import { ElevatorInspector } from './inspectors/ElevatorInspector';
import { ChargerInspector } from './inspectors/ChargerInspector';
import { colors } from '../../design-system/tokens';
import {
  AMRObject,
  ChargerObject,
  ElevatorObject,
  findObjectById,
  RackObject,
  WarehouseObject,
} from '@waresync/core';

export const InspectorPanel: React.FC = () => {
  const { selectedObjectId, setSelectedObjectId } = useSelectionStore();
  const { model, updateObject, removeObject, addObject, activeFloorId } = useWarehouseStore();
  const { currentFrame } = useSimulationStore();

  if (!selectedObjectId) {
    const totalAMRs = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'amr')).length;
    const totalRacks = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'rack')).length;
    const totalChargers = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'charger')).length;

    return (
      <div
        style={{
          width: 270,
          backgroundColor: colors.bgPanel,
          borderLeft: `1px solid ${colors.borderLight}`,
          padding: '16px 12px',
          overflowY: 'auto',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: 8 }}>
          PROPERTY INSPECTOR
        </div>
        <p style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: 16 }}>
          Select an entity in the 3D facility workspace or fleet list to configure physical properties and constraints.
        </p>

        <PropertySection title="FACILITY OVERVIEW">
          <PropertyRow label="Facility ID" value={model.id} mono />
          <PropertyRow label="Active Floors" value={model.floors.length} />
          <PropertyRow label="AMR Units" value={totalAMRs} />
          <PropertyRow label="Storage Racks" value={totalRacks} />
          <PropertyRow label="Fast Chargers" value={totalChargers} />
          <PropertyRow
            label="Elevator Shafts"
            value={model.connections.filter((c) => c.type === 'ELEVATOR').length}
          />
        </PropertySection>

        <PropertySection title="INTERACTION HINTS">
          <div style={{ fontSize: '11px', color: colors.textSecondary, lineHeight: 1.5 }}>
            • Click any rack, robot, charger, or station to inspect.<br />
            • In Designer mode, adjust dimensions & capabilities.<br />
            • Use Rotate, Duplicate, and Lock to manipulate facility layout.
          </div>
        </PropertySection>
      </div>
    );
  }

  const found = findObjectById(model, selectedObjectId);
  const liveRobot = currentFrame?.robots.find((r) => r.id === selectedObjectId);
  const liveElev = currentFrame?.elevators.find((e) => e.id === selectedObjectId);
  const liveCharger = currentFrame?.chargers.find((c) => c.id === selectedObjectId);

  if (!found && !liveRobot && !liveElev) {
    return (
      <div style={{ width: 270, padding: 12, backgroundColor: colors.bgPanel }}>
        <span style={{ color: colors.textMuted }}>Selected entity no longer exists.</span>
      </div>
    );
  }

  const obj = found?.object;
  const floor = found?.floor;

  // Actions
  const handleRotate = () => {
    if (!obj) return;
    const currentRotY = obj.rotation[1];
    const newRotY = (currentRotY + Math.PI / 2) % (Math.PI * 2);
    updateObject(obj.id, { rotation: [obj.rotation[0], newRotY, obj.rotation[2]] });
  };

  const handleDuplicate = () => {
    if (!obj) return;
    const newId = `${obj.type.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const cloned: WarehouseObject = {
      ...JSON.parse(JSON.stringify(obj)),
      id: newId,
      name: `${obj.name} (Copy)`,
      position: [obj.position[0] + 2, obj.position[1], obj.position[2] + 2],
    };
    addObject(obj.floorId, cloned);
    setSelectedObjectId(newId);
  };

  const handleToggleLock = () => {
    if (!obj) return;
    updateObject(obj.id, { locked: !obj.locked });
  };

  const handleDelete = () => {
    if (!obj) return;
    removeObject(obj.id);
    setSelectedObjectId(null);
  };

  return (
    <div
      style={{
        width: 270,
        backgroundColor: colors.bgPanel,
        borderLeft: `1px solid ${colors.borderLight}`,
        padding: '12px',
        overflowY: 'auto',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: `1px solid ${colors.borderLight}`,
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: colors.textPrimary }}>
            {obj?.name || liveRobot?.id || liveElev?.id}
          </div>
          <div style={{ fontSize: '10px', color: colors.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
            ID: {selectedObjectId}
          </div>
        </div>
        <button
          onClick={() => setSelectedObjectId(null)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.textMuted, fontSize: '14px' }}
        >
          ✕
        </button>
      </div>

      {/* Action Toolbar for Manipulating Selected Object */}
      {obj && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          <button
            onClick={handleRotate}
            title="Rotate 90 degrees"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px', fontSize: '11px' }}
          >
            <RotateCw size={12} /> Rotate
          </button>
          <button
            onClick={handleDuplicate}
            title="Duplicate object"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px', fontSize: '11px' }}
          >
            <Copy size={12} /> Clone
          </button>
          <button
            onClick={handleToggleLock}
            title={obj.locked ? 'Unlock object' : 'Lock object in place'}
            style={{
              padding: '5px 8px',
              fontSize: '11px',
              backgroundColor: obj.locked ? colors.bgActive : 'transparent',
            }}
          >
            {obj.locked ? <Lock size={12} color={colors.warning} /> : <Unlock size={12} />}
          </button>
        </div>
      )}

      {/* SPECIFIC INSPECTOR PER TYPE */}
      {obj?.type === 'rack' && (
        <RackInspector
          rack={obj as RackObject}
          floorName={floor?.name || obj.floorId}
          onUpdate={(updates) => updateObject(obj.id, updates)}
        />
      )}

      {(obj?.type === 'amr' || liveRobot) && (
        <AMRInspector
          robotSpec={(obj as AMRObject) || { id: liveRobot?.id, capabilities: ['STANDARD_RETRIEVAL'] }}
          liveRobotState={liveRobot}
          onUpdate={(updates) => obj && updateObject(obj.id, updates)}
        />
      )}

      {(obj?.type === 'elevator' || liveElev) && (
        <ElevatorInspector
          elevatorSpec={(obj as ElevatorObject) || { id: liveElev?.id }}
          model={model}
          liveElevatorState={liveElev}
          onUpdate={(updates) => obj && updateObject(obj.id, updates)}
        />
      )}

      {(obj?.type === 'charger' || liveCharger) && (
        <ChargerInspector
          chargerSpec={(obj as ChargerObject) || { id: liveCharger?.id }}
          liveChargerState={liveCharger}
          onUpdate={(updates) => obj && updateObject(obj.id, updates)}
        />
      )}

      {/* Delete Entity Button */}
      {obj && (
        <div style={{ marginTop: 'auto', paddingTop: 14 }}>
          <button
            onClick={handleDelete}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px',
              color: colors.critical,
              borderColor: `${colors.critical}44`,
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <Trash2 size={13} /> DELETE FROM FACILITY
          </button>
        </div>
      )}
    </div>
  );
};
