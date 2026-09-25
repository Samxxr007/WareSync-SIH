import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSimulationStore } from '../../store/simulationStore';
import { allocateTask, AMRObject, INITIAL_DEMO_TASKS, WarehouseTask } from '@waresync/core';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { colors } from '../../design-system/tokens';
import { AddTaskModal } from '../tasks/AddTaskModal';
import { Plus } from 'lucide-react';

export const TasksScreen: React.FC = () => {
  const { model } = useWarehouseStore();
  const { currentFrame } = useSimulationStore();

  const [allTasks, setAllTasks] = useState<WarehouseTask[]>(INITIAL_DEMO_TASKS);
  const [selectedTask, setSelectedTask] = useState<WarehouseTask>(INITIAL_DEMO_TASKS[0]!);
  const [assistanceDispatched, setAssistanceDispatched] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const availableAmrs = model.floors
    .flatMap((f) => f.objects.filter((o) => o.type === 'amr')) as AMRObject[];

  const allocationResult = allocateTask(selectedTask, availableAmrs, model.floors);

  const handleTaskCreated = (newTask: WarehouseTask) => {
    setAllTasks((prev) => [newTask, ...prev]);
    setSelectedTask(newTask);
    setAssistanceDispatched(null);
  };

  const handleDispatchAssistance = (type: 'HUMAN_WORKER' | 'FORKLIFT') => {
    setAssistanceDispatched(
      `Dispatched [${type}] to Rack ${selectedTask.pickupRackId} (Floor ${selectedTask.pickupFloorId}) for SKU ${selectedTask.sku}. ETA: 45s.`
    );
  };

  return (
    <div style={{ flex: 1, padding: 16, backgroundColor: colors.bgBase, overflowY: 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary }}>
          CAPABILITY-AWARE TASK DISPATCH & ASSISTANCE SYSTEM
        </h2>
        <p style={{ fontSize: '12px', color: colors.textSecondary }}>
          Evaluation of AMR retrieval capabilities, height requirements, multi-floor transitions, and human/forklift dispatch.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
        {/* Left Column: Tasks Queue */}
        <div
          style={{
            backgroundColor: colors.bgPanel,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: colors.bgPanelSecondary,
              borderBottom: `1px solid ${colors.borderLight}`,
              fontWeight: 700,
              fontSize: '11px',
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>ACTIVE & QUEUED WAREHOUSE TASKS ({allTasks.length})</span>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 700,
                backgroundColor: colors.primary,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              <Plus size={12} strokeWidth={2.5} /> NEW MISSION
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: colors.bgPanelSecondary,
                  borderBottom: `1px solid ${colors.borderLight}`,
                  textAlign: 'left',
                  color: colors.textMuted,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                }}
              >
                <th style={{ padding: '8px 10px' }}>TASK ID</th>
                <th style={{ padding: '8px 10px' }}>SKU</th>
                <th style={{ padding: '8px 10px' }}>PICKUP</th>
                <th style={{ padding: '8px 10px' }}>DROP</th>
                <th style={{ padding: '8px 10px' }}>REQ LEVEL</th>
                <th style={{ padding: '8px 10px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {allTasks.map((t) => {
                const isSelected = selectedTask.id === t.id;
                return (
                  <tr
                    key={t.id}
                    onClick={() => {
                      setSelectedTask(t);
                      setAssistanceDispatched(null);
                    }}
                    style={{
                      borderBottom: `1px solid ${colors.borderLight}33`,
                      backgroundColor: isSelected ? colors.bgHover : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                      TASK-{t.id}
                    </td>
                    <td style={{ padding: '8px 10px' }}>{t.sku} (x{t.quantity})</td>
                    <td style={{ padding: '8px 10px' }}>{t.pickupRackId}</td>
                    <td style={{ padding: '8px 10px' }}>{t.dropStationId}</td>
                    <td style={{ padding: '8px 10px', fontFamily: "'IBM Plex Mono', monospace" }}>
                      Level {t.pickupLevel} {t.pickupLevel >= 4 ? '⚠' : ''}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <StatusBadge label={t.status} tone={t.status === 'COMPLETED' ? 'success' : 'info'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Column: Capability Eligibility & Technical Explanation Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              backgroundColor: colors.bgPanel,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: 4,
              padding: 14,
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: colors.textPrimary, marginBottom: 8 }}>
              AMR CAPABILITY EVALUATION: TASK-{selectedTask.id}
            </div>

            <div
              style={{
                padding: '8px 10px',
                backgroundColor: colors.bgPanelSecondary,
                borderRadius: 4,
                marginBottom: 12,
                fontSize: '11px',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <div>SKU: <strong>{selectedTask.sku}</strong> | Qty: <strong>{selectedTask.quantity}</strong></div>
              <div>Pickup Location: <strong>Rack {selectedTask.pickupRackId} (Level {selectedTask.pickupLevel})</strong></div>
              <div>Requirement: {selectedTask.pickupLevel >= 4 ? 'HIGH_RACK RETRIEVAL CAPABILITY' : 'STANDARD RETRIEVAL'}</div>
            </div>

            <div style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: 6 }}>
              FLEET QUALIFICATION BREAKDOWN:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allocationResult.evaluations.map((evalItem) => (
                <div
                  key={evalItem.robotId}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 4,
                    border: `1px solid ${evalItem.eligible ? colors.borderLight : colors.borderLight}`,
                    backgroundColor: evalItem.eligible ? '#F7FCF9' : '#FCF8F8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {evalItem.robotId}
                    </div>
                    <div style={{ fontSize: '11px', color: colors.textSecondary }}>
                      {evalItem.reasons.join('; ')}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontSize: '10px',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 700,
                        backgroundColor: evalItem.eligible ? colors.successBg : colors.criticalBg,
                        color: evalItem.eligible ? colors.success : colors.critical,
                      }}
                    >
                      {evalItem.eligible ? 'QUALIFIED' : 'NOT CAPABLE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HUMAN / FORKLIFT ASSISTANCE DISPATCH PANEL */}
          <div
            style={{
              backgroundColor: colors.bgPanel,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: 4,
              padding: 14,
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: colors.textPrimary, marginBottom: 6 }}>
              OPERATIONAL ASSISTANCE DISPATCH
            </div>
            <p style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: 10 }}>
              If standard AMRs cannot retrieve high-bay inventory or specialized payloads, dispatch industrial assistance.
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleDispatchAssistance('HUMAN_WORKER')}
                style={{
                  flex: 1,
                  padding: '7px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: colors.bgPanelSecondary,
                }}
              >
                DISPATCH OPERATOR
              </button>
              <button
                onClick={() => handleDispatchAssistance('FORKLIFT')}
                style={{
                  flex: 1,
                  padding: '7px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: colors.bgPanelSecondary,
                }}
              >
                DISPATCH FORKLIFT
              </button>
            </div>

            {assistanceDispatched && (
              <div
                style={{
                  marginTop: 10,
                  padding: '6px 10px',
                  backgroundColor: colors.successBg,
                  color: colors.success,
                  fontSize: '11px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  borderRadius: 4,
                }}
              >
                ✓ {assistanceDispatched}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
};
