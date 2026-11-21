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

  // -scale·f with f(x,y) = -a·exp(-b·√(½(x²+y²))) - exp(½(cos(cx)+cos(cy))) + a + e.
  // exp(-scale·f) does not decay at infinity, so only the truncation makes it normalizable.
  unboundedLogDensity({ x, y }: Vector2): number {
    const s = Math.sqrt(0.5 * (x * x + y * y));
    const f = -this.a * Math.exp(-this.b * s) - Math.exp(0.5 * (Math.cos(this.c * x) + Math.cos(this.c * y))) + this.a + Math.E;
    return -this.scale * f;
  }

  gradient({ x, y }: Vector2): Vector2 {
    const s = Math.sqrt(0.5 * (x * x + y * y));
    // The cone term has a cusp at the origin; use its zero subgradient there.
    const cone = s > 0 ? (this.a * this.b * Math.exp(-this.b * s)) / (2 * s) : 0;
    const wave = 0.5 * this.c * Math.exp(0.5 * (Math.cos(this.c * x) + Math.cos(this.c * y)));
    return {
      x: -this.scale * (cone * x + wave * Math.sin(this.c * x)),
      y: -this.scale * (cone * y + wave * Math.sin(this.c * y)),
    };
  }
}
