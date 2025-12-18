import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Distribution } from '../distributions/Distribution';
import type { Vector2 } from '../core/utils';

interface ProposalLineProps {
  from: Vector2 | null;
  to: Vector2 | null;
  distribution: Distribution;
  maxDensity: number;
  color?: string;
}

export function ProposalLine({ from, to, distribution, maxDensity, color = '#fbbf24' }: ProposalLineProps) {
  const points = useMemo(() => {
    if (!from || !to) return null;

    const fromNorm = distribution.density(from) / maxDensity;
    const toNorm = distribution.density(to) / maxDensity;
    const fromZ = Math.pow(fromNorm, 0.8) * 3 + 0.2;
    const toZ = Math.pow(toNorm, 0.8) * 3 + 0.2;

    return [
      [from.x, fromZ, from.y] as [number, number, number],
      [to.x, toZ, to.y] as [number, number, number],
    ];
  }, [from, to, distribution, maxDensity]);

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
