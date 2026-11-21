import type { Distribution } from '../distributions/Distribution';
import type { Vector2 } from './utils';

export interface PhasePoint {
  q: Vector2;
  p: Vector2;
}

// Signed step size: NUTS integrates backward with a negative epsilon.
export function leapfrog(target: Distribution, { q, p }: PhasePoint, epsilon: number): PhasePoint {
  const g0 = target.gradient(q);
  const px = p.x + 0.5 * epsilon * g0.x;
  const py = p.y + 0.5 * epsilon * g0.y;
  const qNew = { x: q.x + epsilon * px, y: q.y + epsilon * py };
  const g1 = target.gradient(qNew);
  return { q: qNew, p: { x: px + 0.5 * epsilon * g1.x, y: py + 0.5 * epsilon * g1.y } };
}

export function hamiltonian(target: Distribution, { q, p }: PhasePoint): number {
  return -target.logDensity(q) + 0.5 * (p.x * p.x + p.y * p.y);
}
