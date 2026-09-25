import { euclideanDistance, NavigationGraph } from '../compiler/navigationGraph.js';
import { DistributedIntentStore } from '../coordination/distributedIntentStore.js';
import { NodeReservation } from '../coordination/message.js';
import { Vec3 } from '../warehouse/types.js';

export interface SIPPStep {
  nodeId: string;
  position: Vec3;
  floorId: string;
  arrivalTimeSec: number;
  departureTimeSec: number;
}

export interface SIPPResult {
  steps: SIPPStep[];
  reservations: NodeReservation[];
  totalDurationSec: number;
}

export function planSIPP(
  graph: NavigationGraph,
  startNodeId: string,
  goalNodeId: string,
  startTimeSec: number,
  intentStore: DistributedIntentStore,
  robotId: string,
  speedMps = 1.2
): SIPPResult | null {
  const startNode = graph.nodes[startNodeId];
  const goalNode = graph.nodes[goalNodeId];

  if (!startNode || !goalNode) return null;

  interface SIPPNode {
    nodeId: string;
    intervalIdx: number;
    intervalStart: number;
    intervalEnd: number;
    gTime: number;
    fScore: number;
    parentKey: string | null;
  }

  const openQueue: SIPPNode[] = [];
  const closedSet = new Set<string>();
  const nodeLookup = new Map<string, SIPPNode>();

  const startIntervals = intentStore.getSafeIntervals(startNodeId, startTimeSec, startTimeSec + 3600, robotId);
  if (startIntervals.length === 0) return null;

  const firstInterval = startIntervals[0]!;
  const startKey = `${startNodeId}_0`;
  const startState: SIPPNode = {
    nodeId: startNodeId,
    intervalIdx: 0,
    intervalStart: firstInterval.startSec,
    intervalEnd: firstInterval.endSec,
    gTime: Math.max(startTimeSec, firstInterval.startSec),
    fScore: euclideanDistance(startNode.position, goalNode.position) / speedMps,
    parentKey: null,
  };

  openQueue.push(startState);
  nodeLookup.set(startKey, startState);

  while (openQueue.length > 0) {
    // Pop node with lowest fScore
    openQueue.sort((a, b) => a.fScore - b.fScore);
    const current = openQueue.shift()!;
    const currentKey = `${current.nodeId}_${current.intervalIdx}`;

    if (closedSet.has(currentKey)) continue;
    closedSet.add(currentKey);

    if (current.nodeId === goalNodeId) {
      // Reconstruct path
      const steps: SIPPStep[] = [];
      let currState: SIPPNode | undefined = current;

      while (currState) {
        const node = graph.nodes[currState.nodeId]!;
        steps.unshift({
          nodeId: node.id,
          position: node.position,
          floorId: node.floorId,
          arrivalTimeSec: currState.gTime,
          departureTimeSec: currState.gTime + 0.5, // 0.5s dwell
        });
        currState = currState.parentKey ? nodeLookup.get(currState.parentKey) : undefined;
      }

      // Convert steps into NodeReservations with safety buffer
      const reservations: NodeReservation[] = steps.map((s) => ({
        nodeId: s.nodeId,
        interval: {
          startSec: Math.max(0, s.arrivalTimeSec - 0.2),
          endSec: s.departureTimeSec + 0.5,
        },
        robotId,
      }));

      const totalDurationSec = current.gTime - startTimeSec;
      return { steps, reservations, totalDurationSec };
    }

    const edgeIds = graph.adjacency[current.nodeId] ?? [];
    const currentNode = graph.nodes[current.nodeId]!;

    for (const edgeId of edgeIds) {
      const edge = graph.edges[edgeId];
      if (!edge || edge.blocked) continue;

      const neighborId = edge.toNodeId;
      const neighborNode = graph.nodes[neighborId];
      if (!neighborNode) continue;

      const travelTime = edge.distanceMeters / (edge.maxSpeedMps || speedMps);
      const earliestArrival = current.gTime + travelTime;

      const neighborIntervals = intentStore.getSafeIntervals(
        neighborId,
        earliestArrival,
        earliestArrival + 3600,
        robotId
      );

      for (let i = 0; i < neighborIntervals.length; i++) {
        const interval = neighborIntervals[i]!;
        if (earliestArrival > interval.endSec) continue;

        const actualArrival = Math.max(earliestArrival, interval.startSec);
        const neighborKey = `${neighborId}_${i}`;

        if (closedSet.has(neighborKey)) continue;

        const tentativeG = actualArrival;
        const h = euclideanDistance(neighborNode.position, goalNode.position) / speedMps;
        const neighborState: SIPPNode = {
          nodeId: neighborId,
          intervalIdx: i,
          intervalStart: interval.startSec,
          intervalEnd: interval.endSec,
          gTime: tentativeG,
          fScore: tentativeG + h,
          parentKey: currentKey,
        };

        const existing = nodeLookup.get(neighborKey);
        if (!existing || tentativeG < existing.gTime) {
          nodeLookup.set(neighborKey, neighborState);
          openQueue.push(neighborState);
        }
      }
    }
  }

  return null;
}
