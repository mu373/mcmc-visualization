import { useMemo } from 'react';
import * as THREE from 'three';
import type { Distribution } from '../distributions/Distribution';
import type { Vector2 } from '../core/utils';

interface MomentumVectorProps {
  position: Vector2 | null;
  momentum: Vector2 | null;
  distribution: Distribution;
  maxDensity: number;
  scale?: number;
}

export function MomentumVector({
  position,
  momentum,
  distribution,
  maxDensity,
  scale = 0.5
}: MomentumVectorProps) {
  const arrowGeometry = useMemo(() => {
    if (!position || !momentum) return null;

    const normalizedDensity = distribution.density(position) / maxDensity;
    const z = Math.pow(normalizedDensity, 0.8) * 3 + 0.15;

    // Scale momentum for visualization
    const length = Math.sqrt(momentum.x * momentum.x + momentum.y * momentum.y);
    if (length < 0.01) return null;

    const scaledLength = length * scale;
    const dir = new THREE.Vector3(momentum.x / length, 0, momentum.y / length);
    const origin = new THREE.Vector3(position.x, z + 0.1, position.y);

    return { origin, dir, length: scaledLength };
  }, [position, momentum, distribution, maxDensity, scale]);

  if (!arrowGeometry) return null;

  const { origin, dir, length } = arrowGeometry;

  // Arrow shaft
  const shaftLength = length * 0.7;
  const shaftEnd = origin.clone().add(dir.clone().multiplyScalar(shaftLength));

  // Arrow head
  const headLength = length * 0.3;
  const headWidth = 0.08;

  // Create arrow head geometry
  const headStart = shaftEnd.clone();
  const headEnd = headStart.clone().add(dir.clone().multiplyScalar(headLength));

  // Perpendicular direction for arrow head wings
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const wing1 = headStart.clone().add(perp.clone().multiplyScalar(headWidth));
  const wing2 = headStart.clone().add(perp.clone().multiplyScalar(-headWidth));

  return (
    <group>
      {/* Arrow shaft */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              origin.x, origin.y, origin.z,
              shaftEnd.x, shaftEnd.y, shaftEnd.z
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ffff" linewidth={2} />
      </line>

      {/* Arrow head */}
      <mesh>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={3}
            array={new Float32Array([
              headEnd.x, headEnd.y, headEnd.z,
              wing1.x, wing1.y, wing1.z,
              wing2.x, wing2.y, wing2.z
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
