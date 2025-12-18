import { Distribution } from './Distribution';
import type { Vector2 } from '../core/utils';

export class BananaDistribution extends Distribution {
  name = 'Banana';
  bounds = {
    xMin: -3,
    xMax: 3,
    yMin: -3,
    yMax: 4
  };

  a: number;
  b: number;

  constructor(a: number = 1, b: number = 1) {
    super();
    this.a = a;
    this.b = b;
  }

  density(point: Vector2): number {
    const { x, y } = point;
    // Banana-shaped distribution (transformed Gaussian)
    // Similar to Rosenbrock function
    const term1 = (this.a - x) ** 2;
    const term2 = this.b * (y - x * x) ** 2;
    return Math.exp(-(term1 + term2) / 2);
  }
}
