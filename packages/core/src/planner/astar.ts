import { euclideanDistance, NavigationGraph } from '../compiler/navigationGraph.js';
import { Vec3 } from '../warehouse/types.js';

export interface PathStep {
  nodeId: string;
  position: Vec3;
  floorId: string;
  cumulativeDistance: number;
}

export interface AStarOptions {
  blockedNodeIds?: Set<string>;
  blockedEdgeIds?: Set<string>;
  maxSpeedMps?: number;
}

export function astar(
  graph: NavigationGraph,
  startNodeId: string,
  goalNodeId: string,
  options: AStarOptions = {}
): PathStep[] | null {
  const startNode = graph.nodes[startNodeId];
  const goalNode = graph.nodes[goalNodeId];

  if (!startNode || !goalNode) return null;
  if (startNodeId === goalNodeId) {
    return [{
      nodeId: startNode.id,
      position: startNode.position,
      floorId: startNode.floorId,
      cumulativeDistance: 0,
    }];
  }

  const blockedNodes = options.blockedNodeIds ?? new Set<string>();
  const blockedEdges = options.blockedEdgeIds ?? new Set<string>();

  const openSet = new Set<string>([startNodeId]);
  const cameFrom = new Map<string, { prevNodeId: string; distance: number }>();

  const gScore = new Map<string, number>();
  gScore.set(startNodeId, 0);

  const fScore = new Map<string, number>();
  fScore.set(startNodeId, euclideanDistance(startNode.position, goalNode.position));

  while (openSet.size > 0) {
    // Find node in openSet with lowest fScore
    let currentId: string | null = null;
    let lowestF = Infinity;

    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentId = id;
      }
    }

    if (!currentId) break;

    if (currentId === goalNodeId) {
      // Reconstruct path
      const path: PathStep[] = [];
      let curr: string | undefined = currentId;

      while (curr) {
        const node = graph.nodes[curr]!;
        const prevData = cameFrom.get(curr);
        path.unshift({
          nodeId: node.id,
          position: node.position,
          floorId: node.floorId,
          cumulativeDistance: gScore.get(curr) ?? 0,
        });
        curr = prevData?.prevNodeId;
      }
      return path;
    }

    openSet.delete(currentId);
    const currentNode = graph.nodes[currentId]!;
    const edgeIds = graph.adjacency[currentId] ?? [];

    for (const edgeId of edgeIds) {
      if (blockedEdges.has(edgeId)) continue;
      const edge = graph.edges[edgeId];
      if (!edge || edge.blocked) continue;

      const neighborId = edge.toNodeId;
      if (blockedNodes.has(neighborId) && neighborId !== goalNodeId) continue;

      const neighborNode = graph.nodes[neighborId];
      if (!neighborNode) continue;

      const tentativeG = (gScore.get(currentId) ?? Infinity) + edge.distanceMeters;

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, { prevNodeId: currentId, distance: edge.distanceMeters });
        gScore.set(neighborId, tentativeG);
        fScore.set(
          neighborId,
          tentativeG + euclideanDistance(neighborNode.position, goalNode.position)
        );
        openSet.add(neighborId);
      }
    }
  }

  return null; // No path found
}
