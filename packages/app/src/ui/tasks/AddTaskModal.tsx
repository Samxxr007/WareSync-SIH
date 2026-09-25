import React, { useState } from 'react';
import { X, Send, AlertTriangle, Layers, Box, Check } from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSimulationStore } from '../../store/simulationStore';
import { WarehouseTask } from '@waresync/core';
import { colors } from '../../design-system/tokens';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (task: WarehouseTask) => void;
}

const SKU_METADATA: Record<string, { name: string; weightPerUnitKg: number }> = {
  'SKU-A': { name: 'Precision Sensor Assemblies', weightPerUnitKg: 1.5 },
  'SKU-B': { name: 'Industrial Servo Motors', weightPerUnitKg: 4.2 },
  'SKU-C': { name: 'Power Distribution Modules', weightPerUnitKg: 3.8 },
};

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onTaskCreated }) => {
  const { model } = useWarehouseStore();
  const { addTask } = useSimulationStore();

  const [sku, setSku] = useState<'SKU-A' | 'SKU-B' | 'SKU-C'>('SKU-A');
  const [quantity, setQuantity] = useState<number>(20);
  const [selectedRackId, setSelectedRackId] = useState<string>('R01');
  const [pickupLevel, setPickupLevel] = useState<number>(1);
  const [selectedStationId, setSelectedStationId] = useState<string>('PACK-01');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  if (!isOpen) return null;

  // Collect all racks across all floors
  const allRacks = model.floors.flatMap((f) =>
    f.objects
      .filter((o) => o.type === 'rack')
      .map((r) => ({
        id: r.id,
        name: r.name || r.id,
        floorId: f.id,
        floorName: f.name || f.id,
      }))
  );

  // Collect all drop stations across all floors
  const allStations = model.floors.flatMap((f) =>
    f.objects
      .filter((o) => o.type === 'station')
      .map((s) => ({
        id: s.id,
        name: s.name || s.id,
        floorId: f.id,
        floorName: f.name || f.id,
      }))
  );

  const currentRack = allRacks.find((r) => r.id === selectedRackId) || allRacks[0];
  const currentStation = allStations.find((s) => s.id === selectedStationId) || allStations[0];
  const unitWeight = SKU_METADATA[sku]?.weightPerUnitKg ?? 2.0;
  const totalWeightKg = Math.round(quantity * unitWeight * 10) / 10;
  const isHighRack = pickupLevel >= 4;
  const isInterFloor = (currentRack?.floorId ?? 'floor-1') !== (currentStation?.floorId ?? 'floor-1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const taskId = `TK-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTask: WarehouseTask = {
      id: taskId,
      sku,
      quantity,
      pickupRackId: currentRack ? currentRack.id : 'R01',
      pickupFloorId: currentRack ? currentRack.floorId : 'floor-1',
      pickupLevel,
      dropStationId: currentStation ? currentStation.id : 'PACK-01',
      dropFloorId: currentStation ? currentStation.floorId : 'floor-1',
      weightKg: totalWeightKg,
      priority,
      status: 'PENDING',
      createdTimeSec: Math.floor(Date.now() / 1000),
    };

    addTask(newTask);
    if (onTaskCreated) {
      onTaskCreated(newTask);
    }

    setDispatchSuccess(true);
    setTimeout(() => {
      setDispatchSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 19, 23, 0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
          backgroundColor: colors.bgPanel,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: 6,
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: colors.bgPanelSecondary,
            borderBottom: `1px solid ${colors.borderLight}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Box size={18} color={colors.primary} />
            <h3
              style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 700,
                color: colors.textPrimary,
                letterSpacing: '0.04em',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              DISPATCH NEW AMR MISSION
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Row 1: SKU & Quantity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: colors.textSecondary, marginBottom: 4 }}>
                SKU COMMODITY
              </label>
              <select
                value={sku}
                onChange={(e) => setSku(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: colors.bgBase,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: 4,
                  color: colors.textPrimary,
                  fontSize: '12px',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                <option value="SKU-A">SKU-A • Sensor Assemblies (1.5 kg)</option>
                <option value="SKU-B">SKU-B • Servo Motors (4.2 kg)</option>
                <option value="SKU-C">SKU-C • Power Modules (3.8 kg)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: colors.textSecondary, marginBottom: 4 }}>
                QUANTITY (UNITS)
              </label>
              <input
                type="number"
                min={1}
                max={150}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 10px',
                  backgroundColor: colors.bgBase,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: 4,
                  color: colors.textPrimary,
                  fontSize: '12px',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              />
            </div>
          </div>

          {/* Row 2: Pickup Rack & Level */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: colors.textSecondary, marginBottom: 4 }}>
                PICKUP RACK
              </label>
              <select
                value={selectedRackId}
                onChange={(e) => setSelectedRackId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: colors.bgBase,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: 4,
                  color: colors.textPrimary,
                  fontSize: '12px',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {allRacks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} — {r.name} ({r.floorId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: colors.textSecondary, marginBottom: 4 }}>
                RACK LEVEL (1-5)
              </label>
              <select
                value={pickupLevel}
                onChange={(e) => setPickupLevel(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: colors.bgBase,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: 4,
                  color: colors.textPrimary,
                  fontSize: '12px',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                <option value={1}>Level 1 (Ground Reach - 1.0m)</option>
                <option value={2}>Level 2 (Standard Reach - 2.0m)</option>
                <option value={3}>Level 3 (Mid Reach - 3.0m)</option>
                <option value={4}>Level 4 (High-Bay - 4.2m) ⚠️</option>
                <option value={5}>Level 5 (Vault Top - 5.5m) ⚠️</option>
              </select>
            </div>
          </div>

          {/* Row 3: Drop Station & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: colors.textSecondary, marginBottom: 4 }}>
                DESTINATION STATION
              </label>
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: colors.bgBase,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: 4,
                  color: colors.textPrimary,
                  fontSize: '12px',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {allStations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.name} ({s.floorId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: colors.textSecondary, marginBottom: 4 }}>
                DISPATCH PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: colors.bgBase,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: 4,
                  color: priority === 'CRITICAL' ? colors.emergency : priority === 'HIGH' ? colors.warning : colors.textPrimary,
                  fontWeight: 700,
                  fontSize: '12px',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                <option value="NORMAL">NORMAL (P3)</option>
                <option value="HIGH">HIGH (P2 - Expedited)</option>
                <option value="CRITICAL">CRITICAL (P1 - Priority Right-of-Way)</option>
              </select>
            </div>
          </div>

          {/* Mission Specifications Overview Card */}
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: colors.bgBase,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: 4,
              fontSize: '11px',
              fontFamily: "'IBM Plex Mono', monospace",
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textSecondary }}>CALCULATED PAYLOAD:</span>
              <strong style={{ color: colors.textPrimary }}>{totalWeightKg} kg</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textSecondary }}>ELEVATOR TRANSITION:</span>
              <span style={{ color: isInterFloor ? colors.warning : colors.success, fontWeight: 600 }}>
                {isInterFloor ? 'REQUIRED (Multi-Floor)' : 'NO (Single Floor)'}
              </span>
            </div>
            {isHighRack && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.warning, marginTop: 2 }}>
                <AlertTriangle size={13} />
                <span>Requires AMR with HIGH_RACK capability cert</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'transparent',
                border: `1px solid ${colors.borderLight}`,
                borderRadius: 4,
                color: colors.textSecondary,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={dispatchSuccess}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 16px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: dispatchSuccess ? colors.success : colors.primary,
                border: 'none',
                borderRadius: 4,
                color: '#FFFFFF',
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              {dispatchSuccess ? (
                <>
                  <Check size={14} /> MISSION DISPATCHED
                </>
              ) : (
                <>
                  <Send size={14} /> DISPATCH TO FLEET
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
