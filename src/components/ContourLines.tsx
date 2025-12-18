import { useMemo } from 'react';
import * as THREE from 'three';
import type { Distribution } from '../distributions/Distribution';

interface ContourLinesProps {
  distribution: Distribution;
  levels?: number;
  resolution?: number;
  maxDensity: number;
}

export function ContourLines({
  distribution,
  levels = 10,
  resolution = 100,
  maxDensity,
}: ContourLinesProps) {
  const contourGeometries = useMemo(() => {
    const { xMin, xMax, yMin, yMax } = distribution.bounds;
    const width = xMax - xMin;
    const height = yMax - yMin;

    // Sample density values on a grid
    const grid: number[][] = [];
    for (let i = 0; i <= resolution; i++) {
      const row: number[] = [];
      for (let j = 0; j <= resolution; j++) {
        const x = xMin + (width * i) / resolution;
        const y = yMin + (height * j) / resolution;
        row.push(distribution.density({ x, y }));
      }
      grid.push(row);
    }

    // Generate contour lines using marching squares
    const geometries: THREE.BufferGeometry[] = [];

    for (let level = 1; level <= levels; level++) {
      const threshold = (level / (levels + 1)) * maxDensity;
      const points: THREE.Vector3[] = [];

      for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
          const x0 = xMin + (width * i) / resolution;
          const x1 = xMin + (width * (i + 1)) / resolution;
          const y0 = yMin + (height * j) / resolution;
          const y1 = yMin + (height * (j + 1)) / resolution;

          const v00 = grid[i][j];
          const v10 = grid[i + 1][j];
          const v01 = grid[i][j + 1];
          const v11 = grid[i + 1][j + 1];

          // Marching squares - find edges where contour crosses
          const edges = getMarchingSquaresEdges(v00, v10, v01, v11, threshold);

          for (const edge of edges) {
            const p1 = interpolateEdge(edge[0], x0, x1, y0, y1, v00, v10, v01, v11, threshold);
            const p2 = interpolateEdge(edge[1], x0, x1, y0, y1, v00, v10, v01, v11, threshold);

            if (p1 && p2) {
              // Calculate z height for contour line (same formula as Terrain)
              const normalizedDensity = threshold / maxDensity;
              const z = Math.pow(normalizedDensity, 0.8) * 3 + 0.02; // Slightly above terrain

              // World X = distribution X, World Y = height, World Z = distribution Y
              points.push(new THREE.Vector3(p1.x, z, p1.y));
              points.push(new THREE.Vector3(p2.x, z, p2.y));
            }
          }
        }
      }

      if (points.length > 0) {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        geometries.push(geometry);
      }
    }

    return geometries;
  }, [distribution, levels, resolution, maxDensity]);

  return (
    <group>
      {contourGeometries.map((geometry, index) => (
        <lineSegments key={index} geometry={geometry}>
          <lineBasicMaterial color="#000000" opacity={0.7} transparent linewidth={1} />
        </lineSegments>
      ))}
    </group>
  );
}

// Edge indices: 0=bottom, 1=right, 2=top, 3=left
type Edge = 0 | 1 | 2 | 3;

function getMarchingSquaresEdges(v00: number, v10: number, v01: number, v11: number, threshold: number): [Edge, Edge][] {
  // Calculate case index based on which corners are above threshold
  const caseIndex =
    (v00 >= threshold ? 1 : 0) |
    (v10 >= threshold ? 2 : 0) |
    (v01 >= threshold ? 4 : 0) |
    (v11 >= threshold ? 8 : 0);

  // Lookup table for marching squares - which edges the contour crosses
  const edgeCases: Record<number, [Edge, Edge][]> = {
    0: [],
    1: [[3, 0]],
    2: [[0, 1]],
    3: [[3, 1]],
    4: [[2, 3]],
    5: [[2, 0]],
    6: [[0, 1], [2, 3]],
    7: [[2, 1]],
    8: [[1, 2]],
    9: [[3, 0], [1, 2]],
    10: [[0, 2]],
    11: [[3, 2]],
    12: [[1, 3]],
    13: [[1, 0]],
    14: [[0, 3]],
    15: [],
  };

  return edgeCases[caseIndex] || [];
}

function interpolateEdge(
  edge: Edge,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  v00: number,
  v10: number,
  v01: number,
  v11: number,
  threshold: number
): { x: number; y: number } | null {
  let va: number, vb: number;
  let ax: number, ay: number, bx: number, by: number;

  switch (edge) {
    case 0: // Bottom edge (y = y0)
      va = v00;
      vb = v10;
      ax = x0;
      ay = y0;
      bx = x1;
      by = y0;
      break;
    case 1: // Right edge (x = x1)
      va = v10;
      vb = v11;
      ax = x1;
      ay = y0;
      bx = x1;
      by = y1;
      break;
    case 2: // Top edge (y = y1)
      va = v01;
      vb = v11;
      ax = x0;
      ay = y1;
      bx = x1;
      by = y1;
      break;
    case 3: // Left edge (x = x0)
      va = v00;
      vb = v01;
      ax = x0;
      ay = y0;
      bx = x0;
      by = y1;
      break;
    default:
      return null;
  }

  if (Math.abs(vb - va) < 1e-10) {
    return { x: (ax + bx) / 2, y: (ay + by) / 2 };
  }

  const t = (threshold - va) / (vb - va);
  return {
    x: ax + t * (bx - ax),
    y: ay + t * (by - ay),
  };
}
