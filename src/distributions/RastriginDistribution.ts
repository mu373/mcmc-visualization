import { Distribution } from './Distribution';
import type { Vector2 } from '../core/utils';

export class RastriginDistribution extends Distribution {
  name = 'Rastrigin';
  bounds = {
    xMin: -5,
    xMax: 5,
    yMin: -5,
    yMax: 5
  };

  A: number;
  scale: number;

  constructor(A: number = 10, scale: number = 0.1) {
    super();
    this.A = A;
    this.scale = scale; // Temperature-like parameter to control peak sharpness
  }

  density(point: Vector2): number {
    const { x, y } = point;
    // Rastrigin function: f(x,y) = 2A + (x² - A*cos(2πx)) + (y² - A*cos(2πy))
    // Convert to density: p(x,y) ∝ exp(-scale * f(x,y))
    const f = 2 * this.A +
      (x * x - this.A * Math.cos(2 * Math.PI * x)) +
      (y * y - this.A * Math.cos(2 * Math.PI * y));
    return Math.exp(-this.scale * f);
  }
}
