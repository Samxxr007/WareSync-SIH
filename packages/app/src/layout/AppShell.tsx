import React, { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useWarehouseStore } from '../store/warehouseStore';
import { useSimulationStore } from '../store/simulationStore';
import { TopBar } from './TopBar';
import { LeftNav } from './LeftNav';
import { LeftToolbox } from '../ui/designer/LeftToolbox';
import { InspectorPanel } from '../ui/inspector/InspectorPanel';
import { WarehouseScene } from '../renderer/WarehouseScene';
import { SideBySideScene } from '../renderer/SideBySideScene';
import { SimulationControls } from '../ui/simulation/SimulationControls';
import { EventConsole } from '../ui/simulation/EventConsole';
import { CompilerOutputPanel } from '../ui/designer/CompilerOutputPanel';
import { ConflictNotification } from '../ui/simulation/ConflictNotification';
import { EmergencyPanel } from '../ui/simulation/EmergencyPanel';
import { DemoScenarioBar } from '../ui/simulation/DemoScenarioBar';
import { OverviewScreen } from '../ui/screens/OverviewScreen';
import { FleetScreen } from '../ui/screens/FleetScreen';
import { TasksScreen } from '../ui/screens/TasksScreen';
import { InventoryScreen } from '../ui/screens/InventoryScreen';
import { ResourcesScreen } from '../ui/screens/ResourcesScreen';
import { RulesScreen } from '../ui/screens/RulesScreen';
import { ValidationScreen } from '../ui/screens/ValidationScreen';
import { DeploymentScreen } from '../ui/screens/DeploymentScreen';
import { NetworkScreen } from '../ui/screens/NetworkScreen';
import { BenchmarkScreen } from '../ui/benchmark/BenchmarkScreen';
import { Preloader } from '../ui/preloader/Preloader';
import { DragOverlayHtml } from '../ui/designer/DragOverlay';
import { colors } from '../design-system/tokens';

export const AppShell: React.FC = () => {
  const { activeNav, sideBySideMode } = useUIStore();
  const { model } = useWarehouseStore();
  const { initSimulation } = useSimulationStore();

  // Initialize simulation on mount
  useEffect(() => {
    initSimulation(model, 'PROPOSED');
  }, []);

  const renderMainCenter = () => {
    if (activeNav === 'Overview') return <OverviewScreen />;
    if (activeNav === 'Network') return <NetworkScreen />;
    if (activeNav === 'Fleet') return <FleetScreen />;
    if (activeNav === 'Tasks') return <TasksScreen />;
    if (activeNav === 'Inventory') return <InventoryScreen />;
    if (activeNav === 'Resources') return <ResourcesScreen />;
    if (activeNav === 'Rules') return <RulesScreen />;
    if (activeNav === 'Validation') return <ValidationScreen />;
    if (activeNav === 'Benchmark') return <BenchmarkScreen />;
    if (activeNav === 'Deployment') return <DeploymentScreen />;

    // Designer & Simulation render 3D scenes
    if (sideBySideMode) {
      return <SideBySideScene />;
    }

    return <WarehouseScene />;
  };

  const showToolbox = activeNav === 'Designer';
  const showInspector = ['Designer', 'Simulation', 'Fleet'].includes(activeNav) && !sideBySideMode;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: colors.bgBase,
        position: 'relative',
      }}
    >
      {/* 0. BOOT PRELOADER & DRAG OVERLAY */}
      <Preloader />
      <DragOverlayHtml />

      {/* 1. TOP BAR */}
      <TopBar />

      {/* 2. SIH DEMO FLOW SEQUENCER */}
      <DemoScenarioBar />

      {/* 3. FLOATING CONFLICT & EMERGENCY OVERLAYS */}
      <EmergencyPanel />
      <ConflictNotification />

      {/* 4. MAIN HORIZONTAL SPLIT */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left Primary Navigation Rail */}
        <LeftNav />

        {/* Optional Designer Toolbox */}
        {showToolbox && <LeftToolbox />}

        {/* Center Workspace */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {renderMainCenter()}
          {showToolbox && <CompilerOutputPanel />}
        </div>

        {/* Optional Right Inspector Panel */}
        {showInspector && <InspectorPanel />}
      </div>

      {/* 5. BOTTOM CONTROL BAR & CONSOLE */}
      <SimulationControls />
      <EventConsole />
    </div>
  );
};
