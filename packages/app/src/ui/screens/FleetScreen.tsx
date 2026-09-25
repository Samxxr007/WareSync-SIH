import React from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSimulationStore } from '../../store/simulationStore';
import { useSelectionStore } from '../../store/selectionStore';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { colors } from '../../design-system/tokens';

export const FleetScreen: React.FC = () => {
  const { model } = useWarehouseStore();
  const { currentFrame } = useSimulationStore();
  const { setSelectedObjectId } = useSelectionStore();

  const allAmrs = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'amr'));

  return (
    <div style={{ flex: 1, padding: 16, backgroundColor: colors.bgBase, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary }}>
            AMR FLEET OPERATIONS & TELEMETRY
          </h2>
          <p style={{ fontSize: '12px', color: colors.textSecondary }}>
            Autonomous mobile robot monitoring, distributed telemetry, and operational states.
          </p>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: colors.textSecondary }}>
          ACTIVE UNITS: <strong>{allAmrs.length}</strong>
        </div>
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
                color: colors.textSecondary,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
              }}
            >
              <th style={{ padding: '8px 12px' }}>AMR ID</th>
              <th style={{ padding: '8px 12px' }}>STATUS</th>
              <th style={{ padding: '8px 12px' }}>FLOOR</th>
              <th style={{ padding: '8px 12px' }}>BATTERY</th>
              <th style={{ padding: '8px 12px' }}>PAYLOAD</th>
              <th style={{ padding: '8px 12px' }}>SPEED</th>
              <th style={{ padding: '8px 12px' }}>TASK</th>
              <th style={{ padding: '8px 12px' }}>CAPABILITIES</th>
              <th style={{ padding: '8px 12px' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {allAmrs.map((amr) => {
              const live = currentFrame?.robots.find((r) => r.id === amr.id);
              const battery = live ? live.batteryPercent : (amr as any).batteryPercent;
              const status = live ? live.status : (amr as any).status || 'IDLE';

              return (
                <tr
                  key={amr.id}
                  style={{
                    borderBottom: `1px solid ${colors.borderLight}44`,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedObjectId(amr.id)}
                >
                  <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {amr.id}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <StatusBadge
                      label={status}
                      tone={
                        status === 'MOVING'
                          ? 'success'
                          : status === 'YIELDING'
                          ? 'warning'
                          : status === 'FAULT'
                          ? 'critical'
                          : 'info'
                      }
                    />
                  </td>
                  <td style={{ padding: '8px 12px' }}>{live?.floorId || (amr as any).floorId}</td>
                  <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div
                        style={{
                          width: 40,
                          height: 6,
                          backgroundColor: colors.bgActive,
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${battery}%`,
                            height: '100%',
                            backgroundColor:
                              battery < 25
                                ? colors.critical
                                : battery < 50
                                ? colors.warning
                                : colors.success,
                          }}
                        />
                      </div>
                      <span>{battery}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {live?.currentPayloadKg || 0} / {(amr as any).payloadCapacityKg} kg
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {live?.speedMps ? live.speedMps.toFixed(2) : '0.00'} m/s
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {live?.currentTaskId ? `TASK-${live.currentTaskId}` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontSize: '11px', color: colors.textSecondary }}>
                      {((amr as any).capabilities || []).join(', ')}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedObjectId(amr.id);
                      }}
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                    >
                      INSPECT
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
