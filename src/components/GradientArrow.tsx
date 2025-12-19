import { Line, Cone } from '@react-three/drei';
import type { Distribution } from '../distributions/Distribution';
import { calcZ, type Vector2 } from '../core/utils';

interface GradientArrowProps {
  position: Vector2 | null;
  gradient: Vector2 | null;
  distribution: Distribution;
  maxDensity: number;
  scale?: number;
  show3D?: boolean;
}

export function GradientArrow({
  position,
  gradient,
  distribution,
  maxDensity,
  scale = 0.3,
  show3D = true
}: GradientArrowProps) {
  if (!position || !gradient) return null;

  const normalizedDensity = distribution.density(position) / maxDensity;
  // Match Walker's height offset (+0.02) so arrow originates from sphere center
  const z = calcZ(normalizedDensity, show3D) + 0.02;

  // Calculate gradient magnitude
  const length = Math.sqrt(gradient.x * gradient.x + gradient.y * gradient.y);
  if (length < 0.01) return null;

  // Normalize and scale for visualization (cap the length for very steep gradients)
  const cappedLength = Math.min(length, 3);
  const scaledLength = cappedLength * scale;
  const dirX = gradient.x / length;
  const dirY = gradient.y / length;

  const originX = position.x;
  const originY = z;
  const originZ = position.y;

  const endX = originX + dirX * scaledLength;
  const endZ = originZ + dirY * scaledLength;

  // Calculate rotation for cone (arrow head)
  const angle = Math.atan2(dirX, dirY);

  return (
    <group>
      {/* Arrow shaft - magenta/pink color for gradient */}
      <Line
        points={[[originX, originY, originZ], [endX, originY, endZ]]}
        color="#ff00ff"
        lineWidth={3}
      />
      {/* Arrow head */}
      <Cone
        args={[0.06, 0.15, 8]}
        position={[endX, originY, endZ]}
        rotation={[Math.PI / 2, 0, -angle]}
      >
        <meshBasicMaterial color="#ff00ff" />
      </Cone>
    </group>
  );
}
