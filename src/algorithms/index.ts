import { RandomWalkMH } from './RandomWalkMH';
import { HamiltonianMC } from './HamiltonianMC';
import { NUTS } from './NUTS';
import { GibbsSampler } from './GibbsSampler';
import type { MCMCAlgorithm } from './MCMCAlgorithm';

export type AlgorithmType = 'rwmh' | 'hmc' | 'nuts' | 'gibbs';

export interface AlgorithmConfig {
  key: AlgorithmType;
  name: string;
  create: () => MCMCAlgorithm;
}

export const ALGORITHMS: AlgorithmConfig[] = [
  {
    key: 'rwmh',
    name: 'Random Walk MH',
    create: () => new RandomWalkMH(),
  },
  {
    key: 'hmc',
    name: 'Hamiltonian MC',
    create: () => new HamiltonianMC(),
  },
  {
    key: 'nuts',
    name: 'NUTS',
    create: () => new NUTS(),
  },
  {
    key: 'gibbs',
    name: 'Gibbs Sampler',
    create: () => new GibbsSampler(),
  },
];

export function createAlgorithm(key: AlgorithmType): MCMCAlgorithm {
  const config = ALGORITHMS.find(a => a.key === key);
  if (!config) throw new Error(`Unknown algorithm: ${key}`);
  return config.create();
}

export { RandomWalkMH, HamiltonianMC, NUTS, GibbsSampler };
export type { MCMCAlgorithm } from './MCMCAlgorithm';
