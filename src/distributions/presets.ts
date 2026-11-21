import { StandardGaussian } from './StandardGaussian';
import { QuarticGaussian } from './QuarticGaussian';
import { BimodalDistribution } from './BimodalDistribution';
import { MultimodalDistribution } from './MultimodalDistribution';
import { BananaDistribution } from './BananaDistribution';
import { DonutDistribution } from './DonutDistribution';
import { SquiggleDistribution } from './SquiggleDistribution';
import { RosenbrockDistribution } from './RosenbrockDistribution';
import { RastriginDistribution } from './RastriginDistribution';
import { AckleyDistribution } from './AckleyDistribution';
import type { Distribution } from './Distribution';

export const DISTRIBUTIONS = {
  gaussian: { label: 'Gaussian', create: () => new StandardGaussian() },
  quartic: { label: 'Quartic', create: () => new QuarticGaussian() },
  bimodal: { label: 'Bimodal', create: () => new BimodalDistribution(3, 0.8) },
  multimodal: { label: 'Multimodal', create: () => new MultimodalDistribution() },
  banana: { label: 'Banana', create: () => new BananaDistribution(1, 1) },
  donut: { label: 'Donut', create: () => new DonutDistribution(2, 0.4) },
  squiggle: { label: 'Squiggle', create: () => new SquiggleDistribution(5) },
  rosenbrock: { label: 'Rosenbrock', create: () => new RosenbrockDistribution(1, 100, 0.02) },
  rastrigin: { label: 'Rastrigin', create: () => new RastriginDistribution(10, 0.1) },
  ackley: { label: 'Ackley', create: () => new AckleyDistribution(20, 0.2, 2 * Math.PI, 0.3) },
} satisfies Record<string, { label: string; create: () => Distribution }>;

export type DistributionKey = keyof typeof DISTRIBUTIONS;
export const DISTRIBUTION_KEYS = Object.keys(DISTRIBUTIONS) as DistributionKey[];
