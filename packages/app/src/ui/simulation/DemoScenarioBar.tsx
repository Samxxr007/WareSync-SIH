import React, { useState } from 'react';
import { PlayCircle, FastForward, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useSimulationStore } from '../../store/simulationStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import { colors } from '../../design-system/tokens';

export const DemoScenarioBar: React.FC = () => {
  const { setActiveNav, setMode, setSideBySideMode } = useUIStore();
  const { model } = useWarehouseStore();
  const { play, pause, setSpeed, triggerEmergency, setMode: setSimMode } = useSimulationStore();
  const { setSelectedObjectId } = useSelectionStore();

  const [currentStep, setCurrentStep] = useState(0);

  const demoSteps = [
    {
      title: '1. Facility Overview',
      action: () => {
        setActiveNav('Overview');
      },
    },
    {
      title: '2. 3D Digital Twin & Designer',
      action: () => {
        setActiveNav('Designer');
        setMode('DESIGN');
      },
    },
    {
      title: '3. Inspect R12 High-Bay Rack',
      action: () => {
        setActiveNav('Designer');
        setSelectedObjectId('R12');
      },
    },
    {
      title: '4. Start Multi-AMR Simulation',
      action: () => {
        setActiveNav('Simulation');
        setMode('SIMULATE');
        setSideBySideMode(false);
        setSimMode('PROPOSED', model);
        setSpeed(2);
        play();
      },
    },
    {
      title: '5. Trigger Intersection Conflict & Resolution',
      action: () => {
        setActiveNav('Simulation');
        const amr1 = model.floors.flatMap((f) => f.objects).find((o) => o.id === 'AMR-01');
        if (amr1) setSelectedObjectId(amr1.id);
      },
    },
    {
      title: '6. Block Main Aisle & Trigger SIPP Reroute',
      action: () => {
        triggerEmergency('BLOCKED_AISLE', 'floor-1', ['node_floor-1_0_-4'], 'Pallet dropped in central corridor');
      },
    },
    {
      title: '7. Capability Filtering & Task Dispatch',
      action: () => {
        setActiveNav('Tasks');
      },
    },
    {
      title: '8. Simulate Hazard & Fire Emergency Isolation',
      action: () => {
        setActiveNav('Simulation');
        triggerEmergency('FIRE', 'floor-2', ['node_floor-2_0_0'], 'Thermal spike detected near Rack R12');
      },
    },
    {
      title: '9. Side-by-Side Baseline vs Proposed',
      action: () => {
        setActiveNav('Simulation');
        setSideBySideMode(true);
        setSimMode('SIDE_BY_SIDE', model);
        play();
      },
    },
    {
      title: '10. Benchmark & Improvement Metrics',
      action: () => {
        setActiveNav('Validation');
      },
    },
    {
      title: '11. Machine-Ready VDA5050 & ROS2 Export',
      action: () => {
        setActiveNav('Deployment');
      },
    },
  ];

  const handleNext = () => {
    const nextIdx = (currentStep + 1) % demoSteps.length;
    setCurrentStep(nextIdx);
    demoSteps[nextIdx]!.action();
  };

  const handleRunStep = (idx: number) => {
    setCurrentStep(idx);
    demoSteps[idx]!.action();
  };

  return (
    <div
      style={{
        height: 28,
        backgroundColor: '#FFFFFF',
        borderBottom: `1px solid ${colors.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '11px',
        fontFamily: "'IBM Plex Mono', monospace",
        zIndex: 44,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            color: colors.primary,
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <PlayCircle size={13} /> SIH DEMO FLOW:
        </span>
        <span style={{ fontWeight: 700, color: colors.textPrimary }}>
          {demoSteps[currentStep]!.title}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {demoSteps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleRunStep(idx)}
              style={{
                width: 18,
                height: 18,
                padding: 0,
                fontSize: '10px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: currentStep === idx ? colors.primary : colors.bgPanelSecondary,
                color: currentStep === idx ? colors.textInverse : colors.textMuted,
                borderColor: currentStep === idx ? colors.primary : colors.borderLight,
              }}
              title={s.title}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          onClick={handleNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: colors.bgHover,
            borderColor: colors.borderStrong,
          }}
        >
          NEXT STEP <FastForward size={11} />
        </button>
      </div>
    </div>
  );
};
