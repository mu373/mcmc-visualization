import type { MCMCAlgorithm } from './MCMCAlgorithm';
import type { Distribution } from '../distributions/Distribution';
import type { Visualizer } from '../core/Visualizer';
import { randn } from '../core/utils';
import type { Vector2 } from '../core/utils';
import '../core/utils';

export class HamiltonianMC implements MCMCAlgorithm {
  name = 'Hamiltonian Monte Carlo';
  description = 'Uses gradient-based Hamiltonian dynamics for efficient exploration';

  // Algorithm parameters
  epsilon: number = 0.1;  // Step size for leapfrog integration
  L: number = 20;         // Number of leapfrog steps

  // State
  private chain: Vector2[] = [];
  private distribution: Distribution | null = null;
  private acceptCount: number = 0;
  private totalSteps: number = 0;

  setDistribution(distribution: Distribution): void {
    this.distribution = distribution;
  }

  init(): void {
    this.epsilon = 0.1;
    this.L = 20;
  }

  reset(initialPosition?: Vector2): void {
    const startPos = initialPosition || { x: 0, y: 0 };
    this.chain = [startPos];
    this.acceptCount = 0;
    this.totalSteps = 0;
  }

  // Kinetic energy: K(p) = 0.5 * p^T * p (unit mass matrix)
  private kineticEnergy(p: Vector2): number {
    return 0.5 * (p.x * p.x + p.y * p.y);
  }

  // Potential energy: U(q) = -log(density(q))
  private potentialEnergy(q: Vector2): number {
    if (!this.distribution) return Infinity;
    return -this.distribution.logDensity(q);
  }

  // Single leapfrog step
  private leapfrogStep(q: Vector2, p: Vector2): { q: Vector2; p: Vector2 } {
    if (!this.distribution) return { q, p };

    // Half step for momentum
    const grad = this.distribution.gradient(q);
    let pHalf: Vector2 = {
      x: p.x + 0.5 * this.epsilon * grad.x,
      y: p.y + 0.5 * this.epsilon * grad.y,
    };

    // Full step for position
    const qNew: Vector2 = {
      x: q.x + this.epsilon * pHalf.x,
      y: q.y + this.epsilon * pHalf.y,
    };

    // Half step for momentum
    const gradNew = this.distribution.gradient(qNew);
    const pNew: Vector2 = {
      x: pHalf.x + 0.5 * this.epsilon * gradNew.x,
      y: pHalf.y + 0.5 * this.epsilon * gradNew.y,
    };

    return { q: qNew, p: pNew };
  }

  step(visualizer: Visualizer): void {
    if (!this.distribution || this.chain.length === 0) return;

    const current = this.chain[this.chain.length - 1];

    // Sample momentum from N(0, I)
    let p: Vector2 = { x: randn(), y: randn() };

    // Store initial state
    const currentH = this.potentialEnergy(current) + this.kineticEnergy(p);

    // Run leapfrog integration
    let q = { ...current };
    const trajectory: Vector2[] = [{ ...q }];

    for (let i = 0; i < this.L; i++) {
      const result = this.leapfrogStep(q, p);
      q = result.q;
      p = result.p;
      trajectory.push({ ...q });
    }

    // Negate momentum at end (for reversibility, though not strictly needed for MH)
    p = { x: -p.x, y: -p.y };

    // Compute proposed Hamiltonian
    const proposedH = this.potentialEnergy(q) + this.kineticEnergy(p);

    // Push trajectory event for visualization
    visualizer.queue.push({
      type: 'trajectory',
      path: trajectory,
    });

    // Push proposal event
    visualizer.queue.push({
      type: 'proposal',
      from: current,
      to: q,
    });

    // Metropolis acceptance: accept with probability min(1, exp(H - H'))
    const logAlpha = currentH - proposedH;
    const accept = Math.log(Math.random()) < logAlpha && isFinite(proposedH);

    if (accept) {
      this.chain.push(q);
      this.acceptCount++;
      visualizer.queue.push({ type: 'accept', position: q });
    } else {
      this.chain.push(current);
      visualizer.queue.push({ type: 'reject', position: q });
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
