import type { Distribution } from '../distributions/Distribution';
import type { Vector2 } from '../core/utils';

interface WalkerProps {
  position: Vector2 | null;
  distribution: Distribution;
  maxDensity: number;
  color?: string;
  sphereSize?: number;
}

export function Walker({ position, distribution, maxDensity, color = '#4ade80', sphereSize = 1 }: WalkerProps) {
  if (!position) return null;

  const normalizedDensity = distribution.density(position) / maxDensity;
  const z = Math.pow(normalizedDensity, 0.8) * 3 + 0.2; // Slightly above terrain

  return (
    <mesh position={[position.x, z, position.y]}>
      <sphereGeometry args={[0.15 * sphereSize, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}
