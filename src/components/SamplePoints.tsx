import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Distribution } from '../distributions/Distribution';
import { calcZ, type Vector2 } from '../core/utils';

interface SamplePointsProps {
  points: Vector2[];
  capacity: number;
  distribution: Distribution;
  maxDensity: number;
  sphereSize?: number;
  show3D?: boolean;
}

const BASE_COLOR = new THREE.Color('#88ccff');

// One instanced sphere per visible sample: a single draw call regardless of count.
// Age fades through color rather than opacity, which instancing cannot vary per point.
export function SamplePoints({ points, capacity, distribution, maxDensity, sphereSize = 1, show3D = true }: SamplePointsProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!mesh.instanceColor) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const n = Math.min(points.length, capacity);
    const first = points.length - n;
    for (let i = 0; i < n; i++) {
      const p = points[first + i];
      const age = n > 1 ? i / (n - 1) : 1;
      const s = (0.6 + age * 0.4) * sphereSize;
      const z = calcZ(distribution.density(p) / maxDensity, show3D) + 0.01;
      mesh.setMatrixAt(i, matrix.makeScale(s, s, s).setPosition(p.x, z, p.y));
      mesh.setColorAt(i, color.copy(BASE_COLOR).multiplyScalar(0.25 + 0.75 * age));
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh key={capacity} ref={ref} args={[undefined, undefined, capacity]} frustumCulled={false}>
      <sphereGeometry args={[0.08, 12, 12]} />
      <meshStandardMaterial emissive="#4488ff" emissiveIntensity={0.15} metalness={0.2} roughness={0.3} />
    </instancedMesh>
  );
}
