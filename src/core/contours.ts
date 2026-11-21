import type { Bounds, Distribution } from '../distributions/Distribution';

// x1, y1, x2, y2 in distribution coordinates.
export type Segment = [number, number, number, number];

export interface DensityGrid {
  bounds: Bounds;
  resolution: number;
  values: Float64Array; // node (i, j) at values[i * (resolution + 1) + j], i along x
  max: number;
}

export function densityGrid(distribution: Distribution, resolution: number): DensityGrid {
  const bounds = distribution.bounds;
  const n = resolution + 1;
  const values = new Float64Array(n * n);
  let max = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = bounds.xMin + ((bounds.xMax - bounds.xMin) * i) / resolution;
      const y = bounds.yMin + ((bounds.yMax - bounds.yMin) * j) / resolution;
      const d = distribution.density({ x, y });
      values[i * n + j] = d;
      if (d > max) max = d;
    }
  }
  return { bounds, resolution, values, max };
}

// Edges: 0 = bottom (y0), 1 = right (x1), 2 = top (y1), 3 = left (x0).
const EDGES: [number, number][][] = [
  [], [[3, 0]], [[0, 1]], [[3, 1]], [[2, 3]], [[2, 0]], [[0, 1], [2, 3]], [[2, 1]],
  [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]], [[1, 3]], [[1, 0]], [[0, 3]], [],
];

// Marching squares on the grid nodes.
export function contourSegments({ bounds, resolution, values }: DensityGrid, threshold: number): Segment[] {
  const n = resolution + 1;
  const dx = (bounds.xMax - bounds.xMin) / resolution;
  const dy = (bounds.yMax - bounds.yMin) / resolution;
  const segments: Segment[] = [];
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const v00 = values[i * n + j];
      const v10 = values[(i + 1) * n + j];
      const v01 = values[i * n + j + 1];
      const v11 = values[(i + 1) * n + j + 1];
      const edges = EDGES[(v00 >= threshold ? 1 : 0) | (v10 >= threshold ? 2 : 0) | (v01 >= threshold ? 4 : 0) | (v11 >= threshold ? 8 : 0)];
      if (edges.length === 0) continue;
      const x0 = bounds.xMin + i * dx;
      const y0 = bounds.yMin + j * dy;
      const point = (edge: number): [number, number] => {
        const [va, vb, ax, ay, bx, by] =
          edge === 0 ? [v00, v10, x0, y0, x0 + dx, y0]
          : edge === 1 ? [v10, v11, x0 + dx, y0, x0 + dx, y0 + dy]
          : edge === 2 ? [v01, v11, x0, y0 + dy, x0 + dx, y0 + dy]
          : [v00, v01, x0, y0, x0, y0 + dy];
        const t = Math.abs(vb - va) < 1e-300 ? 0.5 : (threshold - va) / (vb - va);
        return [ax + t * (bx - ax), ay + t * (by - ay)];
      };
      for (const [e1, e2] of edges) segments.push([...point(e1), ...point(e2)]);
    }
  }
  return segments;
}
