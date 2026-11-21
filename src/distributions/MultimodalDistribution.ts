import { Distribution, logSumExp } from './Distribution';
import type { Vector2 } from '../core/utils';

interface GaussianComponent {
  mean: Vector2;
  variance: number;
}

export class MultimodalDistribution extends Distribution {
  name = 'Multimodal';
  bounds = {
    xMin: -6,
    xMax: 6,
    yMin: -6,
    yMax: 6
  };

  // Unnormalized components, so each one's mass is proportional to its variance.
  private components: GaussianComponent[] = [
    { mean: { x: -1.5, y: -1.5 }, variance: 0.8 },
    { mean: { x: 1.5, y: 1.5 }, variance: 0.8 },
    { mean: { x: -2, y: 2 }, variance: 0.5 },
  ];

  private componentLogs({ x, y }: Vector2): number[] {
    return this.components.map(({ mean, variance }) => -((x - mean.x) ** 2 + (y - mean.y) ** 2) / (2 * variance));
  }

  unboundedLogDensity(point: Vector2): number {
    return logSumExp(this.componentLogs(point));
  }

  // Responsibility-weighted average of each component's gradient.
  gradient(point: Vector2): Vector2 {
    const logs = this.componentLogs(point);
    const total = logSumExp(logs);
    let gx = 0;
    let gy = 0;
    this.components.forEach(({ mean, variance }, i) => {
      const w = Math.exp(logs[i] - total);
      gx -= (w * (point.x - mean.x)) / variance;
      gy -= (w * (point.y - mean.y)) / variance;
    });
    return { x: gx, y: gy };
  }
}
