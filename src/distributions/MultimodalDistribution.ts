import { Distribution } from './Distribution';
import type { Vector2 } from '../core/utils';

interface GaussianComponent {
  mean: Vector2;
  variance: number;
}

export class MultimodalDistribution extends Distribution {
  name = 'Multimodal';
  bounds = {
    xMin: -6,
    xMax: 6,
    yMin: -6,
    yMax: 6
  };

  private components: GaussianComponent[] = [
    { mean: { x: -1.5, y: -1.5 }, variance: 0.8 },
    { mean: { x: 1.5, y: 1.5 }, variance: 0.8 },
    { mean: { x: -2, y: 2 }, variance: 0.5 },
  ];

  density(point: Vector2): number {
    let total = 0;
    for (const comp of this.components) {
      const dx = point.x - comp.mean.x;
      const dy = point.y - comp.mean.y;
      total += Math.exp(-(dx * dx + dy * dy) / (2 * comp.variance));
    }
    return total;
  }

  gradient(point: Vector2): Vector2 {
    // Compute gradient of log density
    // log(sum(p_i)) -> gradient = sum(p_i * grad_log_p_i) / sum(p_i)
    const densities: number[] = [];
    const gradients: Vector2[] = [];

    for (const comp of this.components) {
      const dx = point.x - comp.mean.x;
      const dy = point.y - comp.mean.y;
      const p = Math.exp(-(dx * dx + dy * dy) / (2 * comp.variance));
      densities.push(p);
      // Gradient of log density for single Gaussian: -1/variance * (x - mu)
      gradients.push({
        x: -dx / comp.variance,
        y: -dy / comp.variance,
      });
    }

    const totalDensity = densities.reduce((a, b) => a + b, 0);
    if (totalDensity === 0) return { x: 0, y: 0 };

    let gx = 0;
    let gy = 0;
    for (let i = 0; i < this.components.length; i++) {
      const weight = densities[i] / totalDensity;
      gx += weight * gradients[i].x;
      gy += weight * gradients[i].y;
    }

    return { x: gx, y: gy };
  }
}
