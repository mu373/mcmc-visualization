import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Distribution } from '../distributions/Distribution';
import { calcZ, type Vector2 } from '../core/utils';

interface ProposalLineProps {
  from: Vector2 | null;
  to: Vector2 | null;
  distribution: Distribution;
  maxDensity: number;
  color?: string;
  show3D?: boolean;
}

export function ProposalLine({ from, to, distribution, maxDensity, color = '#fbbf24', show3D = true }: ProposalLineProps) {
  const points = useMemo(() => {
    if (!from || !to) return null;

    const fromNorm = distribution.density(from) / maxDensity;
    const toNorm = distribution.density(to) / maxDensity;
    const fromZ = calcZ(fromNorm, show3D) + 0.02;
    const toZ = calcZ(toNorm, show3D) + 0.02;

    return [
      [from.x, fromZ, from.y] as [number, number, number],
      [to.x, toZ, to.y] as [number, number, number],
    ];
  }, [from, to, distribution, maxDensity, show3D]);

  if (!points) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      dashed={true}
      dashSize={0.1}
      gapSize={0.05}
    />
  );
}
