import type { Vector2 } from '../core/utils';

export interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

// Every preset is the formula below truncated to `bounds`, the displayed rectangle.
export abstract class Distribution {
  abstract name: string;
  abstract bounds: Bounds;

  // Log of the unnormalized density, ignoring the support.
  abstract unboundedLogDensity(point: Vector2): number;

  contains({ x, y }: Vector2): boolean {
    const b = this.bounds;
    return x >= b.xMin && x <= b.xMax && y >= b.yMin && y <= b.yMax;
  }

  logDensity(point: Vector2): number {
    return this.contains(point) ? this.unboundedLogDensity(point) : -Infinity;
  }

  density(point: Vector2): number {
    return Math.exp(this.logDensity(point));
  }

  // Gradient of the unbounded log density, so it stays finite at and beyond the support's edge.
  gradient(point: Vector2, h: number = 1e-5): Vector2 {
    const f = (x: number, y: number) => this.unboundedLogDensity({ x, y });
    return {
      x: (f(point.x + h, point.y) - f(point.x - h, point.y)) / (2 * h),
      y: (f(point.x, point.y + h) - f(point.x, point.y - h)) / (2 * h),
    };
  }

  marginalX(x: number, steps: number = 1000): number {
    const { yMin, yMax } = this.bounds;
    const dy = (yMax - yMin) / steps;
    let sum = 0;
    for (let i = 0; i < steps; i++) sum += this.density({ x, y: yMin + (i + 0.5) * dy });
    return sum * dy;
  }

  marginalY(y: number, steps: number = 1000): number {
    const { xMin, xMax } = this.bounds;
    const dx = (xMax - xMin) / steps;
    let sum = 0;
    for (let i = 0; i < steps; i++) sum += this.density({ x: xMin + (i + 0.5) * dx, y });
    return sum * dx;
  }
}

export function logSumExp(values: number[]): number {
  const m = Math.max(...values);
  if (m === -Infinity) return -Infinity;
  let s = 0;
  for (const v of values) s += Math.exp(v - m);
  return m + Math.log(s);
}
