import { Distribution, logSumExp } from './Distribution';
import type { Vector2 } from '../core/utils';

export class BimodalDistribution extends Distribution {
  name = 'Bimodal';
  bounds = {
    xMin: -5,
    xMax: 5,
    yMin: -4,
    yMax: 4
  };

  separation: number;
  sigma: number;

  constructor(separation: number = 3, sigma: number = 0.8) {
    super();
    this.separation = separation;
    this.sigma = sigma;
  }

  private componentLogs({ x, y }: Vector2): [number, number] {
    const s2 = this.sigma * this.sigma;
    const half = this.separation / 2;
    return [-((x + half) ** 2 + y * y) / (2 * s2), -((x - half) ** 2 + y * y) / (2 * s2)];
  }

  // Two equal Gaussian peaks
  unboundedLogDensity(point: Vector2): number {
    return logSumExp(this.componentLogs(point));
  }

  gradient(point: Vector2): Vector2 {
    const [l1, l2] = this.componentLogs(point);
    const w1 = 1 / (1 + Math.exp(l2 - l1));
    const s2 = this.sigma * this.sigma;
    const half = this.separation / 2;
    const mean = w1 * -half + (1 - w1) * half;
    return { x: -(point.x - mean) / s2, y: -point.y / s2 };
  }
}
