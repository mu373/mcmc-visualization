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
}

const CANVAS_SIZE = 160;

export function HeatmapPanel({ samples, sampleCount, distribution, bins = 40, colorScheme = 'terrain' }: HeatmapPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.scale(dpr, dpr);

    const size = CANVAS_SIZE;

    // Clear canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, size, size);

    const { xMin, xMax, yMin, yMax } = distribution.bounds;
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    // Create 2D histogram
    const hist = new Array(bins).fill(null).map(() => new Array(bins).fill(0));
    let maxCount = 0;

    samples.forEach(s => {
      const binX = Math.floor((s.x - xMin) / xRange * bins);
      const binY = Math.floor((s.y - yMin) / yRange * bins);
      if (binX >= 0 && binX < bins && binY >= 0 && binY < bins) {
        hist[binX][binY]++;
        maxCount = Math.max(maxCount, hist[binX][binY]);
      }
    });

    // Draw heatmap
    const cellSize = size / bins;

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
          // Note: j is flipped for Y axis (top = high Y)
          ctx.fillRect(i * cellSize, (bins - 1 - j) * cellSize, cellSize, cellSize);
        }
      }
    }

    // Draw contour lines from distribution
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;

    const contourLevels = [0.1, 0.3, 0.5, 0.7, 0.9];
    let maxDensity = 0;

    // Find max density
    for (let i = 0; i <= 20; i++) {
      for (let j = 0; j <= 20; j++) {
        const x = xMin + (i / 20) * xRange;
        const y = yMin + (j / 20) * yRange;
        maxDensity = Math.max(maxDensity, distribution.density({ x, y }));
      }
    }

    // Draw contours as simple level sets
    const resolution = 50;
    for (const level of contourLevels) {
      ctx.beginPath();
      for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
          const x = xMin + (i / resolution) * xRange;
          const y = yMin + (j / resolution) * yRange;
          const d = distribution.density({ x, y }) / maxDensity;

          // Check if this cell crosses the contour level
          const x2 = xMin + ((i + 1) / resolution) * xRange;
          const y2 = yMin + ((j + 1) / resolution) * yRange;
          const d2 = distribution.density({ x: x2, y }) / maxDensity;
          const d3 = distribution.density({ x, y: y2 }) / maxDensity;

          if ((d < level && d2 >= level) || (d >= level && d2 < level)) {
            const px = (i / resolution) * size;
            const py = (1 - j / resolution) * size;
            ctx.moveTo(px, py);
            ctx.lineTo(px + size / resolution, py);
          }
          if ((d < level && d3 >= level) || (d >= level && d3 < level)) {
            const px = (i / resolution) * size;
            const py = (1 - j / resolution) * size;
            ctx.moveTo(px, py);
            ctx.lineTo(px, py - size / resolution);
          }
        }
      }
      ctx.stroke();
    }

    // Draw axis labels
    ctx.fillStyle = '#666';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('X', size / 2, size - 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Y', 4, size / 2);
    ctx.textBaseline = 'alphabetic';

  }, [samples, sampleCount, distribution, bins, colorScheme]);

  return (
    <div
      style={{
        background: 'rgba(17, 17, 17, 0.95)',
        borderRadius: 8,
        padding: 8,
        border: '1px solid #222',
        width: 220 + 16, // Match histogram width (220) + padding (8*2)
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          borderRadius: 4,
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
        }}
      />
    </div>
  );
}
