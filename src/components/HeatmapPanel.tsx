import { useRef, useEffect } from 'react';
import type { Vector2 } from '../core/utils';
import type { Distribution } from '../distributions/Distribution';
import { getColor, type ColorScheme } from '../core/colormap';

interface HeatmapPanelProps {
  samples: Vector2[];
  sampleCount: number;
  distribution: Distribution;
  bins?: number;
  colorScheme?: ColorScheme;
  scale?: number;
  burnIn?: number;
  excludeBurnIn?: boolean;
}

const BASE_CANVAS_SIZE = 160;

// Marching squares edge lookup table
type Edge = 0 | 1 | 2 | 3; // 0=bottom, 1=right, 2=top, 3=left
const marchingSquaresEdges: Record<number, [Edge, Edge][]> = {
  0: [], 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[2, 3]], 5: [[2, 0]],
  6: [[0, 1], [2, 3]], 7: [[2, 1]], 8: [[1, 2]], 9: [[3, 0], [1, 2]],
  10: [[0, 2]], 11: [[3, 2]], 12: [[1, 3]], 13: [[1, 0]], 14: [[0, 3]], 15: [],
};

function interpolateEdge(
  edge: Edge, i: number, j: number, resolution: number,
  v00: number, v10: number, v01: number, v11: number, threshold: number
): { x: number; y: number } | null {
  let va: number, vb: number;
  let ax: number, ay: number, bx: number, by: number;
  const x0 = i / resolution, x1 = (i + 1) / resolution;
  const y0 = j / resolution, y1 = (j + 1) / resolution;

  switch (edge) {
    case 0: va = v00; vb = v10; ax = x0; ay = y0; bx = x1; by = y0; break;
    case 1: va = v10; vb = v11; ax = x1; ay = y0; bx = x1; by = y1; break;
    case 2: va = v01; vb = v11; ax = x0; ay = y1; bx = x1; by = y1; break;
    case 3: va = v00; vb = v01; ax = x0; ay = y0; bx = x0; by = y1; break;
    default: return null;
  }

  if (Math.abs(vb - va) < 1e-10) return { x: (ax + bx) / 2, y: (ay + by) / 2 };
  const t = (threshold - va) / (vb - va);
  return { x: ax + t * (bx - ax), y: ay + t * (by - ay) };
}

export function HeatmapPanel({ samples, sampleCount, distribution, bins = 40, colorScheme = 'terrain', scale = 1, burnIn = 0, excludeBurnIn = false }: HeatmapPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxCanvasSize = BASE_CANVAS_SIZE * scale;

  // Filter samples based on burn-in settings
  // During burn-in: show all samples. After burn-in: exclude burn-in samples
  const isInBurnIn = samples.length < burnIn;
  const effectiveSamples = (excludeBurnIn && !isInBurnIn) ? samples.slice(burnIn) : samples;

  // Calculate canvas dimensions based on distribution aspect ratio
  const { xMin, xMax, yMin, yMax } = distribution.bounds;
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const aspectRatio = xRange / yRange;

  // Determine canvas dimensions (X is horizontal, Y is vertical)
  let canvasWidth: number, canvasHeight: number;
  if (aspectRatio >= 1) {
    canvasWidth = maxCanvasSize;
    canvasHeight = maxCanvasSize / aspectRatio;
  } else {
    canvasHeight = maxCanvasSize;
    canvasWidth = maxCanvasSize * aspectRatio;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Create 2D histogram
    const hist = new Array(bins).fill(null).map(() => new Array(bins).fill(0));
    let maxCount = 0;

    effectiveSamples.forEach(s => {
      const binX = Math.floor((s.x - xMin) / xRange * bins);
      const binY = Math.floor((s.y - yMin) / yRange * bins);
      if (binX >= 0 && binX < bins && binY >= 0 && binY < bins) {
        hist[binX][binY]++;
        maxCount = Math.max(maxCount, hist[binX][binY]);
      }
    });

    // Draw heatmap
    const cellWidth = canvasWidth / bins;
    const cellHeight = canvasHeight / bins;

    for (let i = 0; i < bins; i++) {
      for (let j = 0; j < bins; j++) {
        const count = hist[i][j];
        if (count > 0 && maxCount > 0) {
          const intensity = count / maxCount;
          const color = getColor(intensity, colorScheme);
          const r = Math.floor(255 * color.r);
          const g = Math.floor(255 * color.g);
          const b = Math.floor(255 * color.b);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          // X horizontal, Y vertical (flipped to match 3D top view)
          ctx.fillRect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
        }
      }
    }

    // Draw contour lines using marching squares
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    const contourResolution = 60;
    const numLevels = 8;

    // Sample density on grid
    let maxDensity = 0;
    const grid: number[][] = [];
    for (let i = 0; i <= contourResolution; i++) {
      const row: number[] = [];
      for (let j = 0; j <= contourResolution; j++) {
        const x = xMin + (xRange * i) / contourResolution;
        const y = yMin + (yRange * j) / contourResolution;
        const d = distribution.density({ x, y });
        row.push(d);
        maxDensity = Math.max(maxDensity, d);
      }
      grid.push(row);
    }

    // Draw contours at each level
    for (let level = 1; level <= numLevels; level++) {
      const threshold = (level / (numLevels + 1)) * maxDensity;
      ctx.beginPath();

      for (let i = 0; i < contourResolution; i++) {
        for (let j = 0; j < contourResolution; j++) {
          const v00 = grid[i][j];
          const v10 = grid[i + 1][j];
          const v01 = grid[i][j + 1];
          const v11 = grid[i + 1][j + 1];

          // Marching squares case
          const caseIndex =
            (v00 >= threshold ? 1 : 0) |
            (v10 >= threshold ? 2 : 0) |
            (v01 >= threshold ? 4 : 0) |
            (v11 >= threshold ? 8 : 0);

          const edges = marchingSquaresEdges[caseIndex];
          if (!edges) continue;

          for (const [e1, e2] of edges) {
            const p1 = interpolateEdge(e1, i, j, contourResolution, v00, v10, v01, v11, threshold);
            const p2 = interpolateEdge(e2, i, j, contourResolution, v00, v10, v01, v11, threshold);
            if (p1 && p2) {
              // X horizontal, Y vertical (flipped to match 3D top view)
              const px1 = p1.x * canvasWidth;
              const py1 = p1.y * canvasHeight;
              const px2 = p2.x * canvasWidth;
              const py2 = p2.y * canvasHeight;
              ctx.moveTo(px1, py1);
              ctx.lineTo(px2, py2);
            }
          }
        }
      }
      ctx.stroke();
    }

    // Draw axis labels (X horizontal, Y vertical)
    ctx.fillStyle = '#666';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('X', canvasWidth / 2, canvasHeight - 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Y', 4, canvasHeight / 2);
    ctx.textBaseline = 'alphabetic';

    }, [samples, sampleCount, distribution, bins, colorScheme, canvasWidth, canvasHeight, xMin, xMax, yMin, yMax, xRange, yRange, scale, maxCanvasSize, effectiveSamples]);

  const containerWidth = 220 * scale + 16; // Match histogram width + padding

  return (
    <div
      style={{
        background: 'rgba(17, 17, 17, 0.95)',
        borderRadius: 8,
        padding: 8,
        border: '1px solid #222',
        width: containerWidth,
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          textAlign: 'right',
          fontSize: 10,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {isInBurnIn && burnIn > 0 && (
          <div style={{ color: '#f97316' }}>
            Burn-in ({samples.length}/{burnIn})
          </div>
        )}
        <div style={{ color: '#666' }}>
          n={effectiveSamples.length}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          borderRadius: 4,
          width: canvasWidth,
          height: canvasHeight,
        }}
      />
    </div>
  );
}
