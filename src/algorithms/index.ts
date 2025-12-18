import { RandomWalkMH } from './RandomWalkMH';
import { HamiltonianMC } from './HamiltonianMC';
import { NUTS } from './NUTS';
import type { MCMCAlgorithm } from './MCMCAlgorithm';

export type AlgorithmType = 'rwmh' | 'hmc' | 'nuts';

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
];

export function createAlgorithm(key: AlgorithmType): MCMCAlgorithm {
  const config = ALGORITHMS.find(a => a.key === key);
  if (!config) throw new Error(`Unknown algorithm: ${key}`);
  return config.create();
}

export { RandomWalkMH, HamiltonianMC, NUTS };
export type { MCMCAlgorithm } from './MCMCAlgorithm';
