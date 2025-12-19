import { Distribution } from './Distribution';
import type { Vector2 } from '../core/utils';

export class SquiggleDistribution extends Distribution {
  name = 'Squiggle';
  bounds = {
    xMin: -6,
    xMax: 6,
    yMin: -4,
    yMax: 4
  };

  // Covariance matrix [[2, 0.25], [0.25, 0.5]]
  // Precomputed inverse: det = 0.9375
  private invCov00 = 0.5 / 0.9375;
  private invCov01 = -0.25 / 0.9375;
  private invCov11 = 2 / 0.9375;

  frequency: number;

  constructor(frequency: number = 5) {
    super();
    this.frequency = frequency;
  }

  density(point: Vector2): number {
    const { x, y } = point;
    // Transform: y' = y + sin(freq * x)
    const y0 = x;
    const y1 = y + Math.sin(this.frequency * x);

    // Multivariate normal: exp(-0.5 * yᵀ Σ⁻¹ y)
    const quad = this.invCov00 * y0 * y0
               + 2 * this.invCov01 * y0 * y1
               + this.invCov11 * y1 * y1;

    return Math.exp(-0.5 * quad);
  }

  // Analytical gradient for better HMC performance
  gradient(point: Vector2): Vector2 {
    const { x, y } = point;
    const y0 = x;
    const y1 = y + Math.sin(this.frequency * x);

    // Gradient of log density of transformed normal
    const gradY0 = -(this.invCov00 * y0 + this.invCov01 * y1);
    const gradY1 = -(this.invCov01 * y0 + this.invCov11 * y1);

    // Chain rule for the transformation
    const dY1dX = this.frequency * Math.cos(this.frequency * x);

    return {
      x: gradY0 + gradY1 * dY1dX,
      y: gradY1
    };
  }
}
