import { Distribution } from './Distribution';
import type { Vector2 } from '../core/utils';

export class DonutDistribution extends Distribution {
  name = 'Donut';
  bounds = {
    xMin: -4,
    xMax: 4,
    yMin: -4,
    yMax: 4
  };

  radius: number;
  width: number;

  constructor(radius: number = 2, width: number = 0.4) {
    super();
    this.radius = radius;
    this.width = width;
  }

  density(point: Vector2): number {
    const { x, y } = point;
    const r = Math.sqrt(x * x + y * y);
    const diff = r - this.radius;
    // Gaussian ring around radius
    return Math.exp(-diff * diff / (2 * this.width * this.width));
  }

  gradient(point: Vector2): Vector2 {
    const { x, y } = point;
    const r = Math.sqrt(x * x + y * y) + 1e-10;
    const diff = r - this.radius;
    const factor = -diff / (this.width * this.width * r);
    return {
      x: factor * x,
      y: factor * y
    };
  }
}
