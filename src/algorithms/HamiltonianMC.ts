import type { MCMCAlgorithm, StepResult } from './MCMCAlgorithm';
import type { Distribution } from '../distributions/Distribution';
import { randn, type Rng } from '../core/rng';
import { isFiniteVector, type Vector2 } from '../core/utils';
import { hamiltonian, leapfrog, type PhasePoint } from '../core/leapfrog';

export class HamiltonianMC implements MCMCAlgorithm {
  readonly key = 'hmc';
  readonly name = 'Hamiltonian Monte Carlo';
  readonly description = 'Uses gradient-based Hamiltonian dynamics for efficient exploration';
  readonly rateLabel = 'Accept';

  epsilon = 0.1;
  L = 20;

  params() {
    return { epsilon: this.epsilon, L: this.L };
  }

  step(current: Vector2, target: Distribution, rng: Rng): StepResult {
    const momentum = { x: randn(rng), y: randn(rng) };
    const start: PhasePoint = { q: current, p: momentum };
    const H0 = hamiltonian(target, start);

    let state = start;
    const path: Vector2[] = [current];
    let diverged = false;
    for (let i = 0; i < this.L; i++) {
      state = leapfrog(target, state, this.epsilon);
      if (!isFiniteVector(state.q) || !isFiniteVector(state.p)) {
        diverged = true;
        break;
      }
      path.push(state.q);
    }

    const accepted = !diverged && Math.log(rng()) < H0 - hamiltonian(target, state);
    return {
      next: accepted ? state.q : current,
      accepted,
      flag: diverged ? 'divergent' : undefined,
      events: [
        { type: 'trajectory', path, momentum, diverged },
        { type: 'proposal', from: current, to: path[path.length - 1] },
      ],
    };
  }
}
