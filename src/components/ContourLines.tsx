import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Distribution } from '../distributions/Distribution';
import { calcZ } from '../core/utils';
import { contourSegments, densityGrid } from '../core/contours';

interface ContourLinesProps {
  distribution: Distribution;
  levels?: number;
  resolution?: number;
  maxDensity: number;
  show3D?: boolean;
}

export function ContourLines({ distribution, levels = 10, resolution = 100, maxDensity, show3D = true }: ContourLinesProps) {
  const grid = useMemo(() => densityGrid(distribution, resolution), [distribution, resolution]);

  const geometries = useMemo(() => {
    const result: THREE.BufferGeometry[] = [];
    for (let level = 1; level <= levels; level++) {
      const threshold = (level / (levels + 1)) * maxDensity;
      const z = calcZ(threshold / maxDensity, show3D) + 0.01;
      // World X = distribution X, world Y = height, world Z = distribution Y
      const points = contourSegments(grid, threshold).flatMap(([x1, y1, x2, y2]) => [
        new THREE.Vector3(x1, z, y1),
        new THREE.Vector3(x2, z, y2),
      ]);
      if (points.length > 0) result.push(new THREE.BufferGeometry().setFromPoints(points));
    }
    return result;
  }, [grid, levels, maxDensity, show3D]);

  useEffect(() => () => geometries.forEach(g => g.dispose()), [geometries]);

  return (
    <group>
      {geometries.map((geometry, index) => (
        <lineSegments key={index} geometry={geometry}>
          <lineBasicMaterial color="#000000" opacity={0.7} transparent linewidth={1} />
        </lineSegments>
      ))}
    </group>
  );
}
