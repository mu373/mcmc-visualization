import type { Simulation } from './Simulation';

type RunRecord = Pick<Simulation, 'chain' | 'rowParams' | 'algorithm' | 'distributionKey' | 'seed'>;

// One row per iteration. Sampler params are per row, so a mid-run change shows up
// from the first iteration that used it; method, target, and seed are constant columns.
export function chainToCsv({ chain, rowParams, algorithm, distributionKey, seed }: RunRecord): string {
  const keys = Object.keys(rowParams[0]);
  const constant = `${algorithm.key},${distributionKey},${seed}`;
  const rows = chain.map((p, i) => [i, p.x, p.y, ...keys.map(k => rowParams[i][k]), constant].join(','));
  return [['iteration', 'x', 'y', ...keys, 'method', 'target', 'seed'].join(','), ...rows, ''].join('\n');
}

export function csvFilename({ chain, algorithm, distributionKey, seed }: RunRecord): string {
  return `${distributionKey}_${algorithm.key}_seed${seed}_n${chain.length}.csv`;
}
