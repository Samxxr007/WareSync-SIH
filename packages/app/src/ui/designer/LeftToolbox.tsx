import React from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  Box,
  Flame,
  Footprints,
  GitFork,
  MoveRight,
  ShieldAlert,
  Truck,
  UserCheck,
  Warehouse,
  Zap,
} from 'lucide-react';
import { ToolboxItem } from '../../design-system/components/ToolboxItem';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useUIStore } from '../../store/uiStore';
import { useSelectionStore } from '../../store/selectionStore';
import { buildDefaultObject } from './defaultObjects';
import { colors } from '../../design-system/tokens';

export const LeftToolbox: React.FC = () => {
  const { activeFloorId, addObject } = useWarehouseStore();
  const { setDragItem, setDragPosition } = useUIStore();
  const { setSelectedObjectId } = useSelectionStore();

  const handleDragStart = (e: React.DragEvent, id: string, label: string) => {
    setDragItem({ type: id, label });
    setDragPosition({ x: e.clientX, y: e.clientY });
    e.dataTransfer.setData('application/waresync-item', JSON.stringify({ type: id, label }));
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDragPosition(null);
  };

  const handleAddItem = (type: string) => {
    const newObj = buildDefaultObject(type, activeFloorId, [0, 0, 0]);
    addObject(activeFloorId, newObj);
    setSelectedObjectId(newObj.id);
  };

  return (
    <div
      style={{
        width: 210,
        backgroundColor: colors.bgPanel,
        borderRight: `1px solid ${colors.borderLight}`,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        padding: '10px 8px',
        flexShrink: 0,
        zIndex: 30,
        userSelect: 'none',
      }}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: colors.textSecondary,
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>FACILITY TOOLBOX</span>
        <span style={{ fontSize: '9px', fontWeight: 600, color: colors.primary, backgroundColor: colors.bgHover, padding: '2px 4px', borderRadius: 2 }}>
          DRAG & DROP
        </span>
      </div>

      <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: 10, lineHeight: 1.3 }}>
        Drag components onto the 3D floor or click to place at center.
      </div>

      {/* STRUCTURE */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: colors.textMuted, marginBottom: 4 }}>
          STRUCTURE
        </div>
        <ToolboxItem
          id="rack"
          label="High-Bay Rack"
          category="STRUCTURE"
          icon={<Warehouse size={14} />}
          onDragStart={(e) => handleDragStart(e, 'rack', 'High-Bay Rack')}
          onClick={() => handleAddItem('rack')}
        />
        <ToolboxItem
          id="shelf"
          label="Shelf Unit"
          category="STRUCTURE"
          icon={<Box size={14} />}
          onDragStart={(e) => handleDragStart(e, 'shelf', 'Shelf Unit')}
          onClick={() => handleAddItem('shelf')}
        />
        <ToolboxItem
          id="elevator"
          label="Freight Elevator"
          category="STRUCTURE"
          icon={<Zap size={14} />}
          onDragStart={(e) => handleDragStart(e, 'elevator', 'Freight Elevator')}
          onClick={() => handleAddItem('elevator')}
        />
        <ToolboxItem
          id="aisle"
          label="Corridor / Aisle"
          category="STRUCTURE"
          icon={<MoveRight size={14} />}
          onDragStart={(e) => handleDragStart(e, 'aisle', 'Corridor / Aisle')}
          onClick={() => handleAddItem('aisle')}
        />
      </div>

      {/* LOGISTICS */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: colors.textMuted, marginBottom: 4 }}>
          LOGISTICS & FLEET
        </div>
        <ToolboxItem
          id="amr"
          label="AMR Unit"
          category="LOGISTICS"
          icon={<Truck size={14} />}
          onDragStart={(e) => handleDragStart(e, 'amr', 'AMR Unit')}
          onClick={() => handleAddItem('amr')}
        />
        <ToolboxItem
          id="forklift"
          label="Forklift Vehicle"
          category="LOGISTICS"
          icon={<GitFork size={14} />}
          onDragStart={(e) => handleDragStart(e, 'forklift', 'Forklift Vehicle')}
          onClick={() => handleAddItem('forklift')}
        />
        <ToolboxItem
          id="human"
          label="Worker / Operator"
          category="LOGISTICS"
          icon={<UserCheck size={14} />}
          onDragStart={(e) => handleDragStart(e, 'human', 'Worker / Operator')}
          onClick={() => handleAddItem('human')}
        />
        <ToolboxItem
          id="station"
          label="Packing Station"
          category="LOGISTICS"
          icon={<Box size={14} />}
          onDragStart={(e) => handleDragStart(e, 'station', 'Packing Station')}
          onClick={() => handleAddItem('station')}
        />
      </div>

      {/* RESOURCES */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: colors.textMuted, marginBottom: 4 }}>
          SHARED RESOURCES
        </div>
        <ToolboxItem
          id="charger"
          label="22kW Fast Charger"
          category="RESOURCES"
          icon={<BatteryCharging size={14} />}
          onDragStart={(e) => handleDragStart(e, 'charger', '22kW Fast Charger')}
          onClick={() => handleAddItem('charger')}
        />
        <ToolboxItem
          id="dock"
          label="Loading Dock"
          category="RESOURCES"
          icon={<Truck size={14} />}
          onDragStart={(e) => handleDragStart(e, 'dock', 'Loading Dock')}
          onClick={() => handleAddItem('dock')}
        />
      </div>

      {/* ENVIRONMENT & SAFETY */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: colors.textMuted, marginBottom: 4 }}>
          ENVIRONMENT & SAFETY
        </div>
        <ToolboxItem
          id="obstacle"
          label="Temporary Obstacle"
          category="ENVIRONMENT"
          icon={<AlertTriangle size={14} />}
          onDragStart={(e) => handleDragStart(e, 'obstacle', 'Temporary Obstacle')}
          onClick={() => handleAddItem('obstacle')}
        />
        <ToolboxItem
          id="fire_zone"
          label="Fire / Hazard Zone"
          category="ENVIRONMENT"
          icon={<Flame size={14} />}
          onDragStart={(e) => handleDragStart(e, 'fire_zone', 'Fire / Hazard Zone')}
          onClick={() => handleAddItem('fire_zone')}
        />
        <ToolboxItem
          id="human_zone"
          label="Human-Only Zone"
          category="ENVIRONMENT"
          icon={<Footprints size={14} />}
          onDragStart={(e) => handleDragStart(e, 'human_zone', 'Human-Only Zone')}
          onClick={() => handleAddItem('human_zone')}
        />
        <ToolboxItem
          id="restricted_zone"
          label="Restricted Area"
          category="ENVIRONMENT"
          icon={<ShieldAlert size={14} />}
          onDragStart={(e) => handleDragStart(e, 'restricted_zone', 'Restricted Area')}
          onClick={() => handleAddItem('restricted_zone')}
        />
      </div>
    </div>
  );
};

export default LeftToolbox;
