import { afterEach, describe, expect, it, vi } from 'vitest';
import { Simulation } from './Simulation';
import { ALGORITHM_KEYS } from '../algorithms';
import { DISTRIBUTION_KEYS } from '../distributions/presets';
import { chainToCsv } from './csv';
import { Histograms } from './histogram';
import type { Vector2 } from './utils';

function run(sim: Simulation, n: number) {
  for (let i = 0; i < n; i++) sim.step();
  return sim.chain.slice();
}

describe('chain recording', () => {
  for (const key of ALGORITHM_KEYS) {
    it(`${key}: N iterations give N+1 rows inside the support, starting at the start point`, () => {
      const sim = new Simulation('rosenbrock', key, 5);
      sim.setStartPosition({ x: 0.5, y: 1 });
      run(sim, 300);
      expect(sim.chain).toHaveLength(301);
      expect(sim.iterations).toBe(300);
      expect(sim.chain[0]).toEqual({ x: 0.5, y: 1 });
      expect(sim.chain.every(p => sim.distribution.contains(p))).toBe(true);
    });
  }

  it('MH repeats the current position on rejection', () => {
    const sim = new Simulation('gaussian', 'rwmh', 1);
    Object.assign(sim.algorithm, { sigma: 3 });
    run(sim, 2000);
    let repeats = 0;
    for (let i = 1; i < sim.chain.length; i++) if (sim.chain[i] === sim.chain[i - 1]) repeats++;
    expect(repeats).toBe(sim.iterations - sim.acceptCount);
    expect(repeats).toBeGreaterThan(1000);
  });

  it('display settings do not change the chain for a seed', () => {
    const a = new Simulation('multimodal', 'hmc', 77);
    const b = new Simulation('multimodal', 'hmc', 77);
    Object.assign(b.visualizer, { maxTrailLength: 10, animateTrajectory: false, show3D: false, burnIn: 0 });
    expect(run(b, 200)).toEqual(run(a, 200));
  });

  it('setSeed replays a run', () => {
    const sim = new Simulation('banana', 'nuts', 3);
    const first = run(sim, 100);
    sim.setSeed(3);
    expect(run(sim, 100)).toEqual(first);
  });

  it('Reset keeps parameters and the start point and starts a new chain', () => {
    const sim = new Simulation('gaussian', 'hmc', 3);
    Object.assign(sim.algorithm, { epsilon: 0.3 });
    sim.setStartPosition({ x: 1, y: 1 });
    run(sim, 10);
    sim.reset();
    expect(sim.algorithm.params()).toEqual({ epsilon: 0.3, L: 20 });
    expect(sim.chain).toEqual([{ x: 1, y: 1 }]);
    expect(sim.acceptCount).toBe(0);
  });

  it('records a parameter change from the next iteration', () => {
    const sim = new Simulation('gaussian', 'rwmh', 3);
    run(sim, 5);
    Object.assign(sim.algorithm, { sigma: 1.5 });
    run(sim, 5);
    expect(sim.rowParams.map(p => p.sigma)).toEqual([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5, 1.5, 1.5, 1.5, 1.5]);
  });
});

describe('play loop', () => {
  afterEach(() => vi.useRealTimers());

  function iterationsAfter(actions: (sim: Simulation) => void) {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 16) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    const sim = new Simulation('gaussian', 'rwmh', 1);
    sim.delay = 100;
    actions(sim);
    vi.advanceTimersByTime(2000);
    sim.dispose();
    return sim.iterations;
  }

  it('fast Pause then Play keeps a single loop', () => {
    const single = iterationsAfter(sim => sim.play());
    const toggled = iterationsAfter(sim => {
      sim.play();
      vi.advanceTimersByTime(50);
      sim.pause();
      sim.play();
      vi.advanceTimersByTime(30);
      sim.pause();
      sim.play();
    });
    expect(single).toBeGreaterThan(10);
    expect(Math.abs(toggled - single)).toBeLessThanOrEqual(2);
  });

  it('changing method or target keeps playing and starts a new run', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 16) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    const sim = new Simulation('gaussian', 'rwmh', 1);
    sim.play();
    vi.advanceTimersByTime(500);
    sim.setAlgorithm('mala');
    expect(sim.chain).toHaveLength(1);
    sim.setDistribution('donut');
    vi.advanceTimersByTime(500);
    expect(sim.isRunning).toBe(true);
    expect(sim.iterations).toBeGreaterThan(0);
    sim.reset();
    expect(sim.isRunning).toBe(false);
    sim.dispose();
  });

  it('Step while paused adds exactly one iteration', () => {
    const sim = new Simulation('gaussian', 'nuts', 1);
    sim.step();
    sim.step();
    expect(sim.iterations).toBe(2);
  });
});

describe('CSV', () => {
  it('round-trips every row, with params and run constants', () => {
    const sim = new Simulation('squiggle', 'hmc', 9);
    run(sim, 50);
    Object.assign(sim.algorithm, { L: 5 });
    run(sim, 50);
    const [header, ...lines] = chainToCsv(sim).trimEnd().split('\n');
    expect(header).toBe('iteration,x,y,epsilon,L,method,target,seed');
    expect(lines).toHaveLength(101);
    const rows = lines.map(l => l.split(','));
    rows.forEach((r, i) => {
      expect(Number(r[0])).toBe(i);
      expect({ x: Number(r[1]), y: Number(r[2]) }).toEqual(sim.chain[i]);
      expect(r.slice(5)).toEqual(['hmc', 'squiggle', '9']);
    });
    expect(rows[50][4]).toBe('20');
    expect(rows[51][4]).toBe('5');
  });

  it('reproduces the on-screen bin counts after burn-in from the file alone', () => {
    const sim = new Simulation('bimodal', 'rwmh', 4);
    run(sim, 1500);
    const hist = new Histograms();
    hist.sync(sim.chain, sim.distribution.bounds, 25, 200, sim.runId);
    const points: Vector2[] = chainToCsv(sim).trimEnd().split('\n').slice(1).map(l => {
      const [, x, y] = l.split(',').map(Number);
      return { x, y };
    });
    const fromFile = new Histograms();
    fromFile.sync(points, sim.distribution.bounds, 25, 200, 0);
    expect(fromFile.count).toBe(1301);
    expect(fromFile.xy).toEqual(hist.xy);
  });
});

it('every distribution key runs under every algorithm', () => {
  for (const d of DISTRIBUTION_KEYS) {
    for (const a of ALGORITHM_KEYS) {
      const sim = new Simulation(d, a, 11);
      run(sim, 20);
      expect(sim.chain.every(p => sim.distribution.contains(p))).toBe(true);
    }
  }
});
