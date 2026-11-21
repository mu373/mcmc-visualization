import { describe, expect, it } from 'vitest';
import { DISTRIBUTIONS, DISTRIBUTION_KEYS } from './presets';
import { StandardGaussian } from './StandardGaussian';
import { RosenbrockDistribution } from './RosenbrockDistribution';
import { AckleyDistribution } from './AckleyDistribution';
import { MultimodalDistribution } from './MultimodalDistribution';

describe.each(DISTRIBUTION_KEYS)('%s', key => {
  const d = DISTRIBUTIONS[key].create();
  const b = d.bounds;

  it('gradient matches a numerical derivative of the unbounded log density', () => {
    const h = 1e-6;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const p = { x: b.xMin + ((i + 0.37) * (b.xMax - b.xMin)) / 9, y: b.yMin + ((j + 0.63) * (b.yMax - b.yMin)) / 9 };
        const g = d.gradient(p);
        const fx = (d.unboundedLogDensity({ x: p.x + h, y: p.y }) - d.unboundedLogDensity({ x: p.x - h, y: p.y })) / (2 * h);
        const fy = (d.unboundedLogDensity({ x: p.x, y: p.y + h }) - d.unboundedLogDensity({ x: p.x, y: p.y - h })) / (2 * h);
        expect(Math.abs(g.x - fx)).toBeLessThan(1e-4 * (1 + Math.abs(fx)));
        expect(Math.abs(g.y - fy)).toBeLessThan(1e-4 * (1 + Math.abs(fy)));
      }
    }
  });

  it('is supported exactly on the display rectangle', () => {
    const inside = { x: (b.xMin + b.xMax) / 2, y: b.yMax };
    expect(d.logDensity(inside)).toBe(d.unboundedLogDensity(inside));
    expect(d.logDensity({ x: b.xMax + 1e-9, y: inside.y })).toBe(-Infinity);
    expect(d.logDensity({ x: inside.x, y: b.yMin - 1e-9 })).toBe(-Infinity);
    expect(d.logDensity({ x: NaN, y: 0 })).toBe(-Infinity);
    expect(d.density({ x: b.xMin - 1, y: inside.y })).toBe(0);
  });

  it('has a finite gradient far outside the support', () => {
    const g = d.gradient({ x: b.xMax + 30, y: b.yMin - 30 });
    expect(Number.isFinite(g.x) && Number.isFinite(g.y)).toBe(true);
  });
});

describe('formulas', () => {
  it('standard normal keeps -800 at (40, 0) without a floor', () => {
    const d = new StandardGaussian();
    expect(d.unboundedLogDensity({ x: 40, y: 0 })).toBe(-800);
    expect(d.gradient({ x: 40, y: 0 })).toEqual({ x: -40, y: -0 });
  });

  it('truncated Rosenbrock marginal ratio pX(3)/pX(1) is about 0.0210', () => {
    const d = new RosenbrockDistribution();
    expect(d.marginalX(3) / d.marginalX(1)).toBeCloseTo(0.0210, 4);
  });

  it('Ackley gradient is zero at the cusp', () => {
    expect(new AckleyDistribution().gradient({ x: 0, y: 0 })).toEqual({ x: -0, y: -0 });
  });

  it('mixture gradient still points home where component densities underflow', () => {
    const g = new MultimodalDistribution().gradient({ x: 100, y: 100 });
    expect(g.x).toBeLessThan(-100);
    expect(g.y).toBeLessThan(-100);
  });
});
