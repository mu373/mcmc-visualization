import { useRef, useEffect, useMemo } from 'react';
import { getColor, type ColorScheme } from '../core/colormap';
import { contourSegments, densityGrid } from '../core/contours';
import { StatsBadge, type StatsPanelProps } from './StatsBadge';

const BASE_CANVAS_SIZE = 160;
const CONTOUR_RESOLUTION = 60;
const CONTOUR_LEVELS = 8;

export function HeatmapPanel(props: StatsPanelProps & { colorScheme?: ColorScheme }) {
  const { histograms, revision, distribution, colorScheme = 'terrain', scale = 1 } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxCanvasSize = BASE_CANVAS_SIZE * scale;

  const { xMin, xMax, yMin, yMax } = distribution.bounds;
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const aspectRatio = xRange / yRange;

  // X is horizontal, Y is vertical
  const canvasWidth = aspectRatio >= 1 ? maxCanvasSize : maxCanvasSize * aspectRatio;
  const canvasHeight = aspectRatio >= 1 ? maxCanvasSize / aspectRatio : maxCanvasSize;

  const contours = useMemo(() => {
    const grid = densityGrid(distribution, CONTOUR_RESOLUTION);
    return Array.from({ length: CONTOUR_LEVELS }, (_, k) =>
      contourSegments(grid, ((k + 1) / (CONTOUR_LEVELS + 1)) * grid.max));
  }, [distribution]);

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
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const bins = histograms.bins;
    const counts = histograms.xy;
    const maxCount = Math.max(0, ...counts);
    const cellWidth = canvasWidth / bins;
    const cellHeight = canvasHeight / bins;
    for (let i = 0; i < bins; i++) {
      for (let j = 0; j < bins; j++) {
        const count = counts[i * bins + j];
        if (count > 0) {
          const color = getColor(count / maxCount, colorScheme);
          ctx.fillStyle = `rgb(${Math.floor(255 * color.r)}, ${Math.floor(255 * color.g)}, ${Math.floor(255 * color.b)})`;
          // Y grows downward, matching the 3D top view
          ctx.fillRect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
        }
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    const px = (x: number) => ((x - xMin) / xRange) * canvasWidth;
    const py = (y: number) => ((y - yMin) / yRange) * canvasHeight;
    for (const segments of contours) {
      ctx.beginPath();
      for (const [x1, y1, x2, y2] of segments) {
        ctx.moveTo(px(x1), py(y1));
        ctx.lineTo(px(x2), py(y2));
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#666';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('X', canvasWidth / 2, canvasHeight - 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Y', 4, canvasHeight / 2);
    ctx.textBaseline = 'alphabetic';
  }, [histograms, revision, contours, colorScheme, canvasWidth, canvasHeight, xMin, xRange, yMin, yRange]);

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
      <StatsBadge {...props} />
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
