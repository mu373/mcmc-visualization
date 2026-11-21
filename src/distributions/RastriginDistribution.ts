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

  // -scale·f with f(x,y) = 2A + (x² - A·cos(2πx)) + (y² - A·cos(2πy))
  unboundedLogDensity({ x, y }: Vector2): number {
    const tau = 2 * Math.PI;
    return -this.scale * (2 * this.A + x * x - this.A * Math.cos(tau * x) + y * y - this.A * Math.cos(tau * y));
  }

  gradient({ x, y }: Vector2): Vector2 {
    const tau = 2 * Math.PI;
    const d = (t: number) => -this.scale * (2 * t + tau * this.A * Math.sin(tau * t));
    return { x: d(x), y: d(y) };
  }
}
