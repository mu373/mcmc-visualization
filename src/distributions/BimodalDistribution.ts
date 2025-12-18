import { Distribution } from './Distribution';
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

  density(point: Vector2): number {
    const { x, y } = point;
    const s2 = this.sigma * this.sigma;

    // Two Gaussian peaks
    const peak1 = Math.exp(-((x + this.separation/2) ** 2 + y ** 2) / (2 * s2));
    const peak2 = Math.exp(-((x - this.separation/2) ** 2 + y ** 2) / (2 * s2));

    return peak1 + peak2;
  }
}
