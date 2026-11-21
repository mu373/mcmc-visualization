import type { Bounds } from '../distributions/Distribution';
import type { Vector2 } from './utils';

function binOf(v: number, min: number, max: number, bins: number): number {
  const b = Math.floor(((v - min) / (max - min)) * bins);
  return b === bins ? bins - 1 : b >= 0 && b < bins ? b : -1;
}

// Marginal and joint bin counts over chain[from..], updated by appending new rows.
// Any change to the run, bins, cut-off, or range rebuilds from the full chain.
export class Histograms {
  bins = 0;
  x = new Int32Array(0);
  y = new Int32Array(0);
  xy = new Int32Array(0); // index bx * bins + by
  count = 0;
  revision = 0;
  rebuilds = 0;
  private consumed = 0;
  private key = '';

  sync(chain: Vector2[], bounds: Bounds, bins: number, from: number, runId: number): void {
    const key = `${runId}|${bins}|${from}|${bounds.xMin}|${bounds.xMax}|${bounds.yMin}|${bounds.yMax}`;
    if (key !== this.key) {
      this.key = key;
      this.bins = bins;
      this.x = new Int32Array(bins);
      this.y = new Int32Array(bins);
      this.xy = new Int32Array(bins * bins);
      this.count = 0;
      this.consumed = from;
      this.rebuilds++;
      this.revision++;
    }
    if (chain.length <= this.consumed) return;
    for (let i = this.consumed; i < chain.length; i++) {
      const { x, y } = chain[i];
      const bx = binOf(x, bounds.xMin, bounds.xMax, bins);
      const by = binOf(y, bounds.yMin, bounds.yMax, bins);
      if (bx >= 0) this.x[bx]++;
      if (by >= 0) this.y[by]++;
      if (bx >= 0 && by >= 0) this.xy[bx * bins + by]++;
      this.count++;
    }
    this.consumed = chain.length;
    this.revision++;
  }
}
