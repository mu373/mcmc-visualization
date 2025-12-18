import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import { Terrain } from './Terrain';
import { ContourLines } from './ContourLines';
import { SigmaRing } from './SigmaRings';
import { Walker } from './Walker';
import { ProposalGhost } from './ProposalGhost';
import { ProposalLine } from './ProposalLine';
import { SampleTrail } from './SampleTrail';
import { SamplePoints } from './SamplePoints';
import type { Simulation } from '../core/Simulation';

interface SceneProps {
  simulation: Simulation;
}

export function Scene({ simulation }: SceneProps) {
  const { distribution, visualizer } = simulation;

  // Compute maxDensity for consistent height mapping across components
  const maxDensity = useMemo(() => {
    if (!distribution) return 1;
    const { xMin, xMax, yMin, yMax } = distribution.bounds;
    let max = 0;
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const x = xMin + (xMax - xMin) * (i / steps);
        const y = yMin + (yMax - yMin) * (j / steps);
        const d = distribution.density({ x, y });
        max = Math.max(max, d);
      }
    }
    return max || 1;
  }, [distribution]);

  if (!distribution) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>No distribution selected</p>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [8, 8, 8], fov: 50 }}
      style={{ width: '100%', height: '100vh', background: '#0a0a0a' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, 10, -5]} intensity={0.5} />

      {/* Grid */}
      {visualizer.showGrid && (
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#444"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#666"
          fadeDistance={30}
          fadeStrength={1}
          position={[0, -0.01, 0]}
        />
      )}

      {/* Axis labels */}
      <Text
        position={[6, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        Y
      </Text>
      <Text
        position={[0, 0.05, 6]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        X
      </Text>

      {/* Terrain */}
      <Terrain
        distribution={distribution}
        resolution={60}
        opacity={visualizer.terrainOpacity}
        colorScheme={visualizer.colorScheme}
      />

      {/* Contour lines */}
      {visualizer.showContours && (
        <ContourLines
          distribution={distribution}
          levels={visualizer.contourLevels}
          maxDensity={maxDensity}
        />
      )}

      {/* Sigma ring - show proposal step size around walker */}
      {visualizer.showSigmaRings && visualizer.currentPosition && (
        <SigmaRing
          position={visualizer.currentPosition}
          sigma={visualizer.proposalRadius || 0.5}
          distribution={distribution}
          maxDensity={maxDensity}
        />
      )}

      {/* Sample points - individual spheres at each sample */}
      <SamplePoints
        points={visualizer.acceptedSamples}
        distribution={distribution}
        maxDensity={maxDensity}
        maxPoints={visualizer.maxTrailLength}
        sphereSize={visualizer.sphereSize}
      />

      {/* Sample trail - line connecting samples */}
      {visualizer.showTrail && (
        <SampleTrail
          points={visualizer.acceptedSamples}
          distribution={distribution}
          maxDensity={maxDensity}
        />
      )}

      {/* Proposal line - from current to proposal */}
      <ProposalLine
        from={visualizer.currentPosition}
        to={visualizer.proposalPosition}
        distribution={distribution}
        maxDensity={maxDensity}
      />

      {/* Proposal ghost - shows proposed position */}
      <ProposalGhost
        position={visualizer.proposalPosition}
        distribution={distribution}
        maxDensity={maxDensity}
      />

      {/* Walker - current position */}
      <Walker
        position={visualizer.currentPosition}
        distribution={distribution}
        maxDensity={maxDensity}
        color={visualizer.flashAccept ? '#22c55e' : visualizer.flashReject ? '#ef4444' : '#4ade80'}
        sphereSize={visualizer.sphereSize}
      />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={30}
        enablePan={true}
      />
    </Canvas>
  );
}
