import type { Distribution } from '../distributions/Distribution';
import { calcZ, type Vector2 } from '../core/utils';

interface WalkerProps {
  position: Vector2 | null;
  distribution: Distribution;
  maxDensity: number;
  color?: string;
  sphereSize?: number;
  show3D?: boolean;
}

export function Walker({ position, distribution, maxDensity, color = '#4ade80', sphereSize = 1, show3D = true }: WalkerProps) {
  if (!position) return null;

  const normalizedDensity = distribution.density(position) / maxDensity;
  const z = calcZ(normalizedDensity, show3D) + 0.02;

  return (
    <mesh position={[position.x, z, position.y]}>
      <sphereGeometry args={[0.1 * sphereSize, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}
