/**
 * ZoneOverlay — renders semi-transparent zone polygon overlays in the 3D scene.
 * Each zone is visualised as a flat box on the floor with a colour-coded fill
 * and a label rendered via Drei <Html>.
 */
import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { WarehouseZone } from '@waresync/core';

const ZONE_COLORS: Record<string, string> = {
  storage: '#1769AA',
  staging: '#C88900',
  charging: '#2E7D5B',
  emergency: '#C63D3D',
  restricted: '#8B3A8B',
  transit: '#5E6B78',
};

interface ZoneOverlayProps {
  zones: WarehouseZone[];
  /** floor Y offset so the overlay sits just above the slab */
  floorY?: number;
  visible?: boolean;
}

export const ZoneOverlay: React.FC<ZoneOverlayProps> = ({
  zones,
  floorY = 0.02,
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <group name="zone-overlays">
      {zones.map((zone) => {
        const color = ZONE_COLORS[zone.type] ?? '#888888';
        const cx = (zone.bounds.min.x + zone.bounds.max.x) / 2;
        const cz = (zone.bounds.min.z + zone.bounds.max.z) / 2;
        const w = Math.abs(zone.bounds.max.x - zone.bounds.min.x);
        const d = Math.abs(zone.bounds.max.z - zone.bounds.min.z);

        return (
          <group key={zone.id} position={[cx, floorY, cz]}>
            {/* Filled translucent slab */}
            <mesh>
              <boxGeometry args={[w, 0.01, d]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.18}
                depthWrite={false}
              />
            </mesh>

            {/* Border wireframe */}
            <lineSegments>
              <edgesGeometry
                args={[new THREE.BoxGeometry(w, 0.01, d)]}
              />
              <lineBasicMaterial color={color} transparent opacity={0.6} />
            </lineSegments>

            {/* Zone label */}
            <Html
              center
              position={[0, 0.15, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <div
                style={{
                  background: color,
                  color: '#fff',
                  fontSize: '10px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '2px',
                  whiteSpace: 'nowrap',
                  opacity: 0.9,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {zone.name ?? zone.type}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};

export default ZoneOverlay;
