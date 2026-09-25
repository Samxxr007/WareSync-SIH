/**
 * CompileButton — standalone button that triggers warehouse compilation.
 * Reads compiler status from compilerStore and warehouse from warehouseStore.
 * Can be embedded in any layout location (TopBar, sidebar, etc.).
 */
import React from 'react';
import { compileWarehouse } from '@waresync/core';
import { useCompilerStore } from '../../store/compilerStore';
import { useWarehouseStore } from '../../store/warehouseStore';

interface CompileButtonProps {
  /** Compact mode shows only icon + short label */
  compact?: boolean;
}

export const CompileButton: React.FC<CompileButtonProps> = ({ compact = false }) => {
  const { status, setStatus, setResult } = useCompilerStore();
  const { warehouse } = useWarehouseStore();

  const isRunning = status === 'compiling';

  const handleCompile = async () => {
    if (isRunning) return;
    setStatus('compiling');
    try {
      // Compile is synchronous in core — wrap in microtask to unblock UI paint
      await Promise.resolve();
      const result = compileWarehouse(warehouse);
      setResult(result);
      setStatus(result.success ? 'success' : 'error');
    } catch (err) {
      console.error('[CompileButton] Compilation failed:', err);
      setStatus('error');
    }
  };

  const label = isRunning ? 'Compiling…' : compact ? 'Compile' : 'Compile Warehouse';

  const bg = isRunning
    ? '#3D4852'
    : status === 'success'
    ? '#2E7D5B'
    : status === 'error'
    ? '#C63D3D'
    : '#1769AA';

  return (
    <button
      onClick={handleCompile}
      disabled={isRunning}
      title="Compile warehouse layout into operational model"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: bg,
        color: '#ffffff',
        border: 'none',
        borderRadius: '3px',
        padding: compact ? '4px 10px' : '5px 14px',
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        letterSpacing: '0.04em',
        cursor: isRunning ? 'not-allowed' : 'pointer',
        opacity: isRunning ? 0.75 : 1,
        transition: 'background 0.15s, opacity 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Spinner or icon */}
      {isRunning ? (
        <span
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      ) : (
        <span style={{ fontSize: '13px' }}>⚙</span>
      )}
      {label}
    </button>
  );
};

export default CompileButton;
