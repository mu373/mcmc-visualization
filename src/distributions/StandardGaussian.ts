import { Distribution } from './Distribution';
import type { Vector2 } from '../core/utils';

export class StandardGaussian extends Distribution {
  name = 'Standard Gaussian';
  bounds = {
    xMin: -4,
    xMax: 4,
    yMin: -4,
    yMax: 4
  };

  unboundedLogDensity({ x, y }: Vector2): number {
    return -0.5 * (x * x + y * y);
  }

  // Analytical gradient for better performance
  gradient(point: Vector2): Vector2 {
    return {
      x: -point.x,
      y: -point.y
    };
  }
}
