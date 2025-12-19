import { Line, Cone } from '@react-three/drei';
import type { Distribution } from '../distributions/Distribution';
import { calcZ, type Vector2 } from '../core/utils';

interface MomentumVectorProps {
  position: Vector2 | null;
  momentum: Vector2 | null;
  distribution: Distribution;
  maxDensity: number;
  scale?: number;
  show3D?: boolean;
}

export function MomentumVector({
  position,
  momentum,
  distribution,
  maxDensity,
  scale = 0.5,
  show3D = true
}: MomentumVectorProps) {
  if (!position || !momentum) return null;

  const normalizedDensity = distribution.density(position) / maxDensity;
  const z = calcZ(normalizedDensity, show3D);

  // Scale momentum for visualization
  const length = Math.sqrt(momentum.x * momentum.x + momentum.y * momentum.y);
  if (length < 0.01) return null;

  const scaledLength = length * scale;
  const dirX = momentum.x / length;
  const dirY = momentum.y / length;

  const originX = position.x;
  const originY = z + 0.05;
  const originZ = position.y;

  const endX = originX + dirX * scaledLength;
  const endZ = originZ + dirY * scaledLength;

  // Calculate rotation for cone (arrow head)
  // Cone points along +Y by default, we need it to point along (dirX, 0, dirY) in world space
  const angle = Math.atan2(dirX, dirY);

  return (
    <group>
      {/* Arrow shaft */}
      <Line
        points={[[originX, originY, originZ], [endX, originY, endZ]]}
        color="#00ffff"
        lineWidth={3}
      />
      {/* Arrow head - rotate to lay flat then point in momentum direction */}
      <Cone
        args={[0.08, 0.2, 8]}
        position={[endX, originY, endZ]}
        rotation={[Math.PI / 2, 0, -angle]}
      >
        <meshBasicMaterial color="#00ffff" />
      </Cone>
    </group>
  );
}
