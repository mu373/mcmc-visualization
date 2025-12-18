import { useMemo } from 'react';
import * as THREE from 'three';
import type { Distribution } from '../distributions/Distribution';
import type { ColorScheme } from '../core/Visualizer';

// Plasma colormap - visually appealing scientific color scheme
function plasmaColormap(t: number): THREE.Color {
  // Clamp t to [0, 1]
  t = Math.max(0, Math.min(1, t));

  // Plasma colormap approximation (dark purple -> magenta -> orange -> yellow)
  const r = Math.min(1, 0.05 + 1.5 * t - 0.5 * t * t);
  const g = Math.min(1, Math.max(0, -0.2 + 1.8 * t * t));
  const b = Math.min(1, Math.max(0, 0.53 + 0.47 * Math.cos(Math.PI * (t - 0.5))));

  return new THREE.Color(r, g, b);
}

// Alternative: Viridis-style colormap
function viridisColormap(t: number): THREE.Color {
  t = Math.max(0, Math.min(1, t));

  // Viridis approximation (dark purple -> teal -> yellow-green)
  const r = Math.max(0, Math.min(1, 0.27 + 0.73 * t * t));
  const g = Math.max(0, Math.min(1, 0.004 + 0.87 * t - 0.3 * t * t));
  const b = Math.max(0, Math.min(1, 0.33 + 0.22 * t - 0.55 * t * t));

  return new THREE.Color(r, g, b);
}

// Terrain colormap - natural gradient
function terrainColormap(t: number): THREE.Color {
  t = Math.max(0, Math.min(1, t));

  // Deep blue -> cyan -> green -> yellow -> orange -> red
  if (t < 0.25) {
    const s = t / 0.25;
    return new THREE.Color(0.1, 0.1 + 0.4 * s, 0.4 + 0.3 * s);
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return new THREE.Color(0.1 + 0.2 * s, 0.5 + 0.3 * s, 0.7 - 0.4 * s);
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return new THREE.Color(0.3 + 0.5 * s, 0.8 + 0.1 * s, 0.3 - 0.2 * s);
  } else {
    const s = (t - 0.75) / 0.25;
    return new THREE.Color(0.8 + 0.2 * s, 0.9 - 0.3 * s, 0.1);
  }
}

// Hot colormap - for probability density emphasis
function hotColormap(t: number): THREE.Color {
  t = Math.max(0, Math.min(1, t));

  // Black -> red -> orange -> yellow -> white
  if (t < 0.33) {
    const s = t / 0.33;
    return new THREE.Color(s, 0, 0);
  } else if (t < 0.67) {
    const s = (t - 0.33) / 0.34;
    return new THREE.Color(1, s, 0);
  } else {
    const s = (t - 0.67) / 0.33;
    return new THREE.Color(1, 1, s);
  }
}

const COLORMAPS: Record<ColorScheme, (t: number) => THREE.Color> = {
  plasma: plasmaColormap,
  viridis: viridisColormap,
  terrain: terrainColormap,
  hot: hotColormap,
};

interface TerrainProps {
  distribution: Distribution;
  resolution?: number;
  opacity?: number;
  colorScheme?: ColorScheme;
  show3D?: boolean;
}

export function Terrain({
  distribution,
  resolution = 60,
  opacity = 0.85,
  colorScheme = 'plasma',
  show3D = true
}: TerrainProps) {
  // Calculate center offset for positioning
  const centerX = (distribution.bounds.xMin + distribution.bounds.xMax) / 2;
  const centerY = (distribution.bounds.yMin + distribution.bounds.yMax) / 2;

  const colormap = COLORMAPS[colorScheme];

  const geometry = useMemo(() => {
    const { xMin, xMax, yMin, yMax } = distribution.bounds;
    const width = xMax - xMin;
    const height = yMax - yMin;

    const geometry = new THREE.PlaneGeometry(
      width,
      height,
      resolution,
      resolution
    );

    // Deform the plane based on density function
    const positions = geometry.attributes.position;
    const colors = [];

    let maxDensity = 0;

    // First pass: find max density for normalization
    for (let i = 0; i < positions.count; i++) {
      const localX = positions.getX(i);
      const localY = positions.getY(i);
      // Offset to get actual distribution coordinates
      const distX = localX + centerX;
      const distY = localY + centerY;
      const density = distribution.density({ x: distX, y: distY });
      maxDensity = Math.max(maxDensity, density);
    }

    // Second pass: set heights and colors
    for (let i = 0; i < positions.count; i++) {
      const localX = positions.getX(i);
      const localY = positions.getY(i);
      const distX = localX + centerX;
      const distY = localY + centerY;
      const density = distribution.density({ x: distX, y: distY });

      // Negate Y so after rotation it maps correctly to world Z
      positions.setY(i, -localY);

      // Set z height based on density with slight power curve for visual emphasis
      const normalizedDensity = density / maxDensity;
      const z = show3D ? Math.pow(normalizedDensity, 0.8) * 3 : 0;
      positions.setZ(i, z);

      // Apply colormap
      const color = colormap(normalizedDensity);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    return geometry;
  }, [distribution, resolution, centerX, centerY, colormap, show3D]);

  return (
    <mesh geometry={geometry} rotation-x={-Math.PI / 2} position={[centerX, 0, centerY]}>
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  );
}
