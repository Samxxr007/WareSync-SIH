/**
 * ComparisonCharts — Recharts bar chart visualisation comparing Baseline vs.
 * Proposed coordination strategy across the key benchmark metrics.
 */
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ComparisonRunResults } from '@waresync/core';

interface ComparisonChartsProps {
  result: ComparisonRunResults;
}

const BASELINE_COLOR = '#C88900';
const PROPOSED_COLOR = '#1769AA';

export const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ result }) => {
  const { baselineMetrics: b, proposedMetrics: p } = result;

  const metricsData = [
    {
      name: 'Avg Task Time (s)',
      Baseline: +(b.avgTaskCompletionTimeSec ?? 0).toFixed(1),
      Proposed: +(p.avgTaskCompletionTimeSec ?? 0).toFixed(1),
    },
    {
      name: 'Total Wait (s)',
      Baseline: +b.totalWaitTimeSec.toFixed(1),
      Proposed: +p.totalWaitTimeSec.toFixed(1),
    },
    {
      name: 'Throughput (tasks/min)',
      Baseline: +b.taskThroughputPerMinute.toFixed(2),
      Proposed: +p.taskThroughputPerMinute.toFixed(2),
    },
    {
      name: 'Conflicts',
      Baseline: b.conflictsDetected,
      Proposed: p.conflictsDetected,
    },
    {
      name: 'Deadlocks',
      Baseline: b.deadlocksResolved,
      Proposed: p.deadlocksResolved,
    },
    {
      name: 'Energy (Wh)',
      Baseline: +b.energyConsumedWh.toFixed(1),
      Proposed: +p.energyConsumedWh.toFixed(1),
    },
  ];

  const improvementData = [
    { name: 'Task Time', improvement: result.completionTimeImprovementPercent },
    { name: 'Wait Time', improvement: result.waitTimeImprovementPercent },
    { name: 'Throughput', improvement: result.throughputImprovementPercent },
    { name: 'Deadlocks', improvement: result.deadlockReductionPercent },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Side-by-side metrics */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#5E6B78', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Metric Comparison
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={metricsData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF0" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5E6B78', fontFamily: 'Inter' }} />
            <YAxis tick={{ fontSize: 10, fill: '#5E6B78', fontFamily: 'IBM Plex Mono' }} />
            <Tooltip
              contentStyle={{ fontSize: '11px', fontFamily: 'Inter', border: '1px solid #D5DADE' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter' }} />
            <Bar dataKey="Baseline" fill={BASELINE_COLOR} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Proposed" fill={PROPOSED_COLOR} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Improvement percentages */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#5E6B78', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Improvement Over Baseline (%)
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={improvementData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF0" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5E6B78', fontFamily: 'Inter' }} />
            <YAxis
              tick={{ fontSize: 10, fill: '#5E6B78', fontFamily: 'IBM Plex Mono' }}
              unit="%"
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ fontSize: '11px', fontFamily: 'Inter', border: '1px solid #D5DADE' }}
              formatter={(v: number) => [`${v}%`, 'Improvement']}
            />
            <Bar
              dataKey="improvement"
              radius={[2, 2, 0, 0]}
              fill="#2E7D5B"
              // Negative bars (regression) shown in red
              label={{ position: 'top', fontSize: 10, fill: '#5E6B78', fontFamily: 'IBM Plex Mono' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ComparisonCharts;
