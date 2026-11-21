import type { MCMCAlgorithm, StepResult } from './MCMCAlgorithm';
import type { Distribution } from '../distributions/Distribution';
import { randn, type Rng } from '../core/rng';
import type { Vector2 } from '../core/utils';

export class LangevinMC implements MCMCAlgorithm {
  readonly key = 'mala';
  readonly name = 'Metropolis-adjusted Langevin';
  readonly description = 'Combines gradient-driven drift toward local peaks with Gaussian noise. Efficient within modes but tends to get trapped in multimodal distributions';
  readonly rateLabel = 'Accept';

  defaultEpsilon = 0.3;
  private tunedEpsilon?: number;

  get epsilon(): number {
    return this.tunedEpsilon ?? this.defaultEpsilon;
  }

  set epsilon(value: number) {
    // Tweakpane writes the current value back when refreshing a binding.
    if (value !== this.epsilon) this.tunedEpsilon = value;
  }

  params() {
    return { epsilon: this.epsilon };
  }

  // Mean of the proposal q' ~ N(q + (ε/2)∇log π(q), εI)
  private drift(q: Vector2, gradient: Vector2): Vector2 {
    return { x: q.x + (this.epsilon / 2) * gradient.x, y: q.y + (this.epsilon / 2) * gradient.y };
  }

  private logProposal(to: Vector2, mean: Vector2): number {
    const dx = to.x - mean.x;
    const dy = to.y - mean.y;
    return -(dx * dx + dy * dy) / (2 * this.epsilon);
  }

  step(current: Vector2, target: Distribution, rng: Rng): StepResult {
    const gradient = target.gradient(current);
    const mean = this.drift(current, gradient);
    const noiseRadius = Math.sqrt(this.epsilon);
    const proposal = { x: mean.x + randn(rng) * noiseRadius, y: mean.y + randn(rng) * noiseRadius };

    const logPiProposal = target.logDensity(proposal);
    let accepted = false;
    if (logPiProposal > -Infinity) {
      const backMean = this.drift(proposal, target.gradient(proposal));
      const logAlpha = logPiProposal - target.logDensity(current)
        + this.logProposal(current, backMean) - this.logProposal(proposal, mean);
      accepted = Math.log(rng()) < logAlpha;
    }
    return {
      next: accepted ? proposal : current,
      accepted,
      events: [
        { type: 'langevin', gradient, driftPoint: mean, noiseRadius },
        { type: 'proposal', from: current, to: proposal },
      ],
    };
  }
}
