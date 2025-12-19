export type ColorScheme = 'plasma' | 'viridis' | 'terrain' | 'hot';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

// Plasma colormap - visually appealing scientific color scheme
function plasmaColormap(t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  const r = Math.min(1, 0.05 + 1.5 * t - 0.5 * t * t);
  const g = Math.min(1, Math.max(0, -0.2 + 1.8 * t * t));
  const b = Math.min(1, Math.max(0, 0.53 + 0.47 * Math.cos(Math.PI * (t - 0.5))));
  return { r, g, b };
}

// Viridis-style colormap
function viridisColormap(t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  const r = Math.max(0, Math.min(1, 0.27 + 0.73 * t * t));
  const g = Math.max(0, Math.min(1, 0.004 + 0.87 * t - 0.3 * t * t));
  const b = Math.max(0, Math.min(1, 0.33 + 0.22 * t - 0.55 * t * t));
  return { r, g, b };
}

// Terrain colormap - natural gradient
function terrainColormap(t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  if (t < 0.25) {
    const s = t / 0.25;
    return { r: 0.1, g: 0.1 + 0.4 * s, b: 0.4 + 0.3 * s };
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return { r: 0.1 + 0.2 * s, g: 0.5 + 0.3 * s, b: 0.7 - 0.4 * s };
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return { r: 0.3 + 0.5 * s, g: 0.8 + 0.1 * s, b: 0.3 - 0.2 * s };
  } else {
    const s = (t - 0.75) / 0.25;
    return { r: 0.8 + 0.2 * s, g: 0.9 - 0.3 * s, b: 0.1 };
  }
}

// Hot colormap - for probability density emphasis
function hotColormap(t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  if (t < 0.33) {
    const s = t / 0.33;
    return { r: s, g: 0, b: 0 };
  } else if (t < 0.67) {
    const s = (t - 0.33) / 0.34;
    return { r: 1, g: s, b: 0 };
  } else {
    const s = (t - 0.67) / 0.33;
    return { r: 1, g: 1, b: s };
  }
}

export const COLORMAPS: Record<ColorScheme, (t: number) => RGB> = {
  plasma: plasmaColormap,
  viridis: viridisColormap,
  terrain: terrainColormap,
  hot: hotColormap,
};

export function getColor(t: number, scheme: ColorScheme): RGB {
  return COLORMAPS[scheme](t);
}
