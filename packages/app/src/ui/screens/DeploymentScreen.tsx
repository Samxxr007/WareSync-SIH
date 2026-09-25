import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { compileWarehouse, generateDeploymentPackage } from '@waresync/core';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { colors } from '../../design-system/tokens';

export const DeploymentScreen: React.FC = () => {
  const { model } = useWarehouseStore();

  const compilation = compileWarehouse(model);
  const pkg = generateDeploymentPackage(model, compilation);

  const fileNames = Object.keys(pkg.files);
  const [selectedFile, setSelectedFile] = useState(fileNames[0] || 'warehouse/layout.json');

  const handleDownload = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pkg.files, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `waresync_${model.id}_deployment_package.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ flex: 1, padding: 16, backgroundColor: colors.bgBase, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary }}>
            MACHINE-READY DEPLOYMENT CONFIGURATIONS
          </h2>
          <p style={{ fontSize: '12px', color: colors.textSecondary }}>
            Generated runtime parameters for VDA 5050, ROS2 Nav2, and robot execution controllers.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusBadge label="GENERATED & VALIDATED" tone="success" />
          <button
            onClick={handleDownload}
            style={{
              backgroundColor: colors.primary,
              color: colors.textInverse,
              borderColor: colors.primary,
              fontWeight: 700,
              fontSize: '11px',
              padding: '6px 14px',
            }}
          >
            EXPORT CONFIG PACKAGE (.JSON)
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          backgroundColor: colors.bgPanel,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {/* Left File Tree */}
        <div
          style={{
            width: 250,
            borderRight: `1px solid ${colors.borderLight}`,
            backgroundColor: colors.bgPanelSecondary,
            overflowY: 'auto',
            padding: '8px 0',
          }}
        >
          <div
            style={{
              padding: '4px 12px 8px',
              fontSize: '10px',
              fontWeight: 700,
              color: colors.textMuted,
              letterSpacing: '0.05em',
            }}
          >
            GENERATED ARTIFACTS
          </div>
          {fileNames.map((file) => {
            const isSelected = selectedFile === file;
            return (
              <div
                key={file}
                onClick={() => setSelectedFile(file)}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  cursor: 'pointer',
                  backgroundColor: isSelected ? colors.bgHover : 'transparent',
                  color: isSelected ? colors.primary : colors.textPrimary,
                  fontWeight: isSelected ? 700 : 500,
                  borderLeft: isSelected ? `3px solid ${colors.primary}` : '3px solid transparent',
                }}
              >
                {file}
              </div>
            );
          })}
        </div>

        {/* Right Code Viewer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: colors.bgPanelSecondary,
              borderBottom: `1px solid ${colors.borderLight}`,
              fontSize: '11px',
              fontFamily: "'IBM Plex Mono', monospace",
              color: colors.textSecondary,
              fontWeight: 600,
            }}
          >
            {selectedFile}
          </div>
          <pre
            style={{
              flex: 1,
              margin: 0,
              padding: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              lineHeight: 1.5,
              color: colors.textPrimary,
              overflowY: 'auto',
              backgroundColor: '#FAFBFC',
            }}
          >
            {pkg.files[selectedFile] || '// Empty content'}
          </pre>
        </div>
      </div>
    </div>
  );
};
