import { Floor, RackObject, Vec3, WarehouseModel, WarehouseObject, ZoneObject } from '../warehouse/types.js';
import { addEdge, addNode, createEmptyGraph, euclideanDistance, NavigationGraph, NavNode } from './navigationGraph.js';

export interface CompilerMessage {
  stage: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  objectId?: string;
  floorId?: string;
}

export interface ResourceModel {
  elevators: Array<{
    id: string;
    capacity: number;
    connectedFloors: string[];
    travelSpeedMps: number;
  }>;
  chargers: Array<{
    id: string;
    floorId: string;
    capacity: number;
    chargeRateKw: number;
    position: Vec3;
  }>;
  corridors: Array<{
    id: string;
    floorId: string;
    capacity: number;
    isOneWay: boolean;
  }>;
}

export interface OperationalConstraint {
  id: string;
  type: string;
  targetId: string;
  description: string;
  enforced: boolean;
}

export interface CompilationResult {
  valid: boolean;
  navGraph: NavigationGraph;
  resources: ResourceModel;
  constraints: OperationalConstraint[];
  messages: CompilerMessage[];
  timestamp: string;
}

export function compileWarehouse(model: WarehouseModel): CompilationResult {
  const messages: CompilerMessage[] = [];
  const navGraph = createEmptyGraph();
  const constraints: OperationalConstraint[] = [];
  const resources: ResourceModel = {
    elevators: [],
    chargers: [],
    corridors: [],
  };

  // Stage 1: Geometry Validator
  for (const floor of model.floors) {
    if (floor.dimensions[0] <= 0 || floor.dimensions[1] <= 0) {
      messages.push({
        stage: 'GeometryValidator',
        severity: 'ERROR',
        message: `Floor ${floor.name} (${floor.id}) has invalid dimensions: ${floor.dimensions.join('x')}`,
        floorId: floor.id,
      });
    }

    const racks = floor.objects.filter((o): o is RackObject => o.type === 'rack');
    for (const rack of racks) {
      if (rack.levels <= 0 || rack.bays <= 0) {
        messages.push({
          stage: 'GeometryValidator',
          severity: 'ERROR',
          message: `Rack ${rack.id} has invalid bays (${rack.bays}) or levels (${rack.levels})`,
          objectId: rack.id,
          floorId: floor.id,
        });
      }
    }
  }

  // Stage 2: Navigation Graph Builder
  for (const floor of model.floors) {
    const floorY = floor.elevationMeters;

    // Generate aisle grid nodes
    const gridSpacing = 4.0;
    const [dimX, dimZ] = floor.dimensions;
    const startX = -dimX / 2 + 2;
    const endX = dimX / 2 - 2;
    const startZ = -dimZ / 2 + 2;
    const endZ = dimZ / 2 - 2;

    const floorNodes: Record<string, NavNode> = {};

    for (let x = startX; x <= endX; x += gridSpacing) {
      for (let z = startZ; z <= endZ; z += gridSpacing) {
        const nodeId = `node_${floor.id}_${Math.round(x)}_${Math.round(z)}`;
        const pos: Vec3 = [x, floorY, z];

        // Check if inside any obstacle, temporary blockage, or rack body
        const isBlocked = floor.objects.some((obj) => {
          if (obj.type !== 'obstacle' && obj.type !== 'temporary_blockage' && obj.type !== 'rack') return false;
          const [ox, , oz] = obj.position;
          const [dx, , dz] = obj.dimensions;
          return Math.abs(x - ox) < (dx / 2) + 0.2 && Math.abs(z - oz) < (dz / 2) + 0.2;
        });

        if (!isBlocked) {
          const navNode: NavNode = {
            id: nodeId,
            floorId: floor.id,
            position: pos,
            type: 'WAYPOINT',
          };
          addNode(navGraph, navNode);
          floorNodes[nodeId] = navNode;
        }
      }
    }

    // Connect adjacent nodes along X and Z axes
    const nodeList = Object.values(floorNodes);
    for (let i = 0; i < nodeList.length; i++) {
      const nodeA = nodeList[i]!;
      for (let j = i + 1; j < nodeList.length; j++) {
        const nodeB = nodeList[j]!;
        const dist = euclideanDistance(nodeA.position, nodeB.position);
        if (Math.abs(dist - gridSpacing) < 0.2) {
          // Adjacent grid node
          const edgeId = `edge_${nodeA.id}_${nodeB.id}`;
          addEdge(navGraph, {
            id: edgeId,
            fromNodeId: nodeA.id,
            toNodeId: nodeB.id,
            distanceMeters: dist,
            direction: 'TWO_WAY',
            maxSpeedMps: 1.5,
            capacity: 1,
            blocked: false,
            zoneRules: [],
          });
        }
      }
    }

    // Add object-specific stations / chargers / docks / racks
    for (const obj of floor.objects) {
      if (obj.type === 'charger') {
        const chargerNodeId = `charger_${obj.id}`;
        addNode(navGraph, {
          id: chargerNodeId,
          floorId: floor.id,
          position: [obj.position[0], floorY, obj.position[2]],
          type: 'CHARGER',
          associatedObjectId: obj.id,
        });

        // Link to nearest waypoint
        linkToNearestWaypoint(navGraph, chargerNodeId, floor.id, floorY);

        resources.chargers.push({
          id: obj.id,
          floorId: floor.id,
          capacity: (obj as any).capacityUnits || 1,
          chargeRateKw: (obj as any).chargeRateKw || 22,
          position: obj.position,
        });
      } else if (obj.type === 'rack') {
        const rack = obj as RackObject;
        const pickupNodeId = `pickup_${rack.id}`;
        // Access point in front of rack
        const accessZ = rack.position[2] + (rack.dimensions[2] / 2 + 1.0);
        addNode(navGraph, {
          id: pickupNodeId,
          floorId: floor.id,
          position: [rack.position[0], floorY, accessZ],
          type: 'RACK_PICKUP',
          associatedObjectId: rack.id,
        });

        linkToNearestWaypoint(navGraph, pickupNodeId, floor.id, floorY);

        if (rack.levels >= 4) {
          constraints.push({
            id: `const_high_rack_${rack.id}`,
            type: 'CAPABILITY_REQUIREMENT',
            targetId: rack.id,
            description: `Rack ${rack.id} (L${rack.levels}) requires HIGH_RACK capability`,
            enforced: true,
          });
        }
      } else if (obj.type === 'packing_station' || obj.type === 'loading_dock') {
        const stationNodeId = `station_${obj.id}`;
        addNode(navGraph, {
          id: stationNodeId,
          floorId: floor.id,
          position: [obj.position[0], floorY, obj.position[2]],
          type: obj.type === 'loading_dock' ? 'DOCK' : 'STATION',
          associatedObjectId: obj.id,
        });
        linkToNearestWaypoint(navGraph, stationNodeId, floor.id, floorY);
      } else if (obj.type === 'elevator') {
        resources.elevators.push({
          id: obj.id,
          capacity: (obj as any).capacityUnits || 1,
          connectedFloors: (obj as any).connectedFloors || model.floors.map((f) => f.id),
          travelSpeedMps: (obj as any).travelSpeedMps || 1.2,
        });

        // Add elevator entry node on this floor
        const elevNodeId = `elev_node_${obj.id}_${floor.id}`;
        addNode(navGraph, {
          id: elevNodeId,
          floorId: floor.id,
          position: [obj.position[0], floorY, obj.position[2]],
          type: 'ELEVATOR_ENTRY',
          associatedObjectId: obj.id,
        });
        linkToNearestWaypoint(navGraph, elevNodeId, floor.id, floorY);
      }
    }
  }

  // Stage 3: Floor Connections (Elevator shaft edges)
  for (const conn of model.connections) {
    if (conn.type === 'ELEVATOR') {
      const floors = conn.connectedFloors;
      for (let i = 0; i < floors.length - 1; i++) {
        const floorA = floors[i]!;
        const floorB = floors[i + 1]!;
        const nodeAId = `elev_node_${conn.id}_${floorA}`;
        const nodeBId = `elev_node_${conn.id}_${floorB}`;

        if (navGraph.nodes[nodeAId] && navGraph.nodes[nodeBId]) {
          addEdge(navGraph, {
            id: `elev_edge_${nodeAId}_${nodeBId}`,
            fromNodeId: nodeAId,
            toNodeId: nodeBId,
            distanceMeters: 5.0, // vertical transit cost
            direction: 'TWO_WAY',
            maxSpeedMps: 1.0,
            capacity: 1, // exclusive shared resource
            blocked: false,
            zoneRules: ['ELEVATOR_EXCLUSIVE'],
          });
        }
      }
    }
  }

  // Stage 4: Zone mapping & rules derivation
  for (const floor of model.floors) {
    const zones = floor.objects.filter((o): o is ZoneObject =>
      ['hazard_zone', 'fire_zone', 'human_zone', 'restricted_zone'].includes(o.type)
    );

    for (const zone of zones) {
      if (zone.active) {
        constraints.push({
          id: `const_zone_${zone.id}`,
          type: zone.zoneType,
          targetId: zone.id,
          description: `Active zone constraint on floor ${floor.name}: ${zone.zoneType}`,
          enforced: true,
        });
      }
    }
  }

  const errorCount = messages.filter((m) => m.severity === 'ERROR').length;
  const valid = errorCount === 0;

  messages.push({
    stage: 'CompilerSummary',
    severity: valid ? 'INFO' : 'ERROR',
    message: valid
      ? `Compilation successful: ${Object.keys(navGraph.nodes).length} nodes, ${Object.keys(navGraph.edges).length} edges, ${resources.elevators.length} elevators, ${resources.chargers.length} chargers.`
      : `Compilation failed with ${errorCount} error(s).`,
  });

  return {
    valid,
    navGraph,
    resources,
    constraints,
    messages,
    timestamp: new Date().toISOString(),
  };
}

function linkToNearestWaypoint(
  graph: NavigationGraph,
  sourceNodeId: string,
  floorId: string,
  floorY: number
): void {
  const sourceNode = graph.nodes[sourceNodeId];
  if (!sourceNode) return;

  let nearestNode: NavNode | null = null;
  let minDistance = Infinity;

  for (const node of Object.values(graph.nodes)) {
    if (node.floorId === floorId && node.type === 'WAYPOINT') {
      const dist = euclideanDistance(sourceNode.position, node.position);
      if (dist < minDistance && dist > 0.01) {
        minDistance = dist;
        nearestNode = node;
      }
    }
  }

  if (nearestNode) {
    addEdge(graph, {
      id: `link_${sourceNodeId}_${nearestNode.id}`,
      fromNodeId: sourceNodeId,
      toNodeId: nearestNode.id,
      distanceMeters: minDistance,
      direction: 'TWO_WAY',
      maxSpeedMps: 1.2,
      capacity: 1,
      blocked: false,
      zoneRules: [],
    });
  }
}
