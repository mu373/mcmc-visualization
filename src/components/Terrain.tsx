import { useMemo } from 'react';
import * as THREE from 'three';
import type { Distribution } from '../distributions/Distribution';
import { getColor, type ColorScheme } from '../core/colormap';

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
      const color = getColor(normalizedDensity, colorScheme);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    return geometry;
  }, [distribution, resolution, centerX, centerY, colorScheme, show3D]);

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
