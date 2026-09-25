import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { useSimulationStore } from '../../store/simulationStore';
import { RackObject } from '@waresync/core';
import { colors } from '../../design-system/tokens';

export const InventoryScreen: React.FC = () => {
  const { model } = useWarehouseStore();
  const { engine } = useSimulationStore();

  const [requestedSku, setRequestedSku] = useState('SKU-A');
  const [requestedQty, setRequestedQty] = useState(35);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);

  // Group inventory by SKU across all racks and floors
  const skuMap: Record<
    string,
    {
      sku: string;
      name: string;
      totalQty: number;
      locations: Array<{
        floorId: string;
        rackId: string;
        level: number;
        bay: number;
        qty: number;
      }>;
    }
  > = {};

  for (const floor of model.floors) {
    const racks = floor.objects.filter((o): o is RackObject => o.type === 'rack');
    for (const rack of racks) {
      for (const item of rack.inventory) {
        if (!skuMap[item.sku]) {
          skuMap[item.sku] = {
            sku: item.sku,
            name: item.name,
            totalQty: 0,
            locations: [],
          };
        }
        skuMap[item.sku]!.totalQty += item.quantity;
        skuMap[item.sku]!.locations.push({
          floorId: floor.id,
          rackId: rack.id,
          level: item.level,
          bay: item.bay,
          qty: item.quantity,
        });
      }
    }
  }

  const handleCreateTask = () => {
    const skuData = skuMap[requestedSku];
    if (!skuData) return;

    if (requestedQty > skuData.totalQty) {
      alert(`Requested quantity (${requestedQty}) exceeds available stock (${skuData.totalQty})`);
      return;
    }

    // Split across available locations
    let remaining = requestedQty;
    const taskAllocations: Array<{ rackId: string; floorId: string; level: number; qty: number }> = [];

    for (const loc of skuData.locations) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, loc.qty);
      taskAllocations.push({
        rackId: loc.rackId,
        floorId: loc.floorId,
        level: loc.level,
        qty: take,
      });
      remaining -= take;
    }

    // Dispatch to simulation engine
    if (engine) {
      const newTasks = taskAllocations.map((alloc, idx) => ({
        id: `${Math.floor(1000 + Math.random() * 9000)}_${idx + 1}`,
        sku: requestedSku,
        quantity: alloc.qty,
        pickupRackId: alloc.rackId,
        pickupFloorId: alloc.floorId,
        pickupLevel: alloc.level,
        dropStationId: 'PACK-01',
        dropFloorId: 'floor-1',
        weightKg: alloc.qty * 1.5,
        priority: 'HIGH' as const,
        status: 'PENDING' as const,
        createdTimeSec: 0,
      }));
      engine.addTasks(newTasks);
    }

    setTaskNotice(
      `Dispatched Retrieval Task: ${requestedQty}x ${requestedSku} split across ${taskAllocations.length} storage location(s).`
    );
  };

  return (
    <div style={{ flex: 1, padding: 16, backgroundColor: colors.bgBase, overflowY: 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary }}>
          MULTI-LOCATION INVENTORY & REPLENISHMENT
        </h2>
        <p style={{ fontSize: '12px', color: colors.textSecondary }}>
          SKU catalog with decentralized multi-rack storage, level tracking, and split fulfillment tasks.
        </p>
      </div>

      {/* Task Creation Bar */}
      <div
        style={{
          padding: '12px',
          backgroundColor: colors.bgPanel,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: 4,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>RETRIEVAL SKU:</label>
          <select
            value={requestedSku}
            onChange={(e) => setRequestedSku(e.target.value)}
            style={{
              padding: '4px 8px',
              border: `1px solid ${colors.borderLight}`,
              borderRadius: 4,
              fontSize: '12px',
            }}
          >
            {Object.keys(skuMap).map((sku) => (
              <option key={sku} value={sku}>
                {sku} ({skuMap[sku]?.name})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>QUANTITY:</label>
          <input
            type="number"
            min={1}
            max={100}
            value={requestedQty}
            onChange={(e) => setRequestedQty(parseInt(e.target.value) || 1)}
            style={{
              width: 60,
              padding: '4px 8px',
              border: `1px solid ${colors.borderLight}`,
              borderRadius: 4,
              fontSize: '12px',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          />
        </div>

        <button
          onClick={handleCreateTask}
          style={{
            backgroundColor: colors.primary,
            color: colors.textInverse,
            borderColor: colors.primary,
            fontWeight: 700,
            fontSize: '11px',
            padding: '6px 14px',
          }}
        >
          DISPATCH RETRIEVAL TASK
        </button>

        {taskNotice && (
          <span
            style={{
              fontSize: '11px',
              color: colors.success,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            ✓ {taskNotice}
          </span>
        )}
      </div>

      {/* SKU Catalog Table */}
      <div
        style={{
          backgroundColor: colors.bgPanel,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr
              style={{
                backgroundColor: colors.bgPanelSecondary,
                borderBottom: `1px solid ${colors.borderLight}`,
                textAlign: 'left',
                color: colors.textSecondary,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
              }}
            >
              <th style={{ padding: '8px 12px' }}>SKU CODE</th>
              <th style={{ padding: '8px 12px' }}>ITEM DESCRIPTION</th>
              <th style={{ padding: '8px 12px' }}>TOTAL STOCK</th>
              <th style={{ padding: '8px 12px' }}>LOCATIONS (FLOOR / RACK / LEVEL / QTY)</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(skuMap).map((sku) => (
              <tr key={sku.sku} style={{ borderBottom: `1px solid ${colors.borderLight}44` }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {sku.sku}
                </td>
                <td style={{ padding: '8px 12px' }}>{sku.name}</td>
                <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
                  {sku.totalQty} units
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sku.locations.map((loc, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '11px',
                          fontFamily: "'IBM Plex Mono', monospace",
                          backgroundColor: colors.bgPanelSecondary,
                          border: `1px solid ${colors.borderLight}`,
                          borderRadius: 3,
                          padding: '2px 6px',
                        }}
                      >
                        {loc.floorId} / {loc.rackId} (L{loc.level}) →{' '}
                        <strong style={{ color: colors.primary }}>{loc.qty}</strong>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
