/**
 * ModeSelector — extracted standalone component that lets the operator switch
 * between simulation modes: PROPOSED (Live), BASELINE, and SIDE_BY_SIDE.
 * Reads/writes to simulationStore using the actual SimulationMode union type.
 */
import React from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import type { SimulationMode } from '@waresync/core';

const MODES: { id: SimulationMode; label: string; title: string }[] = [
  {
    id: 'PROPOSED',
    label: 'Live (Proposed)',
    title: 'Decentralised SIPP + Right-of-Way coordination',
  },
  {
    id: 'BASELINE',
    label: 'Baseline',
    title: 'Stop-and-wait FCFS — benchmark reference strategy',
  },
  {
    id: 'SIDE_BY_SIDE',
    label: 'Side-by-Side',
    title: 'Run Baseline and Proposed simultaneously and compare metrics',
  },
];

export const ModeSelector: React.FC = () => {
  const { mode, setMode } = useSimulationStore();
  const { model } = useWarehouseStore();

  return (
    <div
      style={{
        display: 'flex',
        gap: '2px',
        background: '#F3F5F7',
        border: '1px solid #D5DADE',
        borderRadius: '4px',
        padding: '2px',
      }}
    >
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            title={m.title}
            onClick={() => setMode(m.id, model)}
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: active ? 700 : 400,
              color: active ? '#ffffff' : '#5E6B78',
              background: active ? '#1769AA' : 'transparent',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.1s, color 0.1s',
              letterSpacing: '0.03em',
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
