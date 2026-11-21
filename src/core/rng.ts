// Values lie strictly inside (0, 1) so log(u) and Box-Muller stay finite.
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296;
  };
}

export function randn(rng: Rng): number {
  return Math.sqrt(-2 * Math.log(rng())) * Math.cos(2 * Math.PI * rng());
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296);
}
