import type { VisualizationEvent } from '../core/Visualizer';
import type { Distribution } from '../distributions/Distribution';
import type { Rng } from '../core/rng';
import type { Vector2 } from '../core/utils';
import type { AlgorithmType } from './index';

export type StepFlag = 'divergent' | 'wall';

export interface StepResult {
  next: Vector2;
  accepted: boolean;
  flag?: StepFlag;
  events: VisualizationEvent[];
}

export type Params = Readonly<Record<string, number>>;

export interface MCMCAlgorithm {
  readonly key: AlgorithmType;
  readonly name: string;
  readonly description: string;
  // Label for the accepted/iterations ratio, or null when every step moves.
  readonly rateLabel: string | null;
  params(): Params;
  step(current: Vector2, target: Distribution, rng: Rng): StepResult;
}
