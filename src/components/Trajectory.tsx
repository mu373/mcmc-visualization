import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Distribution } from '../distributions/Distribution';
import { calcZ, type Vector2 } from '../core/utils';

interface TrajectoryProps {
  path: Vector2[] | null;
  distribution: Distribution;
  maxDensity: number;
  showPoints?: boolean;
  show3D?: boolean;
}

export function Trajectory({ path, distribution, maxDensity, showPoints = false, show3D = true }: TrajectoryProps) {
  if (!path || path.length < 2) return null;

  const linePoints: [number, number, number][] = [];
  const vertexColors: THREE.Color[] = [];

  // Orange color for trajectory
  const baseColor = new THREE.Color('#ff8c00');

  path.forEach((p, i) => {
    const normalizedDensity = distribution.density(p) / maxDensity;
    const z = calcZ(normalizedDensity, show3D) + 0.01;
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
    <group>
      <Line
        points={linePoints}
        vertexColors={vertexColors as unknown as THREE.Color[]}
        lineWidth={3}
        transparent
        opacity={0.9}
      />
      {showPoints && linePoints.map((point, i) => (
        <mesh key={i} position={point}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color={vertexColors[i]} />
        </mesh>
      ))}
    </group>
  );
}
