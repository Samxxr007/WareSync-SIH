import React from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSimulationStore } from '../../store/simulationStore';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { colors } from '../../design-system/tokens';

export const ResourcesScreen: React.FC = () => {
  const { model } = useWarehouseStore();
  const { currentFrame } = useSimulationStore();

  const elevators = model.connections.filter((c) => c.type === 'ELEVATOR');
  const chargers = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'charger'));
  const docks = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'loading_dock'));
  const stations = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'packing_station'));

  return (
    <div style={{ flex: 1, padding: 16, backgroundColor: colors.bgBase, overflowY: 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary }}>
          SHARED FACILITY RESOURCE ORCHESTRATION
        </h2>
        <p style={{ fontSize: '12px', color: colors.textSecondary }}>
          Centralized monitoring and decentralized reservations for elevators, chargers, narrow aisles, and loading bays.
        </p>
      </div>

      {/* 1. FREIGHT ELEVATORS */}
      <div
        style={{
          backgroundColor: colors.bgPanel,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: 4,
          marginBottom: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: colors.bgPanelSecondary,
            borderBottom: `1px solid ${colors.borderLight}`,
            fontWeight: 700,
            fontSize: '11px',
            color: colors.textSecondary,
          }}
        >
          FREIGHT ELEVATOR SHAFTS (MULTI-FLOOR BOTTLENECKS)
        </div>
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
              <th style={{ padding: '8px 12px' }}>RESOURCE ID</th>
              <th style={{ padding: '8px 12px' }}>CONNECTED FLOORS</th>
              <th style={{ padding: '8px 12px' }}>CAB POSITION</th>
              <th style={{ padding: '8px 12px' }}>OCCUPANT</th>
              <th style={{ padding: '8px 12px' }}>RESERVATION QUEUE</th>
              <th style={{ padding: '8px 12px' }}>STATE</th>
            </tr>
          </thead>
          <tbody>
            {elevators.map((elev) => {
              const live = currentFrame?.elevators.find((e) => e.id === elev.id);
              return (
                <tr key={elev.id} style={{ borderBottom: `1px solid ${colors.borderLight}33` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {elev.name} ({elev.id})
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {elev.connectedFloors.map((f) => f.toUpperCase()).join(' ↔ ')}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    Floor {live?.currentFloorId.split('-')[1]} ({live?.currentHeightMeters.toFixed(1)}m)
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {live?.occupantRobotId ? <strong>{live.occupantRobotId}</strong> : 'VACANT'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {live?.queueRobotIds?.length ? `${live.queueRobotIds.join(', ')}` : '0 AMRs waiting'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <StatusBadge
                      label={live?.status || 'IDLE'}
                      tone={live?.status === 'MOVING' ? 'warning' : 'success'}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. FAST CHARGING INFRASTRUCTURE */}
      <div
        style={{
          backgroundColor: colors.bgPanel,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: 4,
          marginBottom: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: colors.bgPanelSecondary,
            borderBottom: `1px solid ${colors.borderLight}`,
            fontWeight: 700,
            fontSize: '11px',
            color: colors.textSecondary,
          }}
        >
          22kW FAST CHARGING STATIONS & BUFFER BAYS
        </div>
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
              <th style={{ padding: '8px 12px' }}>CHARGER ID</th>
              <th style={{ padding: '8px 12px' }}>FLOOR</th>
              <th style={{ padding: '8px 12px' }}>POWER RATING</th>
              <th style={{ padding: '8px 12px' }}>OCCUPANCY</th>
              <th style={{ padding: '8px 12px' }}>WAITING QUEUE</th>
              <th style={{ padding: '8px 12px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {chargers.map((chg) => {
              const live = currentFrame?.chargers.find((c) => c.id === chg.id);
              const isOccupied = !!live?.occupantRobotId;
              return (
                <tr key={chg.id} style={{ borderBottom: `1px solid ${colors.borderLight}33` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {chg.id}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{chg.floorId}</td>
                  <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {(chg as any).chargeRateKw || 22} kW
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {isOccupied ? <strong style={{ color: colors.info }}>{live.occupantRobotId}</strong> : 'READY'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {live?.queueRobotIds?.length || 0} units
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <StatusBadge
                      label={isOccupied ? 'CHARGING' : 'AVAILABLE'}
                      tone={isOccupied ? 'info' : 'success'}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. LOADING DOCKS & PACKING STATIONS */}
      <div
        style={{
          backgroundColor: colors.bgPanel,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: colors.bgPanelSecondary,
            borderBottom: `1px solid ${colors.borderLight}`,
            fontWeight: 700,
            fontSize: '11px',
            color: colors.textSecondary,
          }}
        >
          LOADING DOCKS & PACKING STATIONS
        </div>
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
              <th style={{ padding: '8px 12px' }}>STATION ID</th>
              <th style={{ padding: '8px 12px' }}>NAME</th>
              <th style={{ padding: '8px 12px' }}>FLOOR</th>
              <th style={{ padding: '8px 12px' }}>THROUGHPUT RATING</th>
              <th style={{ padding: '8px 12px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {[...docks, ...stations].map((st) => (
              <tr key={st.id} style={{ borderBottom: `1px solid ${colors.borderLight}33` }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {st.id}
                </td>
                <td style={{ padding: '8px 12px' }}>{st.name}</td>
                <td style={{ padding: '8px 12px' }}>{st.floorId}</td>
                <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {(st as any).throughputPerHour || 30} units/hr
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <StatusBadge label="OPERATIONAL" tone="success" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
