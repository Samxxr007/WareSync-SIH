import React from 'react';
import { RackObject } from '@waresync/core';
import { PropertyRow, PropertySection } from '../../../design-system/components/PropertyRow';
import { colors } from '../../../design-system/tokens';

interface RackInspectorProps {
  rack: RackObject;
  floorName: string;
  onUpdate: (updates: Partial<RackObject>) => void;
}

export const RackInspector: React.FC<RackInspectorProps> = ({
  rack,
  floorName,
  onUpdate,
}) => {
  return (
    <div>
      <PropertySection title="IDENTITY & LOCATION">
        <PropertyRow label="Entity ID" value={rack.id} mono />
        <PropertyRow label="Floor" value={floorName} />
        <PropertyRow
          label="Coordinates (X, Z)"
          value={`[${rack.position[0].toFixed(1)}, ${rack.position[2].toFixed(1)}]`}
          mono
        />
        <PropertyRow
          label="Rotation"
          value={`${Math.round((rack.rotation[1] * 180) / Math.PI)}°`}
          mono
        />
      </PropertySection>

      <PropertySection title="STRUCTURE GEOMETRY">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
          <span style={{ fontSize: '12px', color: colors.textSecondary }}>Bays (Columns)</span>
          <input
            type="number"
            min={1}
            max={12}
            value={rack.bays}
            onChange={(e) => onUpdate({ bays: Math.max(1, parseInt(e.target.value) || 1) })}
            style={{ width: 50, padding: '3px 6px', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
          <span style={{ fontSize: '12px', color: colors.textSecondary }}>Shelf Levels</span>
          <input
            type="number"
            min={1}
            max={8}
            value={rack.levels}
            onChange={(e) => onUpdate({ levels: Math.max(1, parseInt(e.target.value) || 1) })}
            style={{ width: 50, padding: '3px 6px', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>

        <PropertyRow label="Total Height" value={rack.maxHeightMeters || (rack.levels * 1.0).toFixed(1)} unit="m" mono />
        <PropertyRow label="Access Mode" value={rack.accessSide} />
      </PropertySection>

      <PropertySection title="INVENTORY SLOTS">
        {rack.inventory.length === 0 ? (
          <div style={{ fontSize: '11px', color: colors.textMuted, fontStyle: 'italic', padding: '4px 0' }}>
            No SKUs currently assigned to this rack.
          </div>
        ) : (
          rack.inventory.map((inv, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 0',
                fontSize: '11px',
                fontFamily: "'IBM Plex Mono', monospace",
                borderBottom: `1px solid ${colors.borderLight}33`,
              }}
            >
              <span>{inv.sku} (L{inv.level}/B{inv.bay})</span>
              <span style={{ fontWeight: 700, color: colors.primary }}>{inv.quantity} units</span>
            </div>
          ))
        )}
      </PropertySection>

      <PropertySection title="DERIVED CONSTRAINTS">
        <PropertyRow
          label="Retrieval Capability"
          value={rack.levels >= 4 ? 'HIGH_RACK REQUIRED' : 'STANDARD'}
        />
        <PropertyRow label="Dynamic SIPP Reservation" value="ACTIVE" />
      </PropertySection>
    </div>
  );
};
