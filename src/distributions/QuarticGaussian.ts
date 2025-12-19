import { Distribution } from './Distribution';
import type { Vector2 } from '../core/utils';

export class QuarticGaussian extends Distribution {
  name = 'Quartic Gaussian';
  bounds = {
    xMin: -2.5,
    xMax: 2.5,
    yMin: -2.5,
    yMax: 2.5
  };

  density(point: Vector2): number {
    const { x, y } = point;
    const r2 = x * x + y * y;
    // exp(-(x² + y²)²) - flatter top, sharper falloff than Gaussian
    return Math.exp(-r2 * r2);
  }

  // Analytical gradient: ∇ log p = -4(x² + y²)(x, y)
  gradient(point: Vector2): Vector2 {
    const { x, y } = point;
    const r2 = x * x + y * y;
    const scale = -4 * r2;
    return {
      x: scale * x,
      y: scale * y
    };
  }
}
