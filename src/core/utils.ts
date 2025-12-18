// Utility functions for MCMC algorithms

export interface Vector2 {
  x: number;
  y: number;
}

// Box-Muller transform for generating normal random variables
export function randn(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Generate 2D normal random vector
export function randn2d(): Vector2 {
  return {
    x: randn(),
    y: randn()
  };
}

// Multivariate normal with mean and covariance
export function mvnRandom(mean: Vector2, sigma: number): Vector2 {
  return {
    x: mean.x + randn() * sigma,
    y: mean.y + randn() * sigma
  };
}

// 2D Gaussian PDF (unnormalized is fine for MCMC)
export function gaussian2d(
  x: number,
  y: number,
  muX: number,
  muY: number,
  sigma: number
): number {
  const dx = x - muX;
  const dy = y - muY;
  return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
}

// Vector operations
export function vectorLength(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vectorDot(v1: Vector2, v2: Vector2): number {
  return v1.x * v2.x + v1.y * v2.y;
}

export function vectorAdd(v1: Vector2, v2: Vector2): Vector2 {
  return { x: v1.x + v2.x, y: v1.y + v2.y };
}

export function vectorScale(v: Vector2, scale: number): Vector2 {
  return { x: v.x * scale, y: v.y * scale };
}

export function vectorSubtract(v1: Vector2, v2: Vector2): Vector2 {
  return { x: v1.x - v2.x, y: v1.y - v2.y };
}

export function vectorNegate(v: Vector2): Vector2 {
  return { x: -v.x, y: -v.y };
}

// Calculate z-height for 3D visualization (matches terrain height)
export function calcZ(normalizedDensity: number, show3D: boolean): number {
  if (!show3D) return 0;
  return Math.pow(normalizedDensity, 0.8) * 3;
}

// Array utility
declare global {
  interface Array<T> {
    last(): T;
  }
}

Array.prototype.last = function <T>(this: T[]): T {
  return this[this.length - 1];
};
