import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Distribution } from '../distributions/Distribution';
import { calcZ, type Vector2 } from '../core/utils';

interface DriftMarkerProps {
  currentPosition: Vector2 | null;
  driftPoint: Vector2 | null;
  noiseRadius: number;
  distribution: Distribution;
  maxDensity: number;
  show3D?: boolean;
  showDrift?: boolean;
  showNoise?: boolean;
}

export function DriftMarker({
  currentPosition,
  driftPoint,
  noiseRadius,
  distribution,
  maxDensity,
  show3D = true,
  showDrift = true,
  showNoise = true
}: DriftMarkerProps) {
  // Generate noise ring points around drift point
  const ringPoints = useMemo(() => {
    if (!driftPoint || noiseRadius <= 0) return null;

    const points: [number, number, number][] = [];
    const segments = 48;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = driftPoint.x + Math.cos(angle) * noiseRadius;
      const z = driftPoint.y + Math.sin(angle) * noiseRadius;

      // Get height at this point on the terrain - match Walker's height offset (+0.02)
      const density = distribution.density({ x, y: z });
      const normalizedDensity = density / maxDensity;
      const y = calcZ(normalizedDensity, show3D) + 0.03;

      points.push([x, y, z]);
    }

    return points;
  }, [driftPoint, noiseRadius, distribution, maxDensity, show3D]);

  if (!currentPosition || !driftPoint) return null;
  if (!showDrift && !showNoise) return null;

  // Calculate heights - match Walker's height offset (+0.02)
  const currentDensity = distribution.density(currentPosition) / maxDensity;
  const currentZ = calcZ(currentDensity, show3D) + 0.02;

  const driftDensity = distribution.density(driftPoint) / maxDensity;
  const driftZ = calcZ(driftDensity, show3D) + 0.02;

  // Diamond marker size
  const size = 0.08;

  // Diamond points (flat on XZ plane)
  const diamondPoints: [number, number, number][] = [
    [driftPoint.x, driftZ, driftPoint.y - size],
    [driftPoint.x + size, driftZ, driftPoint.y],
    [driftPoint.x, driftZ, driftPoint.y + size],
    [driftPoint.x - size, driftZ, driftPoint.y],
    [driftPoint.x, driftZ, driftPoint.y - size], // Close the diamond
  ];

  // Dashed line from current position to drift point
  const driftLinePoints: [number, number, number][] = [
    [currentPosition.x, currentZ, currentPosition.y],
    [driftPoint.x, driftZ, driftPoint.y],
  ];

  return (
    <group>
      {/* Dashed line showing the deterministic drift */}
      {showDrift && (
        <Line
          points={driftLinePoints}
          color="#ff00ff"
          lineWidth={2}
          dashed
          dashSize={0.1}
          gapSize={0.05}
          transparent
          opacity={0.8}
        />
      )}

      {/* Diamond marker at drift point */}
      {showDrift && (
        <Line
          points={diamondPoints}
          color="#ffffff"
          lineWidth={2}
        />
      )}

      {/* Noise radius ring around drift point - cyan like sigma rings */}
      {showNoise && ringPoints && (
        <Line
          points={ringPoints}
          color="#06b6d4"
          lineWidth={2}
          transparent
          opacity={0.6}
        />
      )}
    </group>
  );
}
