import type { MCMCAlgorithm } from './MCMCAlgorithm';
import type { Distribution } from '../distributions/Distribution';
import type { Visualizer } from '../core/Visualizer';
import { randn } from '../core/utils';
import type { Vector2 } from '../core/utils';
import '../core/utils';

export class LangevinMC implements MCMCAlgorithm {
  name = 'Metropolis-adjusted Langevin';
  description = 'Combines gradient-driven drift toward local peaks with Gaussian noise. Efficient within modes but tends to get trapped in multimodal distributions';

  // Algorithm parameters
  epsilon: number = 0.3;  // Step size

  // State
  private chain: Vector2[] = [];
  private distribution: Distribution | null = null;
  private acceptCount: number = 0;
  private totalSteps: number = 0;

  setDistribution(distribution: Distribution): void {
    this.distribution = distribution;
  }

  init(): void {
    this.epsilon = 0.3;
  }

  reset(initialPosition?: Vector2): void {
    const startPos = initialPosition || { x: 0, y: 0 };
    this.chain = [startPos];
    this.acceptCount = 0;
    this.totalSteps = 0;
  }

  // Compute proposal mean: μ(q) = q + (ε/2) * ∇ log π(q)
  private proposalMean(q: Vector2): Vector2 {
    if (!this.distribution) return q;
    const grad = this.distribution.gradient(q);
    return {
      x: q.x + (this.epsilon / 2) * grad.x,
      y: q.y + (this.epsilon / 2) * grad.y,
    };
  }

  // Log proposal density: log q(to|from) = -||to - μ(from)||² / (2ε)
  // (ignoring normalization constant which cancels in MH ratio)
  private logProposalDensity(from: Vector2, to: Vector2): number {
    const mean = this.proposalMean(from);
    const dx = to.x - mean.x;
    const dy = to.y - mean.y;
    return -(dx * dx + dy * dy) / (2 * this.epsilon);
  }

  step(visualizer: Visualizer): void {
    if (!this.distribution || this.chain.length === 0) return;

    const current = this.chain[this.chain.length - 1];

    // Compute proposal mean
    const mean = this.proposalMean(current);

    // Propose new state: q' ~ N(μ(q), ε * I)
    const sqrtEps = Math.sqrt(this.epsilon);
    const proposal: Vector2 = {
      x: mean.x + randn() * sqrtEps,
      y: mean.y + randn() * sqrtEps,
    };

    // Get gradient for visualization
    const grad = this.distribution.gradient(current);

    // Push Langevin-specific visualization (gradient arrow, drift point, noise radius)
    visualizer.queue.push({
      type: 'langevin',
      gradient: grad,
      driftPoint: mean,
      noiseRadius: sqrtEps,
    });

    // Push proposal event to visualizer queue
    visualizer.queue.push({
      type: 'proposal',
      from: current,
      to: proposal,
    });

    // Calculate acceptance probability using MH correction
    // log α = log π(q') - log π(q) + log q(q|q') - log q(q'|q)
    const logPiProposal = this.distribution.logDensity(proposal);
    const logPiCurrent = this.distribution.logDensity(current);
    const logQForward = this.logProposalDensity(current, proposal);  // q(q'|q)
    const logQBackward = this.logProposalDensity(proposal, current); // q(q|q')

    const logAlpha = logPiProposal - logPiCurrent + logQBackward - logQForward;

    // Accept or reject
    const accept = Math.log(Math.random()) < logAlpha && isFinite(logPiProposal);

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
