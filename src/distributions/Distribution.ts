import type { Vector2 } from '../core/utils';

export interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export abstract class Distribution {
  abstract name: string;
  abstract bounds: Bounds;

  // Probability density function
  abstract density(point: Vector2): number;

  // Log density (more numerically stable)
  logDensity(point: Vector2): number {
    return Math.log(this.density(point) + 1e-300); // Add small constant to avoid log(0)
  }

  // Gradient of log density (for HMC)
  // Default: finite differences (can be overridden for analytical gradients)
  gradient(point: Vector2, h: number = 0.001): Vector2 {
    const logDensityX1 = this.logDensity({ x: point.x + h, y: point.y });
    const logDensityX2 = this.logDensity({ x: point.x - h, y: point.y });
    const logDensityY1 = this.logDensity({ x: point.x, y: point.y + h });
    const logDensityY2 = this.logDensity({ x: point.x, y: point.y - h });

    return {
      x: (logDensityX1 - logDensityX2) / (2 * h),
      y: (logDensityY1 - logDensityY2) / (2 * h)
    };
  }
}
