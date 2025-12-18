import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Distribution } from '../distributions/Distribution';
import type { Vector2 } from '../core/utils';

interface ProposalGhostProps {
  position: Vector2 | null;
  distribution: Distribution;
  maxDensity: number;
  visible?: boolean;
}

export function ProposalGhost({ position, distribution, maxDensity, visible = true }: ProposalGhostProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate pulse effect
  useFrame((state) => {
    if (meshRef.current && position) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  if (!position || !visible) return null;

  const normalizedDensity = distribution.density(position) / maxDensity;
  const z = Math.pow(normalizedDensity, 0.8) * 3 + 0.2;

  return (
    <mesh ref={meshRef} position={[position.x, z, position.y]}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#fbbf24"
        emissiveIntensity={0.3}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}
