import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export type CameraPreset = 'ISOMETRIC' | 'TOP' | 'FLOOR' | 'RESET';

interface CameraControlsProps {
  preset?: CameraPreset;
}

export const CameraControls: React.FC<CameraControlsProps> = ({ preset }) => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (!controlsRef.current) return;

    if (preset === 'ISOMETRIC') {
      camera.position.set(35, 30, 35);
      controlsRef.current.target.set(0, 5, 0);
    } else if (preset === 'TOP') {
      camera.position.set(0, 55, 0.1);
      controlsRef.current.target.set(0, 0, 0);
    } else if (preset === 'FLOOR') {
      camera.position.set(0, 3, 20);
      controlsRef.current.target.set(0, 2, 0);
    } else if (preset === 'RESET') {
      camera.position.set(28, 22, 28);
      controlsRef.current.target.set(0, 4, 0);
    }

    controlsRef.current.update();
  }, [preset, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={5}
      maxDistance={120}
      maxPolarAngle={Math.PI / 2 - 0.05} // prevent going below floor
    />
  );
};
