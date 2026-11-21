import type { MCMCAlgorithm, StepResult } from './MCMCAlgorithm';
import type { Distribution } from '../distributions/Distribution';
import { randn, type Rng } from '../core/rng';
import type { Vector2 } from '../core/utils';

export class RandomWalkMH implements MCMCAlgorithm {
  readonly key = 'rwmh';
  readonly name = 'Random Walk Metropolis-Hastings';
  readonly description = 'Proposes new states from a Gaussian centered at current state';
  readonly rateLabel = 'Accept';

  sigma = 0.5;

  params() {
    return { sigma: this.sigma };
  }

  step(current: Vector2, target: Distribution, rng: Rng): StepResult {
    const proposal = {
      x: current.x + randn(rng) * this.sigma,
      y: current.y + randn(rng) * this.sigma,
    };
    const logAlpha = target.logDensity(proposal) - target.logDensity(current);
    const accepted = Math.log(rng()) < logAlpha;
    return {
      next: accepted ? proposal : current,
      accepted,
      events: [{ type: 'proposal', from: current, to: proposal, radius: this.sigma }],
    };
  }
}
