/**
 * AlignmentGuides — renders snap alignment guide lines inside the R3F Canvas.
 * Guide lines are drawn as thin Line segments using @react-three/drei <Line>.
 * They appear when an object is being placed / moved and aligns to a grid edge
 * or to the edge of another object.
 */
import React from 'react';
import { Line } from '@react-three/drei';
import type { AlignmentGuide } from '@waresync/core';

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
  /** Y level to draw the guides at (just above the floor) */
  y?: number;
  visible?: boolean;
}

/** Colour per axis */
const AXIS_COLOR: Record<string, string> = {
  x: '#C88900', // amber — vertical (Z-axis) guide line
  z: '#1769AA', // blue  — horizontal (X-axis) guide line
};

export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({
  guides,
  y = 0.05,
  visible = true,
}) => {
  if (!visible || guides.length === 0) return null;

  return (
    <group name="alignment-guides">
      {guides.map((g, i) => {
        const color = AXIS_COLOR[g.axis] ?? '#FF00FF';

        // Each guide is an infinite line clipped to a reasonable extent
        const extent = 50;
        const start: [number, number, number] =
          g.axis === 'x'
            ? [-extent, y, g.value]
            : [g.value, y, -extent];
        const end: [number, number, number] =
          g.axis === 'x'
            ? [extent, y, g.value]
            : [g.value, y, extent];

        return (
          <Line
            key={i}
            points={[start, end]}
            color={color}
            lineWidth={1}
            dashed
            dashSize={0.3}
            dashOffset={0}
            gapSize={0.15}
          />
        );
      })}
    </group>
  );
};

export default AlignmentGuides;
