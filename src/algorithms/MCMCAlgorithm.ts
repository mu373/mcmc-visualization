import type { Visualizer } from '../core/Visualizer';
import type { Distribution } from '../distributions/Distribution';

export interface MCMCAlgorithm {
  name: string;
  description: string;

  // Set the target distribution
  setDistribution(distribution: Distribution): void;

  // Initialize algorithm parameters
  init(): void;

  // Reset chain to initial state
  reset(initialPosition?: { x: number; y: number }): void;

  // Run one MCMC iteration
  step(visualizer: Visualizer): void;

  // Get acceptance rate (if applicable)
  getAcceptanceRate?(): number;

  // Get current chain
  getChain(): Array<{ x: number; y: number }>;
}
