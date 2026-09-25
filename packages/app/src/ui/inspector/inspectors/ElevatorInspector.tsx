import React from 'react';
import { ElevatorObject, WarehouseModel } from '@waresync/core';
import { PropertyRow, PropertySection } from '../../../design-system/components/PropertyRow';
import { StatusBadge } from '../../../design-system/components/StatusBadge';
import { colors } from '../../../design-system/tokens';

interface ElevatorInspectorProps {
  elevatorSpec: ElevatorObject;
  model: WarehouseModel;
  liveElevatorState?: any;
  onUpdate: (updates: Partial<ElevatorObject>) => void;
}

export const ElevatorInspector: React.FC<ElevatorInspectorProps> = ({
  elevatorSpec,
  model,
  liveElevatorState,
  onUpdate,
}) => {
  return (
    <div>
      <PropertySection title="RESOURCE TELEMETRY">
        <PropertyRow
          label="Operational State"
          value={<StatusBadge label={liveElevatorState?.status || 'IDLE'} tone="info" />}
        />
        <PropertyRow
          label="Cab Height"
          value={liveElevatorState?.currentHeightMeters ? liveElevatorState.currentHeightMeters.toFixed(1) : '0.0'}
          unit="m"
          mono
        />
        <PropertyRow
          label="Door Status"
          value={liveElevatorState?.doorState || 'CLOSED'}
          mono
        />
        <PropertyRow
          label="Current Occupant"
          value={liveElevatorState?.occupantRobotId || 'VACANT'}
          mono
        />
        <PropertyRow
          label="Reservation Queue"
          value={liveElevatorState?.queueRobotIds?.length || 0}
          mono
        />
      </PropertySection>

      <PropertySection title="SHAFT SPECIFICATIONS">
        <PropertyRow label="Connected Floors" value={model.floors.map((f) => f.name.split(' - ')[0]).join(', ')} />
        <PropertyRow label="Max Unit Capacity" value={elevatorSpec.capacityUnits || 1} unit="AMR" mono />
        <PropertyRow label="Payload Rating" value={elevatorSpec.maxWeightKg || 1500} unit="kg" mono />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
          <span style={{ fontSize: '12px', color: colors.textSecondary }}>Transit Speed (m/s)</span>
          <input
            type="number"
            step={0.1}
            min={0.5}
            max={3.0}
            value={elevatorSpec.travelSpeedMps || 1.2}
            onChange={(e) => onUpdate({ travelSpeedMps: parseFloat(e.target.value) || 1.2 })}
            style={{ width: 55, padding: '3px 6px', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>
      </PropertySection>

      <PropertySection title="RESERVATION POLICY">
        <PropertyRow label="Access Protocol" value="DECENTRALIZED QUEUE" />
        <PropertyRow label="FIFO with Anti-Starvation" value="ENABLED" />
      </PropertySection>
    </div>
  );
};
