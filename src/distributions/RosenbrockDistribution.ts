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

  // -scale·f with f(x,y) = (a-x)² + b(y-x²)², minimum at (a, a²)
  unboundedLogDensity({ x, y }: Vector2): number {
    return -this.scale * ((this.a - x) ** 2 + this.b * (y - x * x) ** 2);
  }

  gradient({ x, y }: Vector2): Vector2 {
    const r = y - x * x;
    return { x: this.scale * (2 * (this.a - x) + 4 * this.b * x * r), y: -2 * this.scale * this.b * r };
  }
}
