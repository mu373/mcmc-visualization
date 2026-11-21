import { describe, expect, it } from 'vitest';
import { createAlgorithm, ALGORITHM_KEYS } from './index';
import { NUTS, sliceLeaf } from './NUTS';
import { Simulation } from '../core/Simulation';
import { HamiltonianMC } from './HamiltonianMC';
import { GibbsSampler } from './GibbsSampler';
import { mulberry32, type Rng } from '../core/rng';
import { leapfrog } from '../core/leapfrog';
import { isFiniteVector, type Vector2 } from '../core/utils';
import { StandardGaussian } from '../distributions/StandardGaussian';
import { QuarticGaussian } from '../distributions/QuarticGaussian';
import { DISTRIBUTIONS, DISTRIBUTION_KEYS } from '../distributions/presets';

class ShiftedGaussian extends StandardGaussian {
  constructor(private c: number) { super(); }
  override unboundedLogDensity(p: Vector2) { return super.unboundedLogDensity(p) + this.c; }
}

function scripted(values: number[]): Rng {
  return () => {
    const v = values.shift();
    if (v === undefined) throw new Error('rng stream exhausted');
    return v;
  };
}

describe('NUTS', () => {
  it('slice decisions: candidate iff logU <= -H, continue iff logU < deltaMax - H', () => {
    expect(sliceLeaf(-2, 2, 1000)).toEqual({ n: 1, s: true });
    expect(sliceLeaf(-2 + 1e-9, 2, 1000)).toEqual({ n: 0, s: true });
    expect(sliceLeaf(-5, 1004.999, 1000).s).toBe(true);
    expect(sliceLeaf(-5, 1005, 1000).s).toBe(false);
  });

  it('chooses the same candidates when a constant is added to the log density', () => {
    const chains = [0, -5, 5].map(c => {
      const target = new ShiftedGaussian(c);
      const nuts = new NUTS();
      const rng = mulberry32(42);
      const chain: Vector2[] = [{ x: 0.3, y: -0.2 }];
      for (let i = 0; i < 200; i++) chain.push(nuts.step(chain[chain.length - 1], target, rng).next);
      return chain;
    });
    expect(chains[1]).toEqual(chains[0]);
    expect(chains[2]).toEqual(chains[0]);
  });

  it('flags a wall hit, not a divergence, when the tree leaves the support', () => {
    const nuts = new NUTS();
    nuts.epsilon = 0.5;
    const rng = mulberry32(7);
    const target = new StandardGaussian();
    const flags = new Set<string | undefined>();
    let q: Vector2 = { x: 3.9, y: 3.9 };
    for (let i = 0; i < 200; i++) {
      const r = nuts.step(q, target, rng);
      flags.add(r.flag);
      q = r.next;
    }
    expect(flags.has('wall')).toBe(true);
    expect(flags.has('divergent')).toBe(false);
  });
});

describe('acceptance thresholds', () => {
  // Box-Muller with u2 = 0 maps u1 = exp(-v²/2) to the normal draw v.
  const impulse = { x: 1.3, y: 1.7 };
  const r2 = impulse.x ** 2 + impulse.y ** 2;
  const cases = {
    rwmh: { setup: { sigma: 1 }, proposed: impulse, logAlpha: -r2 / 2 },
    mala: { setup: { epsilon: 1 }, proposed: impulse, logAlpha: -r2 / 8 },
    hmc: (() => {
      const e = 0.5;
      const theta = Math.acos(1 - (e * e) / 2);
      const b = (e * Math.sin(5 * theta)) / Math.sin(theta);
      return { setup: { epsilon: e, L: 5 }, proposed: { x: b * impulse.x, y: b * impulse.y }, logAlpha: (r2 * (1 - Math.cos(5 * theta) ** 2 - b * b)) / 2 };
    })(),
  } as const;

  for (const [key, { setup, proposed, logAlpha }] of Object.entries(cases)) {
    it(`${key} accepts just below and rejects just above alpha`, () => {
      const alpha = Math.exp(logAlpha);
      const run = (u: number) => {
        const alg = Object.assign(createAlgorithm(key as 'rwmh'), setup);
        const rng = scripted([Math.exp(-(impulse.x ** 2) / 2), 0, Math.exp(-(impulse.y ** 2) / 2), 0, u]);
        return alg.step({ x: 0, y: 0 }, new StandardGaussian(), rng).next;
      };
      const accepted = run(alpha - 1e-7);
      expect(Math.hypot(accepted.x - proposed.x, accepted.y - proposed.y)).toBeLessThan(1e-12);
      expect(run(alpha + 1e-7)).toEqual({ x: 0, y: 0 });
    });
  }
});

describe('leapfrog', () => {
  it('returns to the start after negating momentum', () => {
    const target = DISTRIBUTIONS.squiggle.create();
    let state = { q: { x: 0.4, y: -0.3 }, p: { x: 0.7, y: 1.1 } };
    for (let i = 0; i < 25; i++) state = leapfrog(target, state, 0.05);
    state = { q: state.q, p: { x: -state.p.x, y: -state.p.y } };
    for (let i = 0; i < 25; i++) state = leapfrog(target, state, 0.05);
    expect(state.q.x).toBeCloseTo(0.4, 10);
    expect(state.q.y).toBeCloseTo(-0.3, 10);
  });
});

describe('HMC divergence', () => {
  it('keeps chain and drawing data finite on Quartic at epsilon 0.5', () => {
    const hmc = new HamiltonianMC();
    hmc.epsilon = 0.5;
    const target = new QuarticGaussian();
    const rng = mulberry32(12345);
    let q: Vector2 = { x: 0, y: 0 };
    let divergent = 0;
    for (let i = 0; i < 2000; i++) {
      const r = hmc.step(q, target, rng);
      for (const e of r.events) {
        if (e.type === 'trajectory') expect(e.path.every(isFiniteVector)).toBe(true);
        if (e.type === 'proposal') expect(isFiniteVector(e.to)).toBe(true);
      }
      if (r.flag === 'divergent') {
        divergent++;
        expect(r.accepted).toBe(false);
      }
      q = r.next;
      expect(isFiniteVector(q)).toBe(true);
    }
    expect(divergent).toBeGreaterThan(100);
  });
});

describe('Gibbs', () => {
  it('updates x given y, then y given the new x', () => {
    const gibbs = new GibbsSampler();
    const current = { x: 0, y: 4 };
    const target = DISTRIBUTIONS.banana.create();
    // Y | X=x is N(x², 1) on [-3, 10]. Its median here is within one bin of x².
    const r = gibbs.step(current, target, scripted([0.85, 0.5, 0.5, 0.5]));
    expect(r.next.x).toBeGreaterThan(1.5);
    expect(r.next.x).toBeLessThan(2.5);
    expect(Math.abs(r.next.y - r.next.x ** 2)).toBeLessThan(13 / gibbs.gridResolution);
    const traj = r.events.find(e => e.type === 'trajectory');
    expect(traj?.type === 'trajectory' && traj.path).toEqual([current, { x: r.next.x, y: current.y }, r.next]);
  });
});

describe('support boundary', () => {
  for (const dist of DISTRIBUTION_KEYS) {
    for (const key of ['hmc', 'nuts', 'mala'] as const) {
      it(`${key} moves from just inside the edge of ${dist}`, () => {
        const target = DISTRIBUTIONS[dist].create();
        const b = target.bounds;
        const alg = new Simulation(dist, key, 99).algorithm;
        const rng = mulberry32(99);
        let q = { x: b.xMax - 5e-4, y: (b.yMin + b.yMax) / 2 };
        const start = q;
        for (let i = 0; i < 200; i++) {
          q = alg.step(q, target, rng).next;
          expect(target.contains(q)).toBe(true);
        }
        expect(q).not.toEqual(start);
      });
    }
  }
});

it('every algorithm key builds a sampler reporting its own key', () => {
  for (const key of ALGORITHM_KEYS) expect(createAlgorithm(key).key).toBe(key);
});
