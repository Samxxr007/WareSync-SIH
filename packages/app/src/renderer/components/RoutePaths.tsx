import React from 'react';
import * as THREE from 'three';
import { RobotSimulationState } from '@waresync/core';
import { colors } from '../../design-system/tokens';

interface RoutePathsProps {
  robots: RobotSimulationState[];
  navGraphNodes: Record<string, { position: [number, number, number] }>;
}

export const RoutePaths: React.FC<RoutePathsProps> = ({
  robots,
  navGraphNodes,
}) => {
  return (
    <group>
      {robots.map((robot) => {
        if (!robot.currentRouteNodeIds || robot.currentRouteNodeIds.length < 2) {
          return null;
        }

        const points: THREE.Vector3[] = [
          new THREE.Vector3(robot.position[0], robot.position[1] + 0.05, robot.position[2]),
        ];

        for (const nodeId of robot.currentRouteNodeIds) {
          const node = navGraphNodes[nodeId];
          if (node) {
            points.push(new THREE.Vector3(node.position[0], node.position[1] + 0.05, node.position[2]));
          }
        }

        if (points.length < 2) return null;

        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

        let lineColor = colors.primary;
        if (robot.status === 'YIELDING') {
          lineColor = colors.warning;
        } else if (robot.status === 'FAULT' || robot.status === 'EMERGENCY_STOP') {
          lineColor = colors.critical;
        }

        return (
          <line key={`route_${robot.id}`} geometry={lineGeo}>
            <lineBasicMaterial
              color={lineColor}
              linewidth={1.5}
              transparent
              opacity={0.7}
            />
          </line>
        );
      })}
    </group>
  );
};
