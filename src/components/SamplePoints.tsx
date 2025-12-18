import type { Distribution } from '../distributions/Distribution';
import { calcZ, type Vector2 } from '../core/utils';

interface SamplePointsProps {
  points: Vector2[];
  distribution: Distribution;
  maxDensity: number;
  maxPoints?: number;
  sphereSize?: number;
  show3D?: boolean;
}

export function SamplePoints({ points, distribution, maxDensity, maxPoints = 300, sphereSize = 1, show3D = true }: SamplePointsProps) {
  // Only show the last maxPoints samples for performance
  const start = Math.max(0, points.length - maxPoints);
  const visiblePoints = points.slice(start);

  if (visiblePoints.length === 0) return null;

  return (
    <group>
      {visiblePoints.map((point, i) => {
        // Normalize density same as terrain
        const normalizedDensity = distribution.density(point) / maxDensity;
        const z = calcZ(normalizedDensity, show3D) + 0.01;

        // Opacity and size based on age: older = more transparent/smaller, newer = more opaque/larger
        const age = i / visiblePoints.length;
        const opacity = 0.4 + age * 0.6;
        const scale = 0.6 + age * 0.4;

        return (
          <mesh
            key={`sample-${i}-${points.length}`}
            position={[point.x, z, point.y]}
            scale={scale}
          >
            <sphereGeometry args={[0.08 * sphereSize, 12, 12]} />
            <meshStandardMaterial
              color="#88ccff"
              emissive="#4488ff"
              emissiveIntensity={0.4}
              metalness={0.2}
              roughness={0.3}
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
