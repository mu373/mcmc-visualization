import { useRef, useEffect } from 'react';
import type { Vector2 } from '../core/utils';
import type { Distribution } from '../distributions/Distribution';

interface MarginalHistogramsProps {
  samples: Vector2[];
  sampleCount: number;
  distribution: Distribution;
  bins?: number;
  scale?: number;
  burnIn?: number;
  excludeBurnIn?: boolean;
}

const BASE_WIDTH = 220;
const BASE_HEIGHT = 160;

export function MarginalHistograms({ samples, sampleCount, distribution, bins = 40, scale = 1, burnIn = 0, excludeBurnIn = false }: MarginalHistogramsProps) {
  const CANVAS_WIDTH = BASE_WIDTH * scale;
  const CANVAS_HEIGHT = BASE_HEIGHT * scale;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Filter samples based on burn-in settings
  // During burn-in: show all samples. After burn-in: exclude burn-in samples
  const isInBurnIn = samples.length < burnIn;
  const effectiveSamples = (excludeBurnIn && !isInBurnIn) ? samples.slice(burnIn) : samples;

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
    ctx.clearRect(0, 0, width, height);

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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1;

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
      ctx.fillStyle = '#666';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(label, 8, yOffset + 12);

      // Axis labels
      ctx.fillStyle = '#666';
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillText(rangeMin.toFixed(1), startX, yOffset + histHeight + 10);
      ctx.textAlign = 'right';
      ctx.fillText(rangeMax.toFixed(1), width - 8, yOffset + histHeight + 10);
      ctx.textAlign = 'left';
    };

    // Compute histograms if we have samples (using separate ranges for X and Y)
    const xValues = effectiveSamples.map(s => s.x);
    const yValues = effectiveSamples.map(s => s.y);
    const xData = effectiveSamples.length > 0 ? computeHist(xValues, xMin, xMax) : null;
    const yData = effectiveSamples.length > 0 ? computeHist(yValues, yMin, yMax) : null;

    // Draw X histogram (top) - uses X range
    drawPanel(5, 'X', (x) => distribution.marginalX(x), xData, xMin, xMax);

    // Draw Y histogram (bottom) - uses Y range
    drawPanel(histHeight + 20, 'Y', (y) => distribution.marginalY(y), yData, yMin, yMax);

    }, [samples, sampleCount, distribution, bins, scale, CANVAS_WIDTH, CANVAS_HEIGHT, effectiveSamples]);


  return (
    <div
      style={{
        background: 'rgba(17, 17, 17, 0.95)',
        borderRadius: 8,
        padding: 8,
        border: '1px solid #222',
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
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        }}
      />
    </div>
  );
}
