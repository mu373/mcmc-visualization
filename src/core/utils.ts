export interface Vector2 {
  x: number;
  y: number;
}

export function vectorDot(v1: Vector2, v2: Vector2): number {
  return v1.x * v2.x + v1.y * v2.y;
}

export function vectorSubtract(v1: Vector2, v2: Vector2): Vector2 {
  return { x: v1.x - v2.x, y: v1.y - v2.y };
}

export function isFiniteVector(v: Vector2): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y);
}

// Calculate z-height for 3D visualization (matches terrain height)
export function calcZ(normalizedDensity: number, show3D: boolean): number {
  if (!show3D) return 0;
  return Math.pow(normalizedDensity, 0.8) * 3;
}

// Display-only guard. A diverging leapfrog path can reach finite but astronomically large
// coordinates, which overflow three.js bounding spheres. Draw within one box-width of the box.
export function inView(p: Vector2, b: { xMin: number; xMax: number; yMin: number; yMax: number }): boolean {
  const w = b.xMax - b.xMin;
  const h = b.yMax - b.yMin;
  return p.x >= b.xMin - w && p.x <= b.xMax + w && p.y >= b.yMin - h && p.y <= b.yMax + h;
}
