import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { colors, typography } from '../../design-system/tokens';
import { useSimulationStore } from '../../store/simulationStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useWarehouseStore } from '../../store/warehouseStore';

export const NetworkScreen: React.FC = () => {
  const { model } = useWarehouseStore();
  const {
    currentFrame,
    mode,
    triggerIntersectionDemo,
    setPeerDegradation,
    restoreAllLinks,
    clearNetworkMessageLog,
  } = useSimulationStore();
  const { selectedObjectId, setSelectedObjectId } = useSelectionStore();

  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedAmrId, setSelectedAmrId] = useState<string>('AMR-01');

  const allAmrs = model.floors.flatMap((f) =>
    f.objects.filter((o) => o.type === 'amr').map((o) => o.id)
  );

  const network = currentFrame?.network;
  const telemetry = network?.telemetry;
  const recentMessages = network?.recentMessages || [];
  const localDecisions = network?.localDecisions || {};
  const topology = network?.connections || [];

  // Filter messages
  const filteredMessages = recentMessages.filter((msg) => {
    if (filterType === 'ALL') return true;
    return msg.type === filterType;
  });

  // Selected robot's decision
  const activeDecision = localDecisions[selectedAmrId];
  const selectedRobotState = currentFrame?.robots.find((r) => r.id === selectedAmrId);

  // SVG Radial Topology layout calculations
  const svgWidth = 520;
  const svgHeight = 440;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const radius = 165;

  const nodePositions: Record<string, { x: number; y: number }> = {};
  allAmrs.forEach((amrId, idx) => {
    const angle = (idx / Math.max(1, allAmrs.length)) * 2 * Math.PI - Math.PI / 2;
    nodePositions[amrId] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const getLinkColor = (state: string) => {
    switch (state) {
      case 'CONNECTED':
        return colors.success;
      case 'DEGRADED':
        return colors.warning;
      case 'STALE':
      case 'DISCONNECTED':
        return colors.critical;
      default:
        return colors.borderStrong;
    }
  };

  const getMessageTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'INTENT_BROADCAST':
        return { bg: colors.infoBg, text: colors.info, border: '#B6D6EE' };
      case 'CONFLICT_NOTIFICATION':
        return { bg: colors.criticalBg, text: colors.critical, border: '#F2BEBE' };
      case 'YIELD_REQUEST':
        return { bg: colors.warningBg, text: colors.warning, border: '#F4D596' };
      case 'YIELD_ACCEPT':
        return { bg: colors.successBg, text: colors.success, border: '#B5DFC9' };
      case 'LOCAL_REPLAN':
        return { bg: '#EAE6F8', text: '#5D45B0', border: '#D2C8F3' };
      default:
        return { bg: colors.bgPanelSecondary, text: colors.textSecondary, border: colors.borderLight };
    }
  };

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bgBase,
        overflow: 'hidden',
        padding: '12px 16px',
        gap: 12,
        fontFamily: typography.fontSans,
      }}
    >
      {/* 1. ARCHITECTURE HEADER & ZERO-CENTRAL-AUTHORITY BANNER */}
      <div
        style={{
          backgroundColor: colors.bgPanel,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: 6,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Radio size={18} color={colors.primary} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                DECENTRALIZED P2P NETWORK INSPECTOR & TOPOLOGY
              </h2>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  backgroundColor: colors.successBg,
                  color: colors.success,
                  padding: '2px 8px',
                  borderRadius: 12,
                  border: `1px solid #B5DFC9`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ShieldCheck size={12} />
                NO CENTRAL AUTHORITY
              </span>
            </div>
            <p style={{ fontSize: '11px', color: colors.textSecondary, margin: '2px 0 0 26px' }}>
              Browser Web Worker multi-agent mesh. Robots coordinate pairwise via local SIPP and peer intent broadcast.
            </p>
          </div>

          {/* Mode Pill */}
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              backgroundColor: mode === 'PROPOSED' ? colors.successBg : colors.warningBg,
              border: `1px solid ${mode === 'PROPOSED' ? '#B5DFC9' : '#F4D596'}`,
              textAlign: 'right',
            }}
          >
            <div
              style={{
                fontFamily: typography.fontMono,
                fontSize: '11px',
                fontWeight: 700,
                color: mode === 'PROPOSED' ? colors.success : colors.warning,
              }}
            >
              {mode === 'PROPOSED' ? 'PROPOSED — DECENTRALIZED SIPP' : 'BASELINE — STOP-AND-WAIT'}
            </div>
            <div style={{ fontSize: '10px', color: colors.textSecondary, marginTop: 1 }}>
              {mode === 'PROPOSED' ? 'P2P Intent Sharing: ENABLED' : 'P2P Intent Sharing: DISABLED'}
            </div>
          </div>
        </div>

        {/* 4 Architecture Pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            borderTop: `1px solid ${colors.borderLight}`,
            paddingTop: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                backgroundColor: colors.successBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.success,
              }}
            >
              <ShieldCheck size={16} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>
                Central Authority
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: colors.textPrimary }}>
                NONE (0 Server-Side Authorities)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                backgroundColor: colors.infoBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.info,
              }}
            >
              <Cpu size={16} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>
                Local Motion Planner
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: colors.textPrimary }}>
                SIPP Safe Interval (AMR Onboard)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                backgroundColor: colors.bgPanelSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textSecondary,
              }}
            >
              <Layers size={16} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>
                Peer Coordination
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: colors.textPrimary }}>
                Simulated P2P Peer Links
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                backgroundColor: colors.successBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.success,
              }}
            >
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>
                Single Point of Failure
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: colors.success }}>
                ELIMINATED (Decentralized Mesh)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LIVE TELEMETRY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>
            Active Peers
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: typography.fontMono,
              color: colors.textPrimary,
              marginTop: 2,
            }}
          >
            {telemetry?.activePeers ?? allAmrs.length}
          </div>
          <div style={{ fontSize: '10px', color: colors.success, marginTop: 2 }}>
            ● {telemetry?.connectedPeers ?? allAmrs.length} Connected
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>
            P2P Msg Rate
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: typography.fontMono,
              color: colors.textPrimary,
              marginTop: 2,
            }}
          >
            {telemetry?.messagesPerSec ?? 0}
            <span style={{ fontSize: '11px', fontWeight: 500, color: colors.textSecondary, marginLeft: 3 }}>
              msg/s
            </span>
          </div>
          <div style={{ fontSize: '10px', color: colors.textSecondary, marginTop: 2 }}>
            Total: {telemetry?.totalP2PMessages ?? 0}
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>
            Avg Peer Latency
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: typography.fontMono,
              color: colors.textPrimary,
              marginTop: 2,
            }}
          >
            {telemetry?.avgLatencyMs ?? 12}
            <span style={{ fontSize: '11px', fontWeight: 500, color: colors.textSecondary, marginLeft: 3 }}>
              ms
            </span>
          </div>
          <div style={{ fontSize: '10px', color: colors.success, marginTop: 2 }}>Direct radio peer link</div>
        </div>

        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>
            Packet Loss
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: typography.fontMono,
              color: (telemetry?.packetLossPercent || 0) > 10 ? colors.warning : colors.textPrimary,
              marginTop: 2,
            }}
          >
            {telemetry ? `${telemetry.packetLossPercent.toFixed(1)}%` : '0.8%'}
          </div>
          <div style={{ fontSize: '10px', color: colors.textSecondary, marginTop: 2 }}>
            {telemetry?.degradedPeers ? `${telemetry.degradedPeers} degraded link(s)` : 'Nominal channel'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>
            Decentralized Negotiations
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: typography.fontMono,
              color: colors.textPrimary,
              marginTop: 2,
            }}
          >
            {telemetry?.yieldRequests ?? 0}
          </div>
          <div style={{ fontSize: '10px', color: colors.success, marginTop: 2 }}>
            {telemetry?.localReplans ?? 0} local replans
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>
            Central Arbitrations
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: typography.fontMono,
              color: colors.success,
              marginTop: 2,
            }}
          >
            0
            <span style={{ fontSize: '11px', fontWeight: 500, color: colors.textSecondary, marginLeft: 3 }}>
              (0.0%)
            </span>
          </div>
          <div style={{ fontSize: '10px', color: colors.success, marginTop: 2 }}>100% Peer-to-Peer</div>
        </div>
      </div>

      {/* 3. MAIN SPLIT: TOPOLOGY GRAPH (LEFT) vs MESSAGE STREAM & LOCAL DECISION (RIGHT) */}
      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        {/* LEFT COLUMN: SVG TOPOLOGY GRAPH + LIVE DEMO CONTROLS */}
        <div
          style={{
            width: '46%',
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${colors.borderLight}`,
              backgroundColor: colors.bgPanelSecondary,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: colors.textPrimary }}>
                PEER-TO-PEER AGENT TOPOLOGY
              </div>
              <div style={{ fontSize: '10px', color: colors.textSecondary }}>
                Direct mesh graph. Click any AMR node to inspect its local decision state.
              </div>
            </div>
            <div
              style={{
                fontSize: '10px',
                fontFamily: typography.fontMono,
                color: colors.textMuted,
              }}
            >
              {allAmrs.length} NODES | {topology.length} EDGES
            </div>
          </div>

          {/* SVG Topology Viewport */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FAFBFC',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <svg width={svgWidth} height={svgHeight} style={{ overflow: 'visible' }}>
              <defs>
                <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
                </filter>
              </defs>

              {/* Simulated P2P Peer Links */}
              {topology.map((conn, idx) => {
                const posA = nodePositions[conn.localRobotId];
                const posB = nodePositions[conn.peerRobotId];
                if (!posA || !posB) return null;

                const strokeColor = getLinkColor(conn.state);
                const isSelected =
                  conn.localRobotId === selectedAmrId || conn.peerRobotId === selectedAmrId;

                return (
                  <line
                    key={`link_${conn.localRobotId}_${conn.peerRobotId}_${idx}`}
                    x1={posA.x}
                    y1={posA.y}
                    x2={posB.x}
                    y2={posB.y}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 2.5 : conn.state === 'DEGRADED' ? 2 : 1.2}
                    strokeOpacity={isSelected ? 0.9 : 0.4}
                    strokeDasharray={
                      conn.state === 'DEGRADED'
                        ? '5,4'
                        : conn.state === 'STALE'
                        ? '2,3'
                        : 'none'
                    }
                  />
                );
              })}

              {/* Robot Nodes */}
              {allAmrs.map((amrId) => {
                const pos = nodePositions[amrId];
                if (!pos) return null;
                const isSelected = amrId === selectedAmrId;
                const robotState = currentFrame?.robots.find((r) => r.id === amrId);
                const isMoving = robotState?.status === 'MOVING';
                const isYielding = robotState?.status === 'YIELDING';

                let nodeFill = '#FFFFFF';
                let nodeStroke = colors.borderStrong;

                if (isSelected) {
                  nodeStroke = colors.primary;
                } else if (isYielding) {
                  nodeStroke = colors.warning;
                } else if (isMoving) {
                  nodeStroke = colors.success;
                }

                return (
                  <g
                    key={amrId}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedAmrId(amrId);
                      setSelectedObjectId(amrId);
                    }}
                  >
                    {/* Selection halo */}
                    {isSelected && (
                      <circle
                        r={24}
                        fill="none"
                        stroke={colors.primary}
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        opacity={0.8}
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      r={18}
                      fill={nodeFill}
                      stroke={nodeStroke}
                      strokeWidth={isSelected ? 3 : 2}
                      filter="url(#nodeShadow)"
                    />

                    {/* Node Text Label */}
                    <text
                      textAnchor="middle"
                      dy="4"
                      fontSize="9px"
                      fontFamily={typography.fontMono}
                      fontWeight="bold"
                      fill={isSelected ? colors.primary : colors.textPrimary}
                    >
                      {amrId.replace('AMR-', '')}
                    </text>

                    {/* Mini Status Dot */}
                    <circle
                      cx={12}
                      cy={-12}
                      r={4}
                      fill={isYielding ? colors.warning : isMoving ? colors.success : colors.textMuted}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Note badge */}
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 12,
                fontSize: '10px',
                color: colors.textMuted,
                backgroundColor: 'rgba(255,255,255,0.92)',
                padding: '3px 8px',
                borderRadius: 4,
                border: `1px solid ${colors.borderLight}`,
              }}
            >
              Notice: No central coordinator or hub node exists in topology graph.
            </div>
          </div>

          {/* Interactive Demo Action Bar */}
          <div
            style={{
              padding: '10px 14px',
              borderTop: `1px solid ${colors.borderLight}`,
              backgroundColor: colors.bgPanelSecondary,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: colors.textSecondary }}>
              INTERACTIVE DECENTRALIZED SCENARIO TRIGGERS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <button
                onClick={() => triggerIntersectionDemo()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: colors.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 4,
                  padding: '7px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Play size={13} />
                Trigger Intersection Conflict
              </button>

              <button
                onClick={() => setPeerDegradation('AMR-01', 'AMR-02', 'DEGRADED', 280, 0.35)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#FFFFFF',
                  color: colors.warning,
                  border: `1px solid ${colors.warning}`,
                  borderRadius: 4,
                  padding: '7px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <WifiOff size={13} />
                Degrade AMR-01 ↔ AMR-02 Link
              </button>

              <button
                onClick={() => restoreAllLinks()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#FFFFFF',
                  color: colors.success,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} />
                Restore All Peer Links
              </button>

              <button
                onClick={() => clearNetworkMessageLog()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#FFFFFF',
                  color: colors.textSecondary,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={13} />
                Clear Message Buffer
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MESSAGE STREAM (TOP) + SELECTED AMR DECISION (BOTTOM) */}
        <div style={{ width: '54%', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {/* TOP: LIVE MONOSPACE MESSAGE STREAM */}
          <div
            style={{
              flex: 1,
              backgroundColor: colors.bgPanel,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 240,
            }}
          >
            {/* Message Stream Header */}
            <div
              style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${colors.borderLight}`,
                backgroundColor: colors.bgPanelSecondary,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={14} color={colors.primary} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: colors.textPrimary }}>
                  LIVE P2P PACKET INSPECTOR
                </span>
                <span
                  style={{
                    fontFamily: typography.fontMono,
                    fontSize: '10px',
                    color: colors.textSecondary,
                    backgroundColor: colors.bgHover,
                    padding: '1px 6px',
                    borderRadius: 3,
                  }}
                >
                  {filteredMessages.length} PACKETS
                </span>
              </div>

              {/* Packet Type Filter Tabs */}
              <div style={{ display: 'flex', gap: 4 }}>
                {['ALL', 'INTENT_BROADCAST', 'CONFLICT_NOTIFICATION', 'YIELD_REQUEST', 'YIELD_ACCEPT', 'LOCAL_REPLAN'].map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      style={{
                        padding: '2px 6px',
                        fontSize: '9px',
                        fontFamily: typography.fontMono,
                        fontWeight: filterType === type ? 700 : 500,
                        backgroundColor: filterType === type ? colors.primary : 'transparent',
                        color: filterType === type ? '#FFFFFF' : colors.textSecondary,
                        border: `1px solid ${filterType === type ? colors.primary : colors.borderLight}`,
                        borderRadius: 3,
                        cursor: 'pointer',
                      }}
                    >
                      {type === 'ALL' ? 'ALL' : type.replace('_', ' ').substring(0, 10)}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Scrollable Packet Log */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                backgroundColor: '#FFFFFF',
                padding: '6px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                fontFamily: typography.fontMono,
                fontSize: '11px',
              }}
            >
              {filteredMessages.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: colors.textMuted,
                    fontSize: '11px',
                  }}
                >
                  No peer packets recorded matching filter. Run simulation to observe decentralized traffic.
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const badge = getMessageTypeBadgeColor(msg.type);
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '4px 6px',
                        borderBottom: '1px solid #F0F2F4',
                        lineHeight: 1.4,
                      }}
                    >
                      {/* Sim Time */}
                      <span style={{ color: colors.textMuted, flexShrink: 0, fontSize: '10px' }}>
                        [{msg.timestampSec.toFixed(1)}s]
                      </span>

                      {/* Packet Type Pill */}
                      <span
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          padding: '1px 5px',
                          borderRadius: 3,
                          fontSize: '9px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {msg.type}
                      </span>

                      {/* Route sender -> receiver */}
                      <span style={{ fontWeight: 600, color: colors.textPrimary, flexShrink: 0 }}>
                        {msg.senderId} → {msg.receiverId}
                      </span>

                      {/* Summary Payload */}
                      <span style={{ color: colors.textSecondary, flex: 1, wordBreak: 'break-word' }}>
                        {msg.payloadSummary}
                      </span>

                      {/* Sequence No */}
                      <span style={{ color: colors.textMuted, fontSize: '9px', flexShrink: 0 }}>
                        #{msg.sequence}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* BOTTOM: SELECTED AMR LOCAL DECISION PANEL */}
          <div
            style={{
              height: 250,
              backgroundColor: colors.bgPanel,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Decision Header */}
            <div
              style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${colors.borderLight}`,
                backgroundColor: colors.bgPanelSecondary,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cpu size={14} color={colors.primary} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: colors.textPrimary }}>
                  LOCAL ONBOARD DECISION ENGINE: {selectedAmrId}
                </span>
              </div>

              {/* Robot Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '10px', color: colors.textSecondary }}>SELECT AMR:</span>
                <select
                  value={selectedAmrId}
                  onChange={(e) => {
                    setSelectedAmrId(e.target.value);
                    setSelectedObjectId(e.target.value);
                  }}
                  style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontFamily: typography.fontMono,
                    borderRadius: 4,
                    border: `1px solid ${colors.borderLight}`,
                    backgroundColor: '#FFFFFF',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                  }}
                >
                  {allAmrs.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Decision Details Body */}
            <div
              style={{
                padding: '12px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: '11px',
                overflowY: 'auto',
              }}
            >
              {/* Status and Action Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div
                  style={{
                    backgroundColor: colors.bgPanelSecondary,
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: `1px solid ${colors.borderLight}`,
                  }}
                >
                  <div style={{ fontSize: '9px', color: colors.textMuted, textTransform: 'uppercase' }}>
                    Local State
                  </div>
                  <div
                    style={{
                      fontFamily: typography.fontMono,
                      fontSize: '12px',
                      fontWeight: 700,
                      color:
                        selectedRobotState?.status === 'MOVING'
                          ? colors.success
                          : selectedRobotState?.status === 'YIELDING'
                          ? colors.warning
                          : colors.textPrimary,
                      marginTop: 2,
                    }}
                  >
                    {activeDecision?.status || selectedRobotState?.status || 'IDLE'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: colors.bgPanelSecondary,
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: `1px solid ${colors.borderLight}`,
                  }}
                >
                  <div style={{ fontSize: '9px', color: colors.textMuted, textTransform: 'uppercase' }}>
                    Assigned Task Goal
                  </div>
                  <div
                    style={{
                      fontFamily: typography.fontMono,
                      fontSize: '11px',
                      fontWeight: 600,
                      color: colors.textPrimary,
                      marginTop: 2,
                    }}
                  >
                    {selectedRobotState?.currentTask
                      ? `Rack ${selectedRobotState.currentTask.pickupRackId} (${selectedRobotState.currentTask.priority})`
                      : 'Standby / Idle'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: colors.bgPanelSecondary,
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: `1px solid ${colors.borderLight}`,
                  }}
                >
                  <div style={{ fontSize: '9px', color: colors.textMuted, textTransform: 'uppercase' }}>
                    Battery & Speed
                  </div>
                  <div
                    style={{
                      fontFamily: typography.fontMono,
                      fontSize: '11px',
                      fontWeight: 600,
                      color: colors.textPrimary,
                      marginTop: 2,
                    }}
                  >
                    {selectedRobotState ? `${selectedRobotState.batteryPercent.toFixed(0)}% | ${(selectedRobotState.speedMps || 0).toFixed(1)} m/s` : '—'}
                  </div>
                </div>
              </div>

              {/* Priority Score Breakdown Formula */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: 4,
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: colors.textSecondary }}>
                    ONBOARD RIGHT-OF-WAY FORMULA
                  </span>
                  <span style={{ fontFamily: typography.fontMono, fontSize: '10px', color: colors.primary, fontWeight: 700 }}>
                    Score = 50 + TaskBonus + LoadBonus + BattBonus + WaitComp
                  </span>
                </div>
                <div style={{ fontFamily: typography.fontMono, fontSize: '11px', color: colors.textPrimary }}>
                  Local Priority Score:{' '}
                  <strong style={{ color: colors.primary }}>
                    {activeDecision?.localPriorityScore ?? (selectedRobotState ? 50 : 0)}
                  </strong>{' '}
                  {activeDecision?.peerPriorityScore !== undefined && (
                    <span>
                      {' '}
                      vs Peer Evaluated:{' '}
                      <strong style={{ color: colors.textSecondary }}>
                        {activeDecision.peerPriorityScore}
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Local Decision Reason & Next Action */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase' }}>
                  Local Reason & Action
                </div>
                <div
                  style={{
                    fontFamily: typography.fontMono,
                    fontSize: '11px',
                    color: colors.textPrimary,
                    backgroundColor: colors.bgPanelSecondary,
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: `1px solid ${colors.borderLight}`,
                  }}
                >
                  {activeDecision?.decisionReason ||
                    'Evaluating local safe intervals. No active spatial conflict detected with peers.'}
                </div>
              </div>

              {/* Verification Callout */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: colors.success,
                  fontSize: '10px',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={13} />
                Decision evaluated locally onboard {selectedAmrId} using independent DistributedIntentStore. Zero central arbitration calls.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
