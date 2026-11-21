import { expect, it } from 'vitest';
import { contourSegments, densityGrid } from './contours';
import { StandardGaussian } from '../distributions/StandardGaussian';

it('the 0.5 contour of a standard normal is the circle r = sqrt(2 ln 2)', () => {
  const grid = densityGrid(new StandardGaussian(), 100);
  const segments = contourSegments(grid, 0.5 * grid.max);
  expect(segments.length).toBeGreaterThan(50);
  const r = Math.sqrt(2 * Math.LN2);
  for (const [x1, y1, x2, y2] of segments) {
    expect(Math.abs(Math.hypot(x1, y1) - r)).toBeLessThan(0.01);
    expect(Math.abs(Math.hypot(x2, y2) - r)).toBeLessThan(0.01);
  }
});
