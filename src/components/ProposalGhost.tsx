import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Distribution } from '../distributions/Distribution';
import { calcZ, type Vector2 } from '../core/utils';

interface ProposalGhostProps {
  position: Vector2 | null;
  distribution: Distribution;
  maxDensity: number;
  visible?: boolean;
  show3D?: boolean;
  accepted?: boolean | null;  // null = pending, true = accepted, false = rejected
}

export function ProposalGhost({ position, distribution, maxDensity, visible = true, show3D = true, accepted = null }: ProposalGhostProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate pulse effect (only when pending)
  useFrame((state) => {
    if (meshRef.current && position && accepted === null) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  if (!position || !visible) return null;

  const normalizedDensity = distribution.density(position) / maxDensity;
  const z = calcZ(normalizedDensity, show3D) + 0.02;

  // Color based on accept/reject state
  const color = accepted === true ? '#22c55e' : accepted === false ? '#ef4444' : '#fbbf24';

  return (
    <mesh ref={meshRef} position={[position.x, z, position.y]}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}
