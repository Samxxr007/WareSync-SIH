import React from 'react';
import { ChargerObject } from '@waresync/core';
import { PropertyRow, PropertySection } from '../../../design-system/components/PropertyRow';
import { colors } from '../../../design-system/tokens';

interface ChargerInspectorProps {
  chargerSpec: ChargerObject;
  liveChargerState?: any;
  onUpdate: (updates: Partial<ChargerObject>) => void;
}

export const ChargerInspector: React.FC<ChargerInspectorProps> = ({
  chargerSpec,
  liveChargerState,
  onUpdate,
}) => {
  return (
    <div>
      <PropertySection title="CHARGING TELEMETRY">
        <PropertyRow
          label="State"
          value={liveChargerState?.occupantRobotId ? 'CHARGING' : 'AVAILABLE'}
        />
        <PropertyRow
          label="Active Unit"
          value={liveChargerState?.occupantRobotId || 'NONE'}
          mono
        />
        <PropertyRow
          label="Queue Count"
          value={liveChargerState?.queueRobotIds?.length || 0}
          mono
        />
      </PropertySection>

      <PropertySection title="ELECTRICAL SPECIFICATIONS">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
          <span style={{ fontSize: '12px', color: colors.textSecondary }}>Charge Rate (kW)</span>
          <input
            type="number"
            step={1}
            min={11}
            max={50}
            value={chargerSpec.chargeRateKw || 22}
            onChange={(e) => onUpdate({ chargeRateKw: parseInt(e.target.value) || 22 })}
            style={{ width: 55, padding: '3px 6px', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>
        <PropertyRow label="Connector Interface" value={chargerSpec.connectorType || 'FAST_CONTACT'} />
        <PropertyRow label="Concurrent Capacity" value={chargerSpec.capacityUnits || 1} unit="AMR" mono />
      </PropertySection>
    </div>
  );
};
