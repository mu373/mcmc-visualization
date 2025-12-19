import { useRef, useEffect } from 'react';
import type { Vector2 } from '../core/utils';
import type { Distribution } from '../distributions/Distribution';

interface MarginalHistogramsProps {
  samples: Vector2[];
  sampleCount: number;
  distribution: Distribution;
  bins?: number;
}

const CANVAS_WIDTH = 220;
const CANVAS_HEIGHT = 160;

export function MarginalHistograms({ samples, sampleCount, distribution, bins = 40 }: MarginalHistogramsProps) {
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

    // Use distribution bounds for range (separate for X and Y)
    const { xMin, xMax, yMin, yMax } = distribution.bounds;

    const startX = 30;
    const chartWidth = width - 40;

    // Helper to compute histogram for a given range
    const computeHist = (values: number[], min: number, max: number) => {
      const range = max - min || 1;
      const binWidth = range / bins;
      const hist = new Array(bins).fill(0);

      values.forEach(v => {
        const binIndex = Math.floor((v - min) / binWidth);
        if (binIndex >= 0 && binIndex < bins) {
          hist[binIndex]++;
        }
      });

      return { hist, min, max, maxCount: Math.max(...hist, 1) };
    };

    // Draw a single histogram panel
    const drawPanel = (
      yOffset: number,
      label: string,
      marginalFn: (v: number) => number,
      histData: { hist: number[]; min: number; max: number; maxCount: number } | null,
      rangeMin: number,
      rangeMax: number
    ) => {
      const range = rangeMax - rangeMin || 1;
      const barWidth = chartWidth / bins;

      // Draw histogram bars if we have samples
      if (histData && histData.maxCount > 0) {
        histData.hist.forEach((count, i) => {
          if (count > 0) {
            const barHeight = (count / histData.maxCount) * (histHeight - 15);
            const x = startX + i * barWidth;
            const y = yOffset + histHeight - barHeight;

            const gradient = ctx.createLinearGradient(0, yOffset + histHeight, 0, y);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth - 1, barHeight);
          }
        });
      }

      // Draw theoretical marginal PDF curve
      const numPoints = 100;
      const pdfValues: number[] = [];
      for (let i = 0; i <= numPoints; i++) {
        const v = rangeMin + (i / numPoints) * range;
        pdfValues.push(marginalFn(v));
      }
      const maxPdf = Math.max(...pdfValues);

      if (maxPdf > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.9)';
        ctx.lineWidth = 1.5;

        for (let i = 0; i <= numPoints; i++) {
          const x = startX + (i / numPoints) * chartWidth;
          const pdfHeight = (pdfValues[i] / maxPdf) * (histHeight - 15);
          const y = yOffset + histHeight - pdfHeight;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(label, 8, yOffset + 12);

      // Axis labels
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(rangeMin.toFixed(1), startX, yOffset + histHeight + 10);
      ctx.textAlign = 'right';
      ctx.fillText(rangeMax.toFixed(1), width - 8, yOffset + histHeight + 10);
      ctx.textAlign = 'left';
    };

    // Compute histograms if we have samples (using separate ranges for X and Y)
    const xValues = samples.map(s => s.x);
    const yValues = samples.map(s => s.y);
    const xData = samples.length > 0 ? computeHist(xValues, xMin, xMax) : null;
    const yData = samples.length > 0 ? computeHist(yValues, yMin, yMax) : null;

    // Draw X histogram (top) - uses X range
    drawPanel(5, 'X', (x) => distribution.marginalX(x), xData, xMin, xMax);

    // Draw Y histogram (bottom) - uses Y range
    drawPanel(histHeight + 20, 'Y', (y) => distribution.marginalY(y), yData, yMin, yMax);

    // Sample count
    ctx.fillStyle = '#ccc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`n=${samples.length}`, width - 8, 12);
    ctx.textAlign = 'left';

  }, [samples, sampleCount, distribution, bins]);


  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
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
