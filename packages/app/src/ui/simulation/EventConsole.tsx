import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import { EventLogLine } from '../../design-system/components/EventLogLine';
import { colors } from '../../design-system/tokens';

export const EventConsole: React.FC = () => {
  const { currentFrame } = useSimulationStore();
  const {
    consoleExpanded,
    setConsoleExpanded,
    selectedEventFilter,
    setSelectedEventFilter,
  } = useUIStore();

  const events = currentFrame?.events || [];
  const filters = ['ALL', 'ROBOT', 'TASK', 'CONFLICT', 'RESOURCE', 'SAFETY', 'SYSTEM'];

  const filteredEvents =
    selectedEventFilter === 'ALL'
      ? events
      : events.filter((e) => e.type === selectedEventFilter);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bgPanel,
        borderTop: `1px solid ${colors.borderLight}`,
        height: consoleExpanded ? 130 : 28,
        transition: 'height 0.2s ease',
        flexShrink: 0,
        zIndex: 30,
      }}
    >
      {/* Console Header Bar */}
      <div
        style={{
          height: 28,
          backgroundColor: colors.bgPanelSecondary,
          borderBottom: consoleExpanded ? `1px solid ${colors.borderLight}` : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: "'IBM Plex Mono', monospace",
              color: colors.textPrimary,
              letterSpacing: '0.04em',
            }}
          >
            LIVE EVENT LOG [{filteredEvents.length}]
          </span>

          {consoleExpanded && (
            <div style={{ display: 'flex', gap: 2 }}>
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedEventFilter(f)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    border: 'none',
                    borderRadius: 3,
                    backgroundColor: selectedEventFilter === f ? colors.bgActive : 'transparent',
                    color: selectedEventFilter === f ? colors.primary : colors.textMuted,
                    fontWeight: selectedEventFilter === f ? 700 : 500,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setConsoleExpanded(!consoleExpanded)}
          style={{
            border: 'none',
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            color: colors.textSecondary,
            padding: 2,
          }}
          title={consoleExpanded ? 'Collapse event console' : 'Expand event console'}
        >
          {consoleExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {/* Log Entries Viewport */}
      {consoleExpanded && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2px 0',
            backgroundColor: '#FCFDFE',
          }}
        >
          {filteredEvents.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: '11px', color: colors.textMuted, fontStyle: 'italic' }}>
              No operational events logged for filter [{selectedEventFilter}].
            </div>
          ) : (
            filteredEvents.map((e) => (
              <EventLogLine
                key={e.id}
                timestampSec={e.simTimeSec}
                type={e.type}
                message={e.message}
                severity={e.severity}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
