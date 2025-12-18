import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Distribution } from '../distributions/Distribution';
import { calcZ, type Vector2 } from '../core/utils';

interface SampleTrailProps {
  points: Vector2[];
  distribution: Distribution;
  maxDensity: number;
  show3D?: boolean;
}

export function SampleTrail({ points, distribution, maxDensity, show3D = true }: SampleTrailProps) {
  // No useMemo - recalculate every render since points array is mutated
  if (points.length < 2) return null;

  const linePoints: [number, number, number][] = [];
  const vertexColors: THREE.Color[] = [];

  // Base color (gray for dark theme)
  const baseColor = new THREE.Color('#888');

  points.forEach((p, i) => {
    // Normalize density same as terrain
    const normalizedDensity = distribution.density(p) / maxDensity;
    const z = calcZ(normalizedDensity, show3D) + 0.01;
    linePoints.push([p.x, z, p.y]);

    // Fade from dark (old) to bright (new)
    const age = i / (points.length - 1);
    const intensity = 0.3 + age * 0.7;
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
      lineWidth={2}
      transparent
      opacity={0.85}
    />
  );
}
