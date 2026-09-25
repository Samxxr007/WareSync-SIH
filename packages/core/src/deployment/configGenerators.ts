import { NavigationGraph } from '../compiler/navigationGraph.js';
import { CompilationResult } from '../compiler/compiler.js';
import { WarehouseModel } from '../warehouse/types.js';

export interface GeneratedDeploymentPackage {
  files: Record<string, string>;
  generatedAt: string;
  version: string;
}

export function generateDeploymentPackage(
  model: WarehouseModel,
  compilation: CompilationResult
): GeneratedDeploymentPackage {
  const files: Record<string, string> = {};

  // 1. /warehouse/layout.json
  files['warehouse/layout.json'] = JSON.stringify(
    {
      warehouseId: model.id,
      name: model.name,
      floors: model.floors.map((f) => ({
        id: f.id,
        level: f.levelIndex,
        dimensions: f.dimensions,
        elevationMeters: f.elevationMeters,
        objectCount: f.objects.length,
      })),
      navigationNodesCount: Object.keys(compilation.navGraph.nodes).length,
      navigationEdgesCount: Object.keys(compilation.navGraph.edges).length,
    },
    null,
    2
  );

  // 2. /warehouse/resources.json
  files['warehouse/resources.json'] = JSON.stringify(compilation.resources, null, 2);

  // 3. /warehouse/constraints.json
  files['warehouse/constraints.json'] = JSON.stringify(compilation.constraints, null, 2);

  // 4. /warehouse/zones.json
  const allZones = model.floors.flatMap((f) =>
    f.objects.filter((o) => ['hazard_zone', 'fire_zone', 'human_zone', 'restricted_zone'].includes(o.type))
  );
  files['warehouse/zones.json'] = JSON.stringify(allZones, null, 2);

  // 5. /robots/ per-AMR YAML configurations
  const amrs = model.floors.flatMap((f) => f.objects.filter((o) => o.type === 'amr'));
  for (const amr of amrs) {
    const a = amr as any;
    files[`robots/${amr.id}.yaml`] = `# WareSync Generated AMR Configuration
amr_id: "${amr.id}"
initial_floor: "${a.currentFloorId || amr.floorId}"
specs:
  max_speed_mps: ${a.maxSpeedMps || 1.2}
  payload_capacity_kg: ${a.payloadCapacityKg || 500}
  max_pickup_height_m: ${a.maxPickupHeightMeters || 4.5}
  battery_capacity_kwh: 5.2
capabilities:
${(a.capabilities || []).map((c: string) => `  - ${c}`).join('\n')}
kinematics:
  type: "DIFFERENTIAL_DRIVE"
  track_width_m: 0.65
  wheel_radius_m: 0.1
safety:
  lidar_emergency_stop_dist_m: 0.35
  warning_slowdown_dist_m: 1.0
`;
  }

  // 6. /fleet/fleet.yaml
  files['fleet/fleet.yaml'] = `# WareSync Decentralized Fleet Coordination Policy
fleet_id: "fleet-${model.id}"
coordination_protocol: "DECENTRALIZED_P2P"
heartbeat_interval_ms: 100
intent_broadcast_radius_m: 15.0
right_of_way_policy: "DYNAMIC_PRIORITY_WEIGHTED"
deadlock_recovery: "CYCLE_BREAK_RANDOMIZED_BACKOFF"
active_units:
${amrs.map((a) => `  - id: "${a.id}"`).join('\n')}
`;

  // 7. /deployment/vda5050/order.json
  files['deployment/vda5050/order.json'] = JSON.stringify(
    {
      headerId: 1001,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      manufacturer: 'WareSync Automation',
      serialNumber: 'FLEET-CONTROLLER-01',
      orderId: 'ORD-AUTO-SYNC-01',
      orderUpdateId: 0,
      nodes: Object.values(compilation.navGraph.nodes).slice(0, 10).map((n, idx) => ({
        nodeId: n.id,
        sequenceId: idx * 2,
        released: true,
        nodePosition: {
          x: n.position[0],
          y: n.position[2],
          mapId: n.floorId,
        },
      })),
      edges: Object.values(compilation.navGraph.edges).slice(0, 9).map((e, idx) => ({
        edgeId: e.id,
        sequenceId: idx * 2 + 1,
        startNodeId: e.fromNodeId,
        endNodeId: e.toNodeId,
        released: true,
        maxSpeed: e.maxSpeedMps,
      })),
    },
    null,
    2
  );

  // 8. /deployment/ros2/nav2_params.yaml
  files['deployment/ros2/nav2_params.yaml'] = `# WareSync Generated ROS2 Nav2 Parameters
amcl:
  ros__parameters:
    use_sim_time: True
    alpha1: 0.2
    alpha2: 0.2
    alpha3: 0.2
    alpha4: 0.2
    base_frame_id: "base_footprint"
    global_frame_id: "map"
    laser_min_range: 0.1
    laser_max_range: 25.0
planner_server:
  ros__parameters:
    expected_planner_frequency: 10.0
    use_sim_time: True
    planner_plugins: ["GridBased"]
    GridBased:
      plugin: "nav2_navfn_planner/NavfnPlanner"
      tolerance: 0.5
      use_astar: true
      allow_unknown: false
`;

  // 9. /warehouse/inventory.json
  // Derive inventory from rack objects across all floors
  const racks = model.floors.flatMap((f) =>
    f.objects.filter((o) => o.type === 'rack')
  );
  const inventoryItems = racks.flatMap((rack) => {
    const r = rack as any;
    const slots = r.slots || [];
    return slots
      .filter((s: any) => s.occupied)
      .map((s: any, idx: number) => ({
        itemId: `INV-${rack.id}-${idx}`,
        sku: s.sku || `SKU-${String(idx).padStart(4, '0')}`,
        quantity: s.quantity ?? 1,
        unit: s.unit || 'pallet',
        locationRackId: rack.id,
        locationSlot: idx,
        floorId: rack.floorId,
        lastUpdated: new Date().toISOString(),
      }));
  });
  files['warehouse/inventory.json'] = JSON.stringify(
    {
      warehouseId: model.id,
      generatedAt: new Date().toISOString(),
      totalItems: inventoryItems.length,
      items: inventoryItems,
    },
    null,
    2
  );

  // 10. /warehouse/tasks.json
  // Export pending task queue structure for hand-off to fleet management
  const taskQueue = racks.slice(0, 5).map((rack, idx) => ({
    taskId: `TASK-INIT-${String(idx + 1).padStart(3, '0')}`,
    type: 'RETRIEVE',
    priority: idx === 0 ? 'HIGH' : 'NORMAL',
    sourceRackId: rack.id,
    sourceSlot: 0,
    destinationNodeId: 'STAGING-OUT-1',
    requiredCapabilities: ((rack as any).requiredCapabilities || []),
    estimatedWeightKg: 120,
    createdAt: new Date().toISOString(),
    deadline: null,
  }));
  files['warehouse/tasks.json'] = JSON.stringify(
    {
      warehouseId: model.id,
      generatedAt: new Date().toISOString(),
      totalTasks: taskQueue.length,
      tasks: taskQueue,
    },
    null,
    2
  );

  return {
    files,
    generatedAt: new Date().toISOString(),
    version: model.version || '1.0.0',
  };
}
