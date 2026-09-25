import React from 'react';
import { AMRCapability, AMRObject } from '@waresync/core';
import { PropertyRow, PropertySection } from '../../../design-system/components/PropertyRow';
import { StatusBadge } from '../../../design-system/components/StatusBadge';
import { colors } from '../../../design-system/tokens';

interface AMRInspectorProps {
  robotSpec: AMRObject;
  liveRobotState?: any;
  onUpdate: (updates: Partial<AMRObject>) => void;
}

const ALL_CAPABILITIES: AMRCapability[] = [
  'STANDARD_RETRIEVAL',
  'HIGH_RACK',
  'EXTENDED_REACH',
  'HEAVY_PAYLOAD',
  'ELEVATOR_COMPLIANT',
  'COLD_STORAGE',
  'HAZMAT_CERTIFIED',
];

export const AMRInspector: React.FC<AMRInspectorProps> = ({
  robotSpec,
  liveRobotState,
  onUpdate,
}) => {
  const currentStatus = liveRobotState?.status || robotSpec.status || 'IDLE';
  const currentBattery = liveRobotState?.batteryPercent ?? robotSpec.batteryPercent;

  const toggleCapability = (cap: AMRCapability) => {
    const caps = robotSpec.capabilities || [];
    const nextCaps = caps.includes(cap)
      ? caps.filter((c) => c !== cap)
      : [...caps, cap];
    onUpdate({ capabilities: nextCaps });
  };

  return (
    <div>
      <PropertySection title="AMR OPERATIONAL STATE">
        <PropertyRow
          label="Live Status"
          value={
            <StatusBadge
              label={currentStatus}
              tone={
                currentStatus === 'MOVING'
                  ? 'success'
                  : currentStatus === 'YIELDING'
                  ? 'warning'
                  : currentStatus === 'FAULT'
                  ? 'critical'
                  : 'info'
              }
            />
          }
        />
        <PropertyRow
          label="Battery Level"
          value={`${currentBattery}%`}
          mono
        />
        <PropertyRow
          label="Speed"
          value={liveRobotState?.speedMps ? liveRobotState.speedMps.toFixed(2) : '0.00'}
          unit="m/s"
          mono
        />
        <PropertyRow
          label="Current Floor"
          value={liveRobotState?.floorId || robotSpec.currentFloorId || 'floor-1'}
        />
        <PropertyRow
          label="Active Task"
          value={liveRobotState?.currentTaskId ? `TASK-${liveRobotState.currentTaskId}` : 'NONE'}
          mono
        />
      </PropertySection>

      <PropertySection title="HARDWARE SPECIFICATIONS">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
          <span style={{ fontSize: '12px', color: colors.textSecondary }}>Max Speed (m/s)</span>
          <input
            type="number"
            step={0.1}
            min={0.5}
            max={2.5}
            value={robotSpec.maxSpeedMps}
            onChange={(e) => onUpdate({ maxSpeedMps: parseFloat(e.target.value) || 1.2 })}
            style={{ width: 55, padding: '3px 6px', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
          <span style={{ fontSize: '12px', color: colors.textSecondary }}>Payload Limit (kg)</span>
          <input
            type="number"
            step={50}
            min={100}
            max={1500}
            value={robotSpec.payloadCapacityKg}
            onChange={(e) => onUpdate({ payloadCapacityKg: parseInt(e.target.value) || 300 })}
            style={{ width: 55, padding: '3px 6px', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>

        <PropertyRow
          label="Current Load"
          value={`${liveRobotState?.currentPayloadKg || 0} / ${robotSpec.payloadCapacityKg} kg`}
          mono
        />
      </PropertySection>

      <PropertySection title="ROBOT CAPABILITIES">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {ALL_CAPABILITIES.map((cap) => {
            const hasCap = (robotSpec.capabilities || []).includes(cap);
            return (
              <label
                key={cap}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '11px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  cursor: 'pointer',
                  color: hasCap ? colors.textPrimary : colors.textMuted,
                }}
              >
                <input
                  type="checkbox"
                  checked={hasCap}
                  onChange={() => toggleCapability(cap)}
                />
                <span>{cap}</span>
              </label>
            );
          })}
        </div>
      </PropertySection>

      <PropertySection title="DECENTRALIZED COORDINATION">
        <PropertyRow
          label="Cumulative Wait Time"
          value={`${liveRobotState?.totalWaitTimeSec || 0}s`}
          mono
        />
        <PropertyRow
          label="Dynamic Replans"
          value={liveRobotState?.rerouteCount || 0}
          mono
        />
        <PropertyRow label="P2P Intent Broadcast" value="ACTIVE (10Hz)" mono />
      </PropertySection>
    </div>
  );
};
