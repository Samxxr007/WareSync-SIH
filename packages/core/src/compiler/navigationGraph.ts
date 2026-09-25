import { Vec3 } from '../warehouse/types.js';

export type NodeType =
  | 'WAYPOINT'
  | 'AISLE'
  | 'INTERSECTION'
  | 'RACK_PICKUP'
  | 'CHARGER'
  | 'ELEVATOR_ENTRY'
  | 'ELEVATOR_CABIN'
  | 'ELEVATOR_EXIT'
  | 'STATION'
  | 'DOCK';

export interface NavNode {
  id: string;
  floorId: string;
  position: Vec3;
  type: NodeType;
  associatedObjectId?: string;
  isObstacle?: boolean;
}

export interface NavEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  direction: 'ONE_WAY' | 'TWO_WAY';
  maxSpeedMps: number;
  capacity: number; // max concurrent AMRs (usually 1 in narrow aisle)
  blocked: boolean;
  zoneRules: string[];
}

export interface NavigationGraph {
  nodes: Record<string, NavNode>;
  edges: Record<string, NavEdge>;
  // Adjacency mapping: nodeId -> outgoing edge IDs
  adjacency: Record<string, string[]>;
}

export function createEmptyGraph(): NavigationGraph {
  return {
    nodes: {},
    edges: {},
    adjacency: {},
  };
}

export function addNode(graph: NavigationGraph, node: NavNode): void {
  graph.nodes[node.id] = node;
  if (!graph.adjacency[node.id]) {
    graph.adjacency[node.id] = [];
  }
}

export function addEdge(graph: NavigationGraph, edge: NavEdge): void {
  graph.edges[edge.id] = edge;
  if (!graph.adjacency[edge.fromNodeId]) {
    graph.adjacency[edge.fromNodeId] = [];
  }
  graph.adjacency[edge.fromNodeId]!.push(edge.id);

  if (edge.direction === 'TWO_WAY') {
    const reverseEdgeId = `${edge.id}_rev`;
    const reverseEdge: NavEdge = {
      ...edge,
      id: reverseEdgeId,
      fromNodeId: edge.toNodeId,
      toNodeId: edge.fromNodeId,
    };
    graph.edges[reverseEdgeId] = reverseEdge;
    if (!graph.adjacency[edge.toNodeId]) {
      graph.adjacency[edge.toNodeId] = [];
    }
    graph.adjacency[edge.toNodeId]!.push(reverseEdgeId);
  }
}

export function euclideanDistance(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
