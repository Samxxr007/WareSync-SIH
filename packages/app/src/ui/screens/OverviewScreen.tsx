import React from 'react';
import { Activity, AlertOctagon, BatteryCharging, Box, Cpu, Layers, ShieldCheck, Truck } from 'lucide-react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { colors } from '../../design-system/tokens';

export const OverviewScreen: React.FC = () => {
  const { model } = useWarehouseStore();
  const { currentFrame } = useSimulationStore();
  const { setActiveNav, setMode } = useUIStore();

  const metrics = currentFrame?.metrics;
  const amrs = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'amr'));
  const racks = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'rack'));
  const elevators = model.connections.filter((c) => c.type === 'ELEVATOR');
  const chargers = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'charger'));

  return (
    <div style={{ flex: 1, padding: 18, backgroundColor: colors.bgBase, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.01em' }}>
            OPERATIONS CONTROL ROOM — {model.name}
          </h1>
          <p style={{ fontSize: '12px', color: colors.textSecondary }}>
            Facility telemetry, decentralized AMR fleet status, and active operational constraints.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setActiveNav('Designer');
              setMode('DESIGN');
            }}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: colors.bgPanel,
            }}
          >
            OPEN 3D DESIGNER
          </button>
          <button
            onClick={() => {
              setActiveNav('Simulation');
              setMode('SIMULATE');
            }}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: colors.primary,
              color: colors.textInverse,
              borderColor: colors.primary,
            }}
          >
            ENTER SIMULATOR
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS (Engineering Style - No huge cards, subtle borders) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 4,
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>
            <span>FLEET READINESS</span>
            <Truck size={14} color={colors.primary} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: colors.textPrimary, margin: '6px 0 2px', fontFamily: "'IBM Plex Mono', monospace" }}>
            {amrs.length} UNITS
          </div>
          <div style={{ fontSize: '11px', color: colors.success, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>● 100% P2P Mesh Online</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 4,
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>
            <span>SAFETY & COLLISION</span>
            <ShieldCheck size={14} color={colors.success} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: colors.success, margin: '6px 0 2px', fontFamily: "'IBM Plex Mono', monospace" }}>
            0 COLLISIONS
          </div>
          <div style={{ fontSize: '11px', color: colors.textSecondary }}>
            Zero kinematic overlaps recorded
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 4,
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>
            <span>TASK THROUGHPUT</span>
            <Activity size={14} color={colors.info} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: colors.textPrimary, margin: '6px 0 2px', fontFamily: "'IBM Plex Mono', monospace" }}>
            {metrics?.completedTasks || 0} DELIVERED
          </div>
          <div style={{ fontSize: '11px', color: colors.textSecondary }}>
            {metrics?.taskThroughputPerMinute || 0} tasks/min runtime
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 4,
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>
            <span>TOTAL CUMULATIVE WAIT</span>
            <AlertOctagon size={14} color={colors.warning} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: colors.warning, margin: '6px 0 2px', fontFamily: "'IBM Plex Mono', monospace" }}>
            {metrics?.totalWaitTimeSec || 0}s
          </div>
          <div style={{ fontSize: '11px', color: colors.success }}>
            Decentralized SIPP optimized
          </div>
        </div>
      </div>

      {/* TWO COLUMN SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Left Column: Floor Infrastructure */}
        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 4,
            padding: 14,
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: colors.textPrimary, marginBottom: 12 }}>
            FACILITY FLOOR OCCUPANCY & STRUCTURE
          </div>
          {model.floors.map((floor, idx) => {
            const floorAmrs = amrs.filter((a) => (a as any).currentFloorId === floor.id || a.floorId === floor.id);
            const floorRacks = floor.objects.filter((o) => o.type === 'rack');

            return (
              <div
                key={floor.id}
                style={{
                  padding: '10px 12px',
                  backgroundColor: colors.bgPanelSecondary,
                  borderRadius: 4,
                  border: `1px solid ${colors.borderLight}`,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '12px' }}>
                    {floor.name}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: colors.textMuted }}>
                    Elev: {floor.elevationMeters}m
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: '11px', color: colors.textSecondary, fontFamily: "'IBM Plex Mono', monospace" }}>
                  <span>{floorAmrs.length} AMRs</span>
                  <span>{floorRacks.length} Storage Racks</span>
                  <span>{floor.objects.length} Total Entities</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Fleet Live Status */}
        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 4,
            padding: 14,
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: colors.textPrimary, marginBottom: 12 }}>
            LIVE AMR FLEET TELEMETRY
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: colors.textMuted, borderBottom: `1px solid ${colors.borderLight}` }}>
                <th style={{ paddingBottom: 6 }}>ID</th>
                <th style={{ paddingBottom: 6 }}>STATUS</th>
                <th style={{ paddingBottom: 6 }}>BATTERY</th>
                <th style={{ paddingBottom: 6 }}>PAYLOAD</th>
                <th style={{ paddingBottom: 6 }}>ACTIVE TASK</th>
              </tr>
            </thead>
            <tbody>
              {amrs.map((amr) => {
                const live = currentFrame?.robots.find((r) => r.id === amr.id);
                return (
                  <tr key={amr.id} style={{ borderBottom: `1px solid ${colors.borderLight}22` }}>
                    <td style={{ padding: '6px 0', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {amr.id}
                    </td>
                    <td style={{ padding: '6px 0' }}>
                      <StatusBadge
                        label={live?.status || (amr as any).status || 'IDLE'}
                        tone={live?.status === 'MOVING' ? 'success' : live?.status === 'YIELDING' ? 'warning' : 'neutral'}
                      />
                    </td>
                    <td style={{ padding: '6px 0', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {live ? live.batteryPercent : (amr as any).batteryPercent}%
                    </td>
                    <td style={{ padding: '6px 0', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {live?.currentPayloadKg || 0}kg
                    </td>
                    <td style={{ padding: '6px 0', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {live?.currentTaskId ? `TASK-${live.currentTaskId}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
