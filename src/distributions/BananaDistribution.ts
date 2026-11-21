import { Distribution } from './Distribution';
import type { Vector2 } from '../core/utils';

export class BananaDistribution extends Distribution {
  name = 'Banana';
  bounds = {
    xMin: -3,
    xMax: 3,
    yMin: -3,
    yMax: 10
  };

  a: number;
  b: number;

  constructor(a: number = 1, b: number = 1) {
    super();
    this.a = a;
    this.b = b;
  }

  unboundedLogDensity({ x, y }: Vector2): number {
    return -((this.a - x) ** 2 + this.b * (y - x * x) ** 2) / 2;
  }

  gradient({ x, y }: Vector2): Vector2 {
    const r = y - x * x;
    return { x: this.a - x + 2 * this.b * x * r, y: -this.b * r };
  }
}
