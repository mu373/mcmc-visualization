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

  density(point: Vector2): number {
    const { x, y } = point;
    // 2D standard normal: exp(-0.5 * (x² + y²))
    return Math.exp(-0.5 * (x * x + y * y));
  }

  // Analytical gradient for better performance
  gradient(point: Vector2): Vector2 {
    return {
      x: -point.x,
      y: -point.y
    };
  }
}
