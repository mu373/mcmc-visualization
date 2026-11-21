import { describe, expect, it } from 'vitest';
import { Histograms } from './histogram';
import { mulberry32, randn } from './rng';

const bounds = { xMin: -4, xMax: 4, yMin: -4, yMax: 4 };
const rng = mulberry32(2);
const chain = Array.from({ length: 5000 }, () => ({ x: randn(rng), y: randn(rng) }));

describe('Histograms', () => {
  it('appending rows one at a time equals a full rebuild', () => {
    const inc = new Histograms();
    for (let n = 1; n <= chain.length; n += 37) inc.sync(chain.slice(0, n), bounds, 25, 200, 1);
    inc.sync(chain, bounds, 25, 200, 1);
    const full = new Histograms();
    full.sync(chain, bounds, 25, 200, 1);
    expect(inc.rebuilds).toBe(1);
    expect(inc.count).toBe(4800);
    expect(inc.x).toEqual(full.x);
    expect(inc.y).toEqual(full.y);
    expect(inc.xy).toEqual(full.xy);
  });

  it('does no work when the chain has not changed', () => {
    const h = new Histograms();
    h.sync(chain, bounds, 25, 0, 1);
    const revision = h.revision;
    h.sync(chain, bounds, 25, 0, 1);
    expect(h.revision).toBe(revision);
  });

  it('waits until the chain is longer than the burn-in', () => {
    const h = new Histograms();
    h.sync(chain.slice(0, 200), bounds, 25, 200, 1);
    expect(h.count).toBe(0);
    h.sync(chain.slice(0, 201), bounds, 25, 200, 1);
    expect(h.count).toBe(1);
  });

  it('rebuilds on a new run, bin count, or burn-in', () => {
    const h = new Histograms();
    h.sync(chain, bounds, 25, 0, 1);
    h.sync(chain, bounds, 30, 0, 1);
    h.sync(chain, bounds, 30, 100, 1);
    h.sync(chain, bounds, 30, 100, 2);
    expect(h.rebuilds).toBe(4);
    expect(h.x.reduce((a, b) => a + b, 0)).toBe(4900);
  });
});
