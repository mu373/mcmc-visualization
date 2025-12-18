import { useRef, useEffect } from 'react';
import type { Vector2 } from '../core/utils';

interface MarginalHistogramsProps {
  samples: Vector2[];
  sampleCount: number;
  bins?: number;
}

const CANVAS_WIDTH = 220;
const CANVAS_HEIGHT = 160;

export function MarginalHistograms({ samples, sampleCount, bins = 40 }: MarginalHistogramsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const width = CANVAS_WIDTH;
    const height = CANVAS_HEIGHT;
    const histHeight = (height - 30) / 2;

    // Clear canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    if (samples.length < 1) return;

    // Extract values
    const xValues = samples.map(s => s.x);
    const yValues = samples.map(s => s.y);

    // Use same range for both X and Y
    const allValues = [...xValues, ...yValues];
    const globalMin = Math.min(...allValues);
    const globalMax = Math.max(...allValues);
    const globalRange = globalMax - globalMin || 1;
    const binWidth = globalRange / bins;

    // Helper to compute histogram with shared range
    const computeHist = (values: number[]) => {
      const hist = new Array(bins).fill(0);

      values.forEach(v => {
        const bin = Math.min(bins - 1, Math.floor((v - globalMin) / binWidth));
        hist[bin]++;
      });

      return { hist, min: globalMin, max: globalMax, maxCount: Math.max(...hist) };
    };

    const xData = computeHist(xValues);
    const yData = computeHist(yValues);

    // Draw histogram helper
    const drawHist = (
      data: { hist: number[]; min: number; max: number; maxCount: number },
      yOffset: number,
      label: string
    ) => {
      const barWidth = (width - 40) / bins;
      const startX = 30;

      data.hist.forEach((count, i) => {
        const barHeight = (count / data.maxCount) * (histHeight - 15);
        const x = startX + i * barWidth;
        const y = yOffset + histHeight - barHeight;

        const gradient = ctx.createLinearGradient(0, yOffset + histHeight, 0, y);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      });

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(label, 8, yOffset + 12);

      // Axis labels
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(data.min.toFixed(1), startX, yOffset + histHeight + 10);
      ctx.textAlign = 'right';
      ctx.fillText(data.max.toFixed(1), width - 8, yOffset + histHeight + 10);
      ctx.textAlign = 'left';
    };

    // Draw X histogram (top)
    drawHist(xData, 5, 'X');

    // Draw Y histogram (bottom)
    drawHist(yData, histHeight + 20, 'Y');

    // Sample count
    ctx.fillStyle = '#ccc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`n=${samples.length}`, width - 8, 12);
    ctx.textAlign = 'left';

  }, [samples, sampleCount, bins]);


  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        background: 'rgba(17, 17, 17, 0.95)',
        borderRadius: 8,
        padding: 8,
        border: '1px solid #222',
        zIndex: 100,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          borderRadius: 4,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        }}
      />
    </div>
  );
}
