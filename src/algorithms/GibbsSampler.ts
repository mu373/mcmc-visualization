import type { MCMCAlgorithm } from './MCMCAlgorithm';
import type { Distribution } from '../distributions/Distribution';
import type { Visualizer } from '../core/Visualizer';
import type { Vector2 } from '../core/utils';

export class GibbsSampler implements MCMCAlgorithm {
  name = 'Gibbs Sampler';
  description = 'Samples each coordinate from its conditional distribution';

  // Algorithm parameters
  gridResolution: number = 200;

  // State
  private chain: Vector2[] = [];
  private distribution: Distribution | null = null;

  setDistribution(distribution: Distribution): void {
    this.distribution = distribution;
  }

  init(): void {
    this.gridResolution = 200;
  }

  reset(initialPosition?: Vector2): void {
    const startPos = initialPosition || { x: 0, y: 0 };
    this.chain = [startPos];
  }

  step(visualizer: Visualizer): void {
    if (!this.distribution || this.chain.length === 0) return;

    const current = this.chain[this.chain.length - 1];
    const bounds = this.distribution.bounds;

    // Step 1: Sample x from P(x | y_current)
    const newX = this.sampleConditionalX(current.y, bounds);
    const intermediate: Vector2 = { x: newX, y: current.y };

    // Visualize horizontal move
    visualizer.queue.push({
      type: 'proposal',
      from: current,
      to: intermediate,
    });
    visualizer.queue.push({ type: 'accept', position: intermediate });

    // Step 2: Sample y from P(y | x_new)
    const newY = this.sampleConditionalY(newX, bounds);
    const next: Vector2 = { x: newX, y: newY };

    // Visualize vertical move
    visualizer.queue.push({
      type: 'proposal',
      from: intermediate,
      to: next,
    });
    visualizer.queue.push({ type: 'accept', position: next });

    this.chain.push(next);
  }

  private sampleConditionalX(
    yFixed: number,
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number }
  ): number {
    if (!this.distribution) return 0;

    const n = this.gridResolution;
    const xMin = bounds.xMin;
    const xMax = bounds.xMax;
    const dx = (xMax - xMin) / n;

    // Build unnormalized CDF
    const densities: number[] = [];
    let total = 0;

    for (let i = 0; i < n; i++) {
      const x = xMin + (i + 0.5) * dx;
      const d = this.distribution.density({ x, y: yFixed });
      densities.push(d);
      total += d;
    }

    // Sample using inverse CDF
    const u = Math.random() * total;
    let cumsum = 0;
    for (let i = 0; i < n; i++) {
      cumsum += densities[i];
      if (cumsum >= u) {
        // Add small jitter within the bin
        const x = xMin + (i + Math.random()) * dx;
        return x;
      }
    }

    return xMax - dx / 2;
  }

  private sampleConditionalY(
    xFixed: number,
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number }
  ): number {
    if (!this.distribution) return 0;

    const n = this.gridResolution;
    const yMin = bounds.yMin;
    const yMax = bounds.yMax;
    const dy = (yMax - yMin) / n;

    // Build unnormalized CDF
    const densities: number[] = [];
    let total = 0;

    for (let i = 0; i < n; i++) {
      const y = yMin + (i + 0.5) * dy;
      const d = this.distribution.density({ x: xFixed, y });
      densities.push(d);
      total += d;
    }

    // Sample using inverse CDF
    const u = Math.random() * total;
    let cumsum = 0;
    for (let i = 0; i < n; i++) {
      cumsum += densities[i];
      if (cumsum >= u) {
        // Add small jitter within the bin
        const y = yMin + (i + Math.random()) * dy;
        return y;
      }
    }

    return yMax - dy / 2;
  }

  getChain(): Vector2[] {
    return this.chain;
  }
}
