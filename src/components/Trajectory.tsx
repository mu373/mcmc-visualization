import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Distribution } from '../distributions/Distribution';
import type { Vector2 } from '../core/utils';

interface TrajectoryProps {
  path: Vector2[] | null;
  distribution: Distribution;
  maxDensity: number;
}

export function Trajectory({ path, distribution, maxDensity }: TrajectoryProps) {
  if (!path || path.length < 2) return null;

  const linePoints: [number, number, number][] = [];
  const vertexColors: THREE.Color[] = [];

  // Orange color for trajectory
  const baseColor = new THREE.Color('#ff8c00');

  path.forEach((p, i) => {
    const normalizedDensity = distribution.density(p) / maxDensity;
    const z = Math.pow(normalizedDensity, 0.8) * 3 + 0.15;
    linePoints.push([p.x, z, p.y]);

    // Gradient from start to end of trajectory
    const progress = i / (path.length - 1);
    const intensity = 0.5 + progress * 0.5;
    vertexColors.push(new THREE.Color(
      baseColor.r * intensity,
      baseColor.g * intensity,
      baseColor.b * intensity
    ));
  });

  return (
    <Line
      points={linePoints}
      vertexColors={vertexColors as unknown as THREE.Color[]}
      lineWidth={3}
      transparent
      opacity={0.9}
    />
  );
}
