import { Distribution } from './Distribution';
import type { Vector2 } from '../core/utils';

export class AckleyDistribution extends Distribution {
  name = 'Ackley';
  bounds = {
    xMin: -5,
    xMax: 5,
    yMin: -5,
    yMax: 5
  };

  a: number;
  b: number;
  c: number;
  scale: number;

  constructor(a: number = 20, b: number = 0.2, c: number = 2 * Math.PI, scale: number = 0.3) {
    super();
    this.a = a;
    this.b = b;
    this.c = c;
    this.scale = scale;
  }

  density(point: Vector2): number {
    const { x, y } = point;
    // Ackley function: f(x,y) = -a·exp(-b·√(½(x²+y²))) - exp(½(cos(cx)+cos(cy))) + a + e
    // Global minimum at (0, 0) with f(0,0) = 0
    const sumSq = x * x + y * y;
    const sumCos = Math.cos(this.c * x) + Math.cos(this.c * y);
    const f = -this.a * Math.exp(-this.b * Math.sqrt(0.5 * sumSq))
              - Math.exp(0.5 * sumCos)
              + this.a + Math.E;
    return Math.exp(-this.scale * f);
  }
}
