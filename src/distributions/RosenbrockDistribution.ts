import { Distribution } from './Distribution';
import type { Vector2 } from '../core/utils';

export class RosenbrockDistribution extends Distribution {
  name = 'Rosenbrock';
  bounds = {
    xMin: -3,
    xMax: 3,
    yMin: -2,
    yMax: 8
  };

  a: number;
  b: number;
  scale: number;

  constructor(a: number = 1, b: number = 100, scale: number = 0.02) {
    super();
    this.a = a;
    this.b = b;
    this.scale = scale;
  }

  density(point: Vector2): number {
    const { x, y } = point;
    // Rosenbrock function: f(x,y) = (a-x)² + b(y-x²)²
    // Global minimum at (a, a²)
    const f = (this.a - x) ** 2 + this.b * (y - x * x) ** 2;
    return Math.exp(-this.scale * f);
  }
}
