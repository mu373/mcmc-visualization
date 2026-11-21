import { useRef, useEffect, useMemo } from 'react';
import { StatsBadge, type StatsPanelProps } from './StatsBadge';

const BASE_WIDTH = 220;
const BASE_HEIGHT = 160;
const CURVE_POINTS = 100;

export function MarginalHistograms(props: StatsPanelProps) {
  const { histograms, revision, distribution, scale = 1 } = props;
  const CANVAS_WIDTH = BASE_WIDTH * scale;
  const CANVAS_HEIGHT = BASE_HEIGHT * scale;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const curves = useMemo(() => {
    const { xMin, xMax, yMin, yMax } = distribution.bounds;
    const sample = (f: (v: number) => number, min: number, max: number) =>
      Array.from({ length: CURVE_POINTS + 1 }, (_, i) => f(min + (i / CURVE_POINTS) * (max - min)));
    return {
      x: sample(v => distribution.marginalX(v), xMin, xMax),
      y: sample(v => distribution.marginalY(v), yMin, yMax),
    };
  }, [distribution]);

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
    const bins = histograms.bins;

    ctx.clearRect(0, 0, width, height);

    const { xMin, xMax, yMin, yMax } = distribution.bounds;

    const startX = 30;
    const chartWidth = width - 40;

    // Draw a single histogram panel
    const drawPanel = (
      yOffset: number,
      label: string,
      counts: Int32Array,
      pdfValues: number[],
      rangeMin: number,
      rangeMax: number
    ) => {
      const barWidth = chartWidth / bins;
      const maxCount = Math.max(1, ...counts);

      counts.forEach((count, i) => {
        if (count > 0) {
          const barHeight = (count / maxCount) * (histHeight - 15);
          const x = startX + i * barWidth;
          const y = yOffset + histHeight - barHeight;

          const gradient = ctx.createLinearGradient(0, yOffset + histHeight, 0, y);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth - 1, barHeight);
        }
      });

      const numPoints = CURVE_POINTS;
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

    drawPanel(5, 'X', histograms.x, curves.x, xMin, xMax);
    drawPanel(histHeight + 20, 'Y', histograms.y, curves.y, yMin, yMax);
  }, [histograms, revision, distribution, curves, CANVAS_WIDTH, CANVAS_HEIGHT]);

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
      <StatsBadge {...props} />
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
