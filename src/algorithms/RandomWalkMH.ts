import type { MCMCAlgorithm } from './MCMCAlgorithm';
import type { Distribution } from '../distributions/Distribution';
import type { Visualizer } from '../core/Visualizer';
import { randn } from '../core/utils';
import type { Vector2 } from '../core/utils';
import '../core/utils'; // Import to extend Array prototype

export class RandomWalkMH implements MCMCAlgorithm {
  name = 'Random Walk Metropolis-Hastings';
  description = 'Proposes new states from a Gaussian centered at current state';

  // Algorithm parameters
  sigma: number = 0.5;

  // State
  private chain: Vector2[] = [];
  private distribution: Distribution | null = null;
  private acceptCount: number = 0;
  private totalSteps: number = 0;

  setDistribution(distribution: Distribution): void {
    this.distribution = distribution;
  }

  init(): void {
    this.sigma = 0.5;
  }

  reset(initialPosition?: Vector2): void {
    const startPos = initialPosition || { x: 0, y: 0 };
    this.chain = [startPos];
    this.acceptCount = 0;
    this.totalSteps = 0;
  }

  step(visualizer: Visualizer): void {
    if (!this.distribution || this.chain.length === 0) return;

    const current = this.chain[this.chain.length - 1];

    // Propose new state: x' ~ N(x, σ²I)
    const proposal: Vector2 = {
      x: current.x + randn() * this.sigma,
      y: current.y + randn() * this.sigma,
    };

    // Push proposal event to visualizer queue
    visualizer.queue.push({
      type: 'proposal',
      from: current,
      to: proposal,
      radius: this.sigma,
    });

    // Calculate acceptance probability: α = min(1, P(x')/P(x))
    // Using log densities for numerical stability
    const logAlpha =
      this.distribution.logDensity(proposal) -
      this.distribution.logDensity(current);

    // Accept or reject
    const accept = Math.log(Math.random()) < logAlpha;

    if (accept) {
      this.chain.push(proposal);
      this.acceptCount++;
      visualizer.queue.push({ type: 'accept', position: proposal });
    } else {
      this.chain.push(current);
      visualizer.queue.push({ type: 'reject', position: proposal });
    }

    this.totalSteps++;
  }

  getAcceptanceRate(): number {
    if (this.totalSteps === 0) return 0;
    return this.acceptCount / this.totalSteps;
  }

  getChain(): Vector2[] {
    return this.chain;
  }
}
