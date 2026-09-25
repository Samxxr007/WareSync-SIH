import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { WarehouseRule, ZoneType } from '@waresync/core';
import { colors } from '../../design-system/tokens';

export const RulesScreen: React.FC = () => {
  const { model, addRule } = useWarehouseStore();

  const [rules, setRules] = useState<WarehouseRule[]>([
    {
      id: 'RULE-SPD-01',
      name: 'Receiving Dock Speed Limit',
      type: 'SPEED_LIMIT',
      targetType: 'ZONE',
      targetId: 'floor-1',
      parameters: { maxSpeedMps: 0.8 },
      active: true,
    },
    {
      id: 'RULE-DIR-02',
      name: 'Main Storage Aisle One-Way',
      type: 'ONE_WAY',
      targetType: 'CORRIDOR',
      targetId: 'aisle-F2-04',
      parameters: { direction: 'NORTH' },
      active: true,
    },
    {
      id: 'RULE-HUM-03',
      name: 'Packing Station Human Priority Zone',
      type: 'HUMAN_ONLY',
      targetType: 'ZONE',
      targetId: 'zone-pack',
      parameters: { amrAccess: 'RESTRICTED_SLOW' },
      active: true,
    },
    {
      id: 'RULE-CLR-04',
      name: 'Elevator Shaft Keep-Clear Clearance',
      type: 'KEEP_CLEAR',
      targetType: 'RESOURCE',
      targetId: 'ELEV-01',
      parameters: { bufferRadiusMeters: 2.0 },
      active: true,
    },
    {
      id: 'RULE-CAP-05',
      name: 'Corridor Max Concurrent AMRs',
      type: 'CORRIDOR_CAPACITY',
      targetType: 'CORRIDOR',
      targetId: 'corridor-F1-center',
      parameters: { maxConcurrentAMRs: 1 },
      active: true,
    },
  ]);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const handleAddNewRule = () => {
    const newId = `RULE-DYN-${Math.floor(100 + Math.random() * 900)}`;
    const newRule: WarehouseRule = {
      id: newId,
      name: `Dynamic Operational Rule ${newId}`,
      type: 'SPEED_LIMIT',
      targetType: 'ZONE',
      parameters: { maxSpeedMps: 0.6 },
      active: true,
    };
    setRules((prev) => [...prev, newRule]);
    addRule(newRule);
  };

  return (
    <div style={{ flex: 1, padding: 16, backgroundColor: colors.bgBase, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary }}>
            DYNAMIC OPERATIONAL RULES & POLICY CONSTRAINTS
          </h2>
          <p style={{ fontSize: '12px', color: colors.textSecondary }}>
            Configure active traffic policies, speed restrictions, corridor capacities, and zone clearances.
          </p>
        </div>
        <button
          onClick={handleAddNewRule}
          style={{
            backgroundColor: colors.primary,
            color: colors.textInverse,
            borderColor: colors.primary,
            fontWeight: 700,
            fontSize: '11px',
            padding: '6px 14px',
          }}
        >
          + ADD NEW RULE
        </button>
      </div>

      <div
        style={{
          backgroundColor: colors.bgPanel,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr
              style={{
                backgroundColor: colors.bgPanelSecondary,
                borderBottom: `1px solid ${colors.borderLight}`,
                textAlign: 'left',
                color: colors.textMuted,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
              }}
            >
              <th style={{ padding: '8px 12px' }}>RULE ID</th>
              <th style={{ padding: '8px 12px' }}>RULE NAME</th>
              <th style={{ padding: '8px 12px' }}>POLICY TYPE</th>
              <th style={{ padding: '8px 12px' }}>TARGET SCOPE</th>
              <th style={{ padding: '8px 12px' }}>PARAMETERS</th>
              <th style={{ padding: '8px 12px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} style={{ borderBottom: `1px solid ${colors.borderLight}33` }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {rule.id}
                </td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{rule.name}</td>
                <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: '10px',
                      backgroundColor: colors.bgPanelSecondary,
                      border: `1px solid ${colors.borderLight}`,
                    }}
                  >
                    {rule.type}
                  </span>
                </td>
                <td style={{ padding: '8px 12px', color: colors.textSecondary }}>
                  {rule.targetType} {rule.targetId ? `(${rule.targetId})` : ''}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>
                  {JSON.stringify(rule.parameters).replace(/[{}]/g, '')}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <button
                    onClick={() => toggleRule(rule.id)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: "'IBM Plex Mono', monospace",
                      backgroundColor: rule.active ? colors.successBg : colors.bgPanelSecondary,
                      color: rule.active ? colors.success : colors.textMuted,
                      borderColor: rule.active ? `${colors.success}44` : colors.borderLight,
                    }}
                  >
                    {rule.active ? 'ACTIVE' : 'DISABLED'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
