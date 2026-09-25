import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  Radio,
  Server,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../design-system/tokens';

const BOOT_LOGS = [
  { time: '0.012s', subsys: 'BOOT_ROM', msg: 'Edge coprocessor initializing (Quad-Core Cortex-A72)... OK' },
  { time: '0.038s', subsys: 'HARDWARE', msg: 'Calibrating differential drive kinematics & LiDAR 0.35m E-stop... OK' },
  { time: '0.075s', subsys: 'NET_MESH', msg: 'Zero-cloud fallback active. Establishing decentralized P2P ad-hoc mesh... CONNECTED' },
  { time: '0.114s', subsys: 'TOPOLOGY', msg: 'Hydrating 3-floor facility model (12 high-bay racks, 2 chargers, 1 elevator)... LOADED' },
  { time: '0.162s', subsys: 'COMPILER', msg: 'Synthesizing multi-floor navigation graph (184 nodes, 368 bidirectional edges)... COMPILED' },
  { time: '0.228s', subsys: 'SIPP_CORE', msg: 'Distributed space-time intent stores synchronized. Collision probability: 0.00%... VERIFIED' },
  { time: '0.310s', subsys: 'RIGHT_OF_WAY', msg: 'Dynamic weighted priority matrix active. Starvation backoff initialized... ARMED' },
  { time: '0.385s', subsys: 'BENCHMARK', msg: 'Calibrating FCFS Stop-and-Wait reference baseline (Target: ≥20% improvement)... READY' },
  { time: '0.440s', subsys: 'STANDARDS', msg: 'Export pipelines for VDA 5050 v2.0 & ROS2 Nav2 parameter matrices... VALIDATED' },
  { time: '0.500s', subsys: 'DIGITAL_TWIN', msg: 'Interactive 3D digital twin & fleet telemetry bridge online. Entering control room.', success: true },
];

export const Preloader: React.FC = () => {
  const { isBooting, setIsBooting } = useUIStore();
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isBooting) return;

    setProgress(0);
    setLogIndex(0);
    setIsReady(false);

    // Progress counter timer
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsReady(true);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    // Boot log line streamer
    const logInterval = setInterval(() => {
      setLogIndex((prev) => {
        if (prev >= BOOT_LOGS.length - 1) {
          clearInterval(logInterval);
          return BOOT_LOGS.length - 1;
        }
        return prev + 1;
      });
    }, 200);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
    };
  }, [isBooting]);

  if (!isBooting) return null;

  const handleEnter = () => {
    setIsBooting(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#0F1317',
        color: '#E8ECF0',
        fontFamily: "'IBM Plex Mono', monospace",
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '32px 40px',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. TOP HEADER & SIH BADGE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              backgroundColor: 'rgba(23, 105, 170, 0.2)',
              border: '1px solid #1769AA',
              borderRadius: 4,
              fontSize: '11px',
              color: '#64B5F6',
              fontWeight: 600,
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            <Activity size={14} />
            SMART INDIA HACKATHON 2026 • ADVANCED ROBOTICS & AGENTIC AI
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
              WARESYNC
            </span>
            <span style={{ fontSize: '13px', color: '#8A9BA8', letterSpacing: '0.04em' }}>
              v2.4.0-SIH • EDGE FLEET ORCHESTRATION
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#5E6B78', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            OPERATING MODE
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#2E7D5B', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#2E7D5B', display: 'inline-block', boxShadow: '0 0 8px #2E7D5B' }} />
            DECENTRALIZED P2P (ZERO CENTRAL SERVER)
          </div>
        </div>
      </div>

      {/* 2. MIDDLE CONTENT: TELEMETRY & TERMINAL */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, margin: '24px 0', flex: 1, minHeight: 0 }}>
        {/* Left Edge Specs Card */}
        <div
          style={{
            backgroundColor: '#161C22',
            border: '1px solid #28323B',
            borderRadius: 6,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            fontSize: '11px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#BAC7D5', borderBottom: '1px solid #28323B', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={15} color="#1769AA" />
            ONBOARD EDGE PROFILE
          </div>

          <div>
            <div style={{ color: '#5E6B78', fontSize: '10px', textTransform: 'uppercase' }}>Compute Architecture</div>
            <div style={{ color: '#E8ECF0', fontWeight: 600, marginTop: 2 }}>Quad-Core Cortex-A72 / Jetson Nano</div>
          </div>

          <div>
            <div style={{ color: '#5E6B78', fontSize: '10px', textTransform: 'uppercase' }}>Inter-Robot Protocol</div>
            <div style={{ color: '#E8ECF0', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={13} color="#2E7D5B" />
              802.11p P2P Intent Broadcast
            </div>
          </div>

          <div>
            <div style={{ color: '#5E6B78', fontSize: '10px', textTransform: 'uppercase' }}>Motion Coordination</div>
            <div style={{ color: '#E8ECF0', fontWeight: 600, marginTop: 2 }}>Distributed SIPP + Dynamic Right-of-Way</div>
          </div>

          <div>
            <div style={{ color: '#5E6B78', fontSize: '10px', textTransform: 'uppercase' }}>Safety Redundancy</div>
            <div style={{ color: '#64B5F6', fontWeight: 600, marginTop: 2 }}>Zero Single-Point-of-Failure</div>
          </div>

          <div style={{ marginTop: 'auto', backgroundColor: '#101418', padding: '10px 12px', borderRadius: 4, border: '1px solid #1E262E' }}>
            <div style={{ fontSize: '10px', color: '#8A9BA8' }}>BENCHMARK TARGET</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#2E7D5B', marginTop: 2 }}>
              ≥ 20% Task Time Improvement
            </div>
          </div>
        </div>

        {/* Right Terminal Log Output */}
        <div
          style={{
            backgroundColor: '#12171C',
            border: '1px solid #28323B',
            borderRadius: 6,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1E262E', paddingBottom: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '11px', color: '#5E6B78', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Server size={14} /> SUBSYSTEM BOOT STREAM
            </span>
            <span style={{ fontSize: '11px', color: '#8A9BA8' }}>
              {logIndex + 1}/{BOOT_LOGS.length} TASKS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' }}>
            {BOOT_LOGS.slice(0, logIndex + 1).map((log, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: '11px',
                  lineHeight: '1.4',
                  color: log.success ? '#2E7D5B' : '#C5CDD5',
                  display: 'flex',
                  gap: 12,
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <span style={{ color: '#5E6B78', width: 55, flexShrink: 0 }}>[{log.time}]</span>
                <span style={{ color: '#1769AA', width: 120, flexShrink: 0, fontWeight: 600 }}>{log.subsys}</span>
                <span style={{ color: log.success ? '#4CAF50' : '#BAC7D5' }}>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM PROGRESS & ACTION BAR */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '12px' }}>
          <span style={{ color: '#8A9BA8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={14} color="#C88900" />
            {progress < 100 ? 'INITIALIZING SUBSYSTEMS...' : 'SYSTEM READY • ALL NODES SYNCHRONIZED'}
          </span>
          <span style={{ fontWeight: 700, color: progress === 100 ? '#2E7D5B' : '#64B5F6' }}>
            {progress}%
          </span>
        </div>

        {/* Progress Track */}
        <div
          style={{
            width: '100%',
            height: 6,
            backgroundColor: '#1E262E',
            borderRadius: 3,
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: progress === 100 ? '#2E7D5B' : '#1769AA',
              borderRadius: 3,
              transition: 'width 0.08s ease, background-color 0.3s ease',
              boxShadow: progress === 100 ? '0 0 10px #2E7D5B' : '0 0 10px #1769AA',
            }}
          />
        </div>

        {/* Buttons / Transition */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', color: '#5E6B78' }}>
            Press Enter or click button to proceed to the Live Control Center
          </div>

          <button
            onClick={handleEnter}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              backgroundColor: isReady ? '#1769AA' : '#1E262E',
              color: isReady ? '#FFFFFF' : '#8A9BA8',
              border: isReady ? '1px solid #64B5F6' : '1px solid #28323B',
              borderRadius: 4,
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isReady ? '0 0 16px rgba(23, 105, 170, 0.4)' : 'none',
            }}
          >
            {isReady && <CheckCircle2 size={16} color="#FFFFFF" />}
            {isReady ? 'ENTER CONTROL ROOM' : 'SKIP TO DASHBOARD'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Preloader;
