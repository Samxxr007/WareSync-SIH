import React from 'react';
import { useCompilerStore } from '../../store/compilerStore';
import { useSelectionStore } from '../../store/selectionStore';
import { CompilerOutputLine } from '../../design-system/components/CompilerOutputLine';
import { colors } from '../../design-system/tokens';

export const CompilerOutputPanel: React.FC = () => {
  const { lastResult } = useCompilerStore();
  const { setSelectedObjectId } = useSelectionStore();

  if (!lastResult) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 56,
        left: 220,
        right: 280,
        maxHeight: 200,
        backgroundColor: colors.bgPanel,
        border: `1px solid ${colors.borderStrong}`,
        borderRadius: 4,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 45,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '6px 10px',
          backgroundColor: colors.bgPanelSecondary,
          borderBottom: `1px solid ${colors.borderLight}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          fontWeight: 700,
        }}
      >
        <span style={{ color: lastResult.valid ? colors.success : colors.critical }}>
          {lastResult.valid ? '✓ WAREHOUSE COMPILATION SUCCESSFUL' : '✗ COMPILATION FAILED'}
        </span>
        <span style={{ color: colors.textMuted, fontSize: '10px' }}>
          {new Date(lastResult.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {lastResult.messages.map((msg, idx) => (
          <CompilerOutputLine
            key={idx}
            stage={msg.stage}
            severity={msg.severity}
            message={msg.message}
            onClick={msg.objectId ? () => setSelectedObjectId(msg.objectId!) : undefined}
          />
        ))}
      </div>
    </div>
  );
};
