import { createAlgorithm, type AlgorithmType, type MCMCAlgorithm } from '../algorithms';
import { LangevinMC } from '../algorithms/LangevinMC';
import type { Params, StepFlag } from '../algorithms/MCMCAlgorithm';
import { DISTRIBUTIONS, type DistributionKey } from '../distributions/presets';
import type { Distribution } from '../distributions/Distribution';
import { mulberry32, randomSeed, type Rng } from './rng';
import type { Vector2 } from './utils';
import { Visualizer } from './Visualizer';

function sameParams(a: Params, b: Params): boolean {
  return Object.keys(a).every(k => a[k] === b[k]);
}

// One run is the chain from `start` under one algorithm, target, and seed.
// chain[i] is iteration i; rowParams[i] holds the sampler params that produced it.
export class Simulation {
  algorithm!: MCMCAlgorithm;
  distribution!: Distribution;
  distributionKey!: DistributionKey;
  readonly visualizer = new Visualizer();

  delay = 100; // ms between steps
  isRunning = false;

  start: Vector2 = { x: 0, y: 0 };
  seed = 0;
  chain: Vector2[] = [];
  rowParams: Params[] = [];
  acceptCount = 0;
  flagCounts: Record<StepFlag, number> = { divergent: 0, wall: 0 };
  runId = 0;
  version = 0;

  private rng: Rng = Math.random;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private frame: number | null = null;
  private listeners = new Set<() => void>();

  constructor(distributionKey: DistributionKey, algorithmKey: AlgorithmType, seed = randomSeed()) {
    this.distributionKey = distributionKey;
    this.distribution = DISTRIBUTIONS[distributionKey].create();
    this.algorithm = createAlgorithm(algorithmKey);
    this.newRun(seed);
  }

  get iterations(): number {
    return this.chain.length - 1;
  }

  get rate(): number {
    return this.iterations > 0 ? this.acceptCount / this.iterations : 0;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  notify(): void {
    this.version++;
    this.listeners.forEach(l => l());
  }

  setAlgorithm(key: AlgorithmType): void {
    this.algorithm = createAlgorithm(key);
    this.newRun();
  }

  setDistribution(key: DistributionKey): void {
    this.distributionKey = key;
    this.distribution = DISTRIBUTIONS[key].create();
    this.start = { x: 0, y: 0 };
    this.newRun();
  }

  setStartPosition(position: Vector2): void {
    this.start = position;
    this.newRun();
  }

  setSeed(seed: number): void {
    this.newRun(seed);
  }

  reset(): void {
    this.pause();
    this.newRun();
  }

  private newRun(seed = randomSeed()): void {
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    this.chain = [this.start];
    if (this.algorithm instanceof LangevinMC) {
      // Near these presets' edges the default drift would jump across the entire box.
      const steep = this.distributionKey === 'quartic' || this.distributionKey === 'rosenbrock';
      this.algorithm.defaultEpsilon = steep ? 0.01 : 0.3;
    }
    this.rowParams = [this.algorithm.params()];
    this.acceptCount = 0;
    this.flagCounts = { divergent: 0, wall: 0 };
    this.runId++;
    this.visualizer.reset(this.start);
    this.notify();
  }

  step(): void {
    const current = this.chain[this.chain.length - 1];
    const result = this.algorithm.step(current, this.distribution, this.rng);
    this.chain.push(result.next);
    const last = this.rowParams[this.rowParams.length - 1];
    const params = this.algorithm.params();
    this.rowParams.push(sameParams(last, params) ? last : params);
    if (result.accepted) this.acceptCount++;
    if (result.flag) this.flagCounts[result.flag]++;
    this.visualizer.apply(current, result);
    this.notify();
  }

  play(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.notify();
    this.loop();
  }

  pause(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.timer = null;
    this.frame = null;
    if (!this.isRunning) return;
    this.isRunning = false;
    this.notify();
  }

  toggle(): void {
    if (this.isRunning) this.pause();
    else this.play();
  }

  dispose(): void {
    this.pause();
    this.listeners.clear();
  }

  private loop = (): void => {
    this.frame = null;
    if (!this.isRunning) return;
    this.step();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.frame = requestAnimationFrame(this.loop);
    }, this.delay);
  };
}
