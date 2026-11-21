import type { MCMCAlgorithm, StepResult } from './MCMCAlgorithm';
import type { Distribution } from '../distributions/Distribution';
import type { Rng } from '../core/rng';
import type { Vector2 } from '../core/utils';

// Draw from a 1D log density approximated as piecewise constant on n bins of [min, max].
export function gridDraw(logDensity: (t: number) => number, min: number, max: number, n: number, rng: Rng): number {
  const width = (max - min) / n;
  const logs = new Float64Array(n);
  let peak = -Infinity;
  for (let i = 0; i < n; i++) {
    logs[i] = logDensity(min + (i + 0.5) * width);
    if (logs[i] > peak) peak = logs[i];
  }
  let total = 0;
  for (let i = 0; i < n; i++) total += logs[i] = Math.exp(logs[i] - peak);
  let u = rng() * total;
  let i = 0;
  while (i < n - 1 && (u -= logs[i]) > 0) i++;
  return min + (i + rng()) * width;
}

export class GibbsSampler implements MCMCAlgorithm {
  readonly key = 'gibbs';
  readonly name = 'Gibbs Sampler';
  readonly description = 'Samples each coordinate from its conditional distribution';
  readonly rateLabel = null;

  gridResolution = 200;

  params() {
    return { gridResolution: this.gridResolution };
  }

  step(current: Vector2, target: Distribution, rng: Rng): StepResult {
    const { xMin, xMax, yMin, yMax } = target.bounds;
    const n = this.gridResolution;
    const x = gridDraw(t => target.logDensity({ x: t, y: current.y }), xMin, xMax, n, rng);
    const intermediate = { x, y: current.y };
    const y = gridDraw(t => target.logDensity({ x, y: t }), yMin, yMax, n, rng);
    const next = { x, y };
    return {
      next,
      accepted: true,
      events: [
        { type: 'trajectory', path: [current, intermediate, next] },
        { type: 'proposal', from: current, to: next },
      ],
    };
  }
}
