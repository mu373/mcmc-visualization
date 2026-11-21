import { RandomWalkMH } from './RandomWalkMH';
import { HamiltonianMC } from './HamiltonianMC';
import { NUTS } from './NUTS';
import { GibbsSampler } from './GibbsSampler';
import { LangevinMC } from './LangevinMC';
import type { MCMCAlgorithm } from './MCMCAlgorithm';

export const ALGORITHMS = {
  rwmh: { name: 'Random Walk MH', create: () => new RandomWalkMH() },
  hmc: { name: 'Hamiltonian MC', create: () => new HamiltonianMC() },
  nuts: { name: 'NUTS', create: () => new NUTS() },
  gibbs: { name: 'Gibbs Sampler', create: () => new GibbsSampler() },
  mala: { name: 'Langevin (MALA)', create: () => new LangevinMC() },
} as const;

export type AlgorithmType = keyof typeof ALGORITHMS;
export const ALGORITHM_KEYS = Object.keys(ALGORITHMS) as AlgorithmType[];

export function createAlgorithm(key: AlgorithmType): MCMCAlgorithm {
  return ALGORITHMS[key].create();
}

export type { MCMCAlgorithm } from './MCMCAlgorithm';
