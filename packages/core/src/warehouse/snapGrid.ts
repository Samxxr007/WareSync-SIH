import { Vec3, WarehouseObject } from './types.js';

export interface BoundingBox3D {
  min: Vec3;
  max: Vec3;
}

export interface AlignmentGuide {
  axis: 'x' | 'z';
  position: number;
  start: number;
  end: number;
}

export function snapToGrid(value: number, gridSize = 0.5): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPoint3D(point: Vec3, gridSize = 0.5): Vec3 {
  return [
    snapToGrid(point[0], gridSize),
    point[1], // preserve vertical/elevation
    snapToGrid(point[2], gridSize),
  ];
}

export function computeBoundingBox(obj: WarehouseObject): BoundingBox3D {
  const [px, py, pz] = obj.position;
  const [dx, dy, dz] = obj.dimensions;

  const halfX = dx / 2;
  const halfZ = dz / 2;

  return {
    min: [px - halfX, py, pz - halfZ],
    max: [px + halfX, py + dy, pz + halfZ],
  };
}

export function checkOverlap(boxA: BoundingBox3D, boxB: BoundingBox3D, tolerance = 0.05): boolean {
  return (
    boxA.min[0] < boxB.max[0] - tolerance &&
    boxA.max[0] > boxB.min[0] + tolerance &&
    boxA.min[2] < boxB.max[2] - tolerance &&
    boxA.max[2] > boxB.min[2] + tolerance
  );
}

export function findAlignmentGuides(
  targetPos: Vec3,
  existingObjects: WarehouseObject[],
  threshold = 0.25
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];
  const [tx, , tz] = targetPos;

  for (const obj of existingObjects) {
    const [ox, , oz] = obj.position;

    // Check X alignment (same X position)
    if (Math.abs(ox - tx) <= threshold) {
      guides.push({
        axis: 'x',
        position: ox,
        start: Math.min(tz, oz) - 2,
        end: Math.max(tz, oz) + 2,
      });
    }

    // Check Z alignment (same Z position)
    if (Math.abs(oz - tz) <= threshold) {
      guides.push({
        axis: 'z',
        position: oz,
        start: Math.min(tx, ox) - 2,
        end: Math.max(tx, ox) + 2,
      });
    }
  }

  return guides;
}
