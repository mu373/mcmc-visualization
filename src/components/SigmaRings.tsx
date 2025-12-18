import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Vector2 } from '../core/utils';
import type { Distribution } from '../distributions/Distribution';

interface SigmaRingProps {
  position: Vector2 | null;
  sigma: number;
  distribution: Distribution;
  maxDensity: number;
  sigmaLevels?: number[];
}

export function SigmaRing({
  position,
  sigma,
  distribution,
  maxDensity,
  sigmaLevels = [1, 2, 3],
}: SigmaRingProps) {
  const rings = useMemo(() => {
    if (!position || sigma <= 0) return null;

    return sigmaLevels.map((level) => {
      const points: [number, number, number][] = [];
      const segments = 64;
      const radius = sigma * level;

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = position.x + Math.cos(angle) * radius;
        const z = position.y + Math.sin(angle) * radius;

        // Get height at this point on the terrain
        const density = distribution.density({ x, y: z });
        const normalizedDensity = density / maxDensity;
        const y = Math.pow(normalizedDensity, 0.8) * 3 + 0.05;

        points.push([x, y, z]);
      }

      return { level, points };
    });
  }, [position, sigma, distribution, maxDensity, sigmaLevels]);

  if (!rings) return null;

  const colors = ['#06b6d4', '#3b82f6', '#8b5cf6']; // cyan, blue, purple for 1σ, 2σ, 3σ

  return (
    <group>
      {rings.map((ring, index) => (
        <Line
          key={ring.level}
          points={ring.points}
          color={colors[index] || '#ffffff'}
          lineWidth={2}
          transparent
          opacity={0.6}
        />
      ))}
    </group>
  );
}
