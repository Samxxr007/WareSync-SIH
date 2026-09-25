import React from 'react';
import {
  BarChart2,
  Boxes,
  Cpu,
  Layers,
  LayoutDashboard,
  ListTodo,
  Network,
  Package,
  Radio,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { colors } from '../design-system/tokens';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const LeftNav: React.FC = () => {
  const { activeNav, setActiveNav, setMode } = useUIStore();

  const navItems: NavItem[] = [
    { id: 'Overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'Designer', label: 'Warehouse Designer', icon: <Layers size={16} /> },
    { id: 'Simulation', label: 'Simulation', icon: <Cpu size={16} /> },
    { id: 'Fleet', label: 'AMR Fleet', icon: <Radio size={16} /> },
    { id: 'Tasks', label: 'Tasks & Routing', icon: <ListTodo size={16} /> },
    { id: 'Inventory', label: 'Inventory', icon: <Package size={16} /> },
    { id: 'Resources', label: 'Resources', icon: <Workflow size={16} /> },
    { id: 'Rules', label: 'Dynamic Rules', icon: <SlidersHorizontal size={16} /> },
    { id: 'Validation', label: 'Validation', icon: <Network size={16} /> },
    { id: 'Benchmark', label: 'Benchmark', icon: <BarChart2 size={16} /> },
    { id: 'Deployment', label: 'Deployment Artifacts', icon: <Boxes size={16} /> },
  ];

  const handleNavClick = (id: string) => {
    setActiveNav(id);
    if (id === 'Designer') setMode('DESIGN');
    else if (id === 'Simulation') setMode('SIMULATE');
    else if (id === 'Fleet') setMode('OPERATE');
    else if (id === 'Validation') setMode('VALIDATE');
    else if (id === 'Deployment') setMode('DEPLOY');
  };

  return (
    <aside
      style={{
        width: 190,
        backgroundColor: colors.bgPanel,
        borderRight: `1px solid ${colors.borderLight}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 6px',
        gap: 2,
        flexShrink: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: colors.textMuted,
          padding: '6px 8px 4px',
        }}
      >
        CONTROL CENTER
      </div>

      {navItems.map((item) => {
        const isActive = activeNav === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 8px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: isActive ? colors.bgHover : 'transparent',
              color: isActive ? colors.primary : colors.textSecondary,
              fontWeight: isActive ? 600 : 500,
              fontSize: '12px',
              textAlign: 'left',
              width: '100%',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                display: 'flex',
                color: isActive ? colors.primary : colors.textMuted,
              }}
            >
              {item.icon}
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
};
