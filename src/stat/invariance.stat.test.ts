import { describe, expect, it } from 'vitest';
import { ALGORITHM_KEYS, createAlgorithm, type AlgorithmType } from '../algorithms';
import { DISTRIBUTIONS, type DistributionKey } from '../distributions/presets';
import { mulberry32, randn, type Rng } from '../core/rng';
import type { Vector2 } from '../core/utils';

// One-step invariance: start from an exact independent draw of the truncated target,
// take one transition, and check a statistic's mean does not drift. Independent starts
// make the per-trial changes i.i.d., so the standard error is exact.
// 50 cells plus extras at |z| < 4 keeps the family-wise false alarm rate near 0.3%.
const Z_MAX = 4;
const TRIALS = 16000;
const tau = 2 * Math.PI;
const r2 = (p: Vector2) => p.x * p.x + p.y * p.y;

type Reference = { draw: (rng: Rng) => Vector2; statistic: (p: Vector2) => number };

// Full-plane draws; truncation to the box is applied by rejection below.
const REFERENCES: Record<DistributionKey, Reference> = {
  gaussian: { draw: g => ({ x: randn(g), y: randn(g) }), statistic: r2 },
  quartic: {
    draw: g => {
      const r = Math.sqrt(Math.abs(randn(g)) / Math.SQRT2);
      const a = tau * g();
      return { x: r * Math.cos(a), y: r * Math.sin(a) };
    },
    statistic: r2,
  },
  banana: { draw: g => { const x = 1 + randn(g); return { x, y: x * x + randn(g) }; }, statistic: p => (p.y - p.x * p.x) ** 2 },
  rosenbrock: { draw: g => { const x = 1 + 5 * randn(g); return { x, y: x * x + 0.5 * randn(g) }; }, statistic: p => Number(Math.abs(p.y - p.x * p.x) > 0.5) },
  squiggle: {
    draw: g => { const x = Math.SQRT2 * randn(g); return { x, y: 0.125 * x + Math.sqrt(0.46875) * randn(g) - Math.sin(5 * x) }; },
    statistic: p => (p.y + Math.sin(5 * p.x) - 0.125 * p.x) ** 2,
  },
  bimodal: { draw: g => ({ x: (g() < 0.5 ? -1.5 : 1.5) + 0.8 * randn(g), y: 0.8 * randn(g) }), statistic: p => Number(p.x > 0) },
  multimodal: {
    draw: g => {
      const u = 2.1 * g();
      const [x, y, v] = u < 0.8 ? [-1.5, -1.5, 0.8] : u < 1.6 ? [1.5, 1.5, 0.8] : [-2, 2, 0.5];
      return { x: x + Math.sqrt(v) * randn(g), y: y + Math.sqrt(v) * randn(g) };
    },
    statistic: p => Number(p.x < 0 && p.y > 0),
  },
  donut: {
    draw: g => {
      for (;;) {
        const p = { x: 2 * randn(g), y: 2 * randn(g) };
        const r = Math.hypot(p.x, p.y);
        if (Math.log(g()) < -((r - 2) ** 2) / (2 * 0.4 ** 2) + (r * r) / 8 - 4 / (2 * (4 - 0.4 ** 2))) return p;
      }
    },
    statistic: p => (Math.hypot(p.x, p.y) - 2) ** 2,
  },
  rastrigin: {
    draw: g => {
      const coord = () => { for (;;) { const x = Math.sqrt(5) * randn(g); if (Math.log(g()) < Math.cos(tau * x) - 1) return x; } };
      return { x: coord(), y: coord() };
    },
    statistic: p => Math.cos(tau * p.x) + Math.cos(tau * p.y),
  },
  ackley: {
    draw: g => {
      for (;;) {
        const p = { x: 10 * g() - 5, y: 10 * g() - 5 };
        const cost = 20 * (1 - Math.exp(-0.2 * Math.sqrt(r2(p) / 2))) + Math.E - Math.exp((Math.cos(tau * p.x) + Math.cos(tau * p.y)) / 2);
        if (Math.log(g()) < -0.3 * cost) return p;
      }
    },
    statistic: p => Math.hypot(p.x, p.y),
  },
};

function oneStepZ(dist: DistributionKey, key: AlgorithmType, seed: number, settings: object = {}) {
  const target = DISTRIBUTIONS[dist].create();
  const alg = Object.assign(createAlgorithm(key), settings);
  const { draw, statistic } = REFERENCES[dist];
  const rng = mulberry32(seed);
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < TRIALS; i++) {
    let start = draw(rng);
    while (!target.contains(start)) start = draw(rng);
    const end = alg.step(start, target, rng).next;
    const d = statistic(end) - statistic(start);
    sum += d;
    sumSq += d * d;
  }
  const mean = sum / TRIALS;
  const se = Math.sqrt(Math.max(0, (sumSq / TRIALS - mean * mean) / (TRIALS - 1)));
  return { mean, se, z: se > 0 ? mean / se : 0 };
}

describe('one-step invariance on the truncated targets', () => {
  const dists = Object.keys(REFERENCES) as DistributionKey[];
  dists.forEach((dist, i) => {
    ALGORITHM_KEYS.forEach((key, j) => {
      it(`${key} on ${dist}`, () => {
        const r = oneStepZ(dist, key, 1000 * i + j + 1);
        expect(Math.abs(r.z), `mean change ${r.mean} se ${r.se}`).toBeLessThan(Z_MAX);
      });
    });
  });

  for (const seed of [83, 501, 783]) {
    it(`NUTS on Quartic at epsilon 0.5, seed ${seed}`, () => {
      const r = oneStepZ('quartic', 'nuts', seed, { epsilon: 0.5 });
      expect(Math.abs(r.z), `mean change ${r.mean} se ${r.se}`).toBeLessThan(Z_MAX);
    });
  }
});

describe('long chains', () => {
  // E[r²] under exp(-r⁴) in 2D is 1/√π; the box ±2.5 cuts off mass below e^-39.
  const expected = 1 / Math.sqrt(Math.PI);
  for (const key of ALGORITHM_KEYS) {
    it(`${key} recovers the Quartic mean squared radius`, () => {
      const target = DISTRIBUTIONS.quartic.create();
      const alg = createAlgorithm(key);
      const rng = mulberry32(2024);
      const batches = 100;
      const perBatch = 1000;
      let q: Vector2 = { x: 0, y: 0 };
      for (let i = 0; i < 2000; i++) q = alg.step(q, target, rng).next;
      const means: number[] = [];
      for (let b = 0; b < batches; b++) {
        let s = 0;
        for (let i = 0; i < perBatch; i++) s += r2((q = alg.step(q, target, rng).next));
        means.push(s / perBatch);
      }
      // Batch means absorb the chain's autocorrelation into the standard error.
      const mean = means.reduce((a, b) => a + b, 0) / batches;
      const se = Math.sqrt(means.reduce((a, m) => a + (m - mean) ** 2, 0) / (batches - 1) / batches);
      expect(Math.abs(mean - expected) / se, `mean ${mean} se ${se}`).toBeLessThan(Z_MAX);
    });
  }
});
