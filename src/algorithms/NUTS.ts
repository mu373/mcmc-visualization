import type { MCMCAlgorithm, StepFlag, StepResult } from './MCMCAlgorithm';
import type { Distribution } from '../distributions/Distribution';
import { randn, type Rng } from '../core/rng';
import { isFiniteVector, vectorDot, vectorSubtract, type Vector2 } from '../core/utils';
import { hamiltonian, leapfrog, type PhasePoint } from '../core/leapfrog';

interface Tree {
  minus: PhasePoint;
  plus: PhasePoint;
  candidate: Vector2;
  n: number;
  s: boolean;
  flag?: StepFlag;
}

function noUTurn(minus: PhasePoint, plus: PhasePoint): boolean {
  const dq = vectorSubtract(plus.q, minus.q);
  return vectorDot(dq, minus.p) >= 0 && vectorDot(dq, plus.p) >= 0;
}

// Slice condition on the log scale. logU = log(uniform) - H0, so adding a constant to
// the log density shifts logU and -H' together and leaves every decision unchanged.
export function sliceLeaf(logU: number, H: number, deltaMax: number): { n: number; s: boolean } {
  return { n: logU <= -H ? 1 : 0, s: logU < deltaMax - H };
}

export class NUTS implements MCMCAlgorithm {
  readonly key = 'nuts';
  readonly name = 'No-U-Turn Sampler';
  readonly description = 'HMC variant that automatically determines optimal trajectory length by detecting when the path starts doubling back (U-turn)';
  // NUTS has no accept/reject step; the ratio counts iterations that moved.
  readonly rateLabel = 'Move';

  epsilon = 0.1;
  maxTreeDepth = 10;
  deltaMax = 1000;

  params() {
    return { epsilon: this.epsilon, maxTreeDepth: this.maxTreeDepth };
  }

  private buildTree(target: Distribution, from: PhasePoint, logU: number, v: number, j: number, rng: Rng): Tree {
    if (j === 0) {
      const leaf = leapfrog(target, from, v * this.epsilon);
      const { n, s } = sliceLeaf(logU, hamiltonian(target, leaf), this.deltaMax);
      const hitWall = isFiniteVector(leaf.q) && !target.contains(leaf.q);
      return { minus: leaf, plus: leaf, candidate: leaf.q, n, s, flag: s ? undefined : hitWall ? 'wall' : 'divergent' };
    }

    const tree = this.buildTree(target, from, logU, v, j - 1, rng);
    if (!tree.s) return tree;

    const tree2 = this.buildTree(target, v === -1 ? tree.minus : tree.plus, logU, v, j - 1, rng);
    const n = tree.n + tree2.n;
    const candidate = n > 0 && rng() < tree2.n / n ? tree2.candidate : tree.candidate;
    const minus = v === -1 ? tree2.minus : tree.minus;
    const plus = v === 1 ? tree2.plus : tree.plus;
    return { minus, plus, candidate, n, s: tree2.s && noUTurn(minus, plus), flag: tree2.flag };
  }

  step(current: Vector2, target: Distribution, rng: Rng): StepResult {
    const start: PhasePoint = { q: current, p: { x: randn(rng), y: randn(rng) } };
    const logU = Math.log(rng()) - hamiltonian(target, start);

    let minus = start;
    let plus = start;
    let next = current;
    let n = 1;
    let s = true;
    let flag: StepFlag | undefined;
    for (let j = 0; s && j < this.maxTreeDepth; j++) {
      const v = rng() < 0.5 ? -1 : 1;
      const tree = this.buildTree(target, v === -1 ? minus : plus, logU, v, j, rng);
      if (v === -1) minus = tree.minus;
      else plus = tree.plus;
      if (tree.s && rng() < tree.n / n) next = tree.candidate;
      n += tree.n;
      s = tree.s && noUTurn(minus, plus);
      if (!tree.s) flag = tree.flag;
    }

    return {
      next,
      accepted: next.x !== current.x || next.y !== current.y,
      flag,
      events: [{ type: 'proposal', from: current, to: next }],
    };
  }
}
