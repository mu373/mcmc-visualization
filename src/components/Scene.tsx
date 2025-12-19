import { useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, GizmoHelper, GizmoViewcube } from '@react-three/drei';
import { Terrain } from './Terrain';
import { ContourLines } from './ContourLines';
import { SigmaRing } from './SigmaRings';
import { Walker } from './Walker';
import { ProposalGhost } from './ProposalGhost';
import { ProposalLine } from './ProposalLine';
import { SampleTrail } from './SampleTrail';
import { SamplePoints } from './SamplePoints';
import { Trajectory } from './Trajectory';
import { MomentumVector } from './MomentumVector';
import { GradientArrow } from './GradientArrow';
import { DriftMarker } from './DriftMarker';
import type { Simulation } from '../core/Simulation';

interface SceneProps {
  simulation: Simulation;
}

export function Scene({ simulation }: SceneProps) {
  const { distribution, visualizer } = simulation;

  // Handle position click - set new starting position
  const handlePositionClick = useCallback((pos: { x: number; y: number }) => {
    simulation.setStartPosition(pos);
  }, [simulation]);

  // Responsive gizmo size
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Filter samples based on burn-in settings
  // During burn-in: show all samples. After burn-in: exclude burn-in samples
  const isInBurnIn = visualizer.allSamples.length < visualizer.burnIn;
  const effectiveSamples = (visualizer.excludeBurnIn && !isInBurnIn)
    ? visualizer.acceptedSamples.slice(Math.max(0, visualizer.burnIn - (visualizer.allSamples.length - visualizer.acceptedSamples.length)))
    : visualizer.acceptedSamples;

  if (!distribution) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>No distribution selected</p>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: isMobile ? [12, 12, 12] : [8, 8, 8], fov: 50 }}
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

      
      {/* Origin marker - white dot */}
      {visualizer.showOrigin && (
        <>
          <points position={[0, 0.02, 0]}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, 0]), 3]} />
            </bufferGeometry>
            <pointsMaterial size={8} sizeAttenuation={false} color="#fff" />
          </points>
          <Text
            position={[0.3, 0.05, 0.3]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.3}
            color="#888"
            anchorX="left"
            anchorY="middle"
          >
            (0,0)
          </Text>
        </>
      )}

      {/* Axis labels - Y on left, X at far end (matches heatmap orientation) */}
      <Text
        position={[distribution.bounds.xMin - 1, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        Y
      </Text>
      <Text
        position={[0, 0.05, distribution.bounds.yMax + 1]}
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
        show3D={visualizer.show3D}
        onDoubleClick={handlePositionClick}
      />

      {/* Contour lines */}
      {visualizer.showContours && (
        <ContourLines
          distribution={distribution}
          levels={visualizer.contourLevels}
          maxDensity={maxDensity}
          show3D={visualizer.show3D}
        />
      )}

      {/* Sigma ring - show proposal step size around walker */}
      {visualizer.showSigmaRings && visualizer.currentPosition && (
        <SigmaRing
          position={visualizer.currentPosition}
          sigma={visualizer.proposalRadius || 0.5}
          distribution={distribution}
          maxDensity={maxDensity}
          show3D={visualizer.show3D}
        />
      )}

      {/* Sample points - individual spheres at each sample */}
      <SamplePoints
        points={effectiveSamples}
        distribution={distribution}
        maxDensity={maxDensity}
        maxPoints={visualizer.maxTrailLength}
        sphereSize={visualizer.sphereSize}
        show3D={visualizer.show3D}
      />

      {/* Sample trail - line connecting samples */}
      {visualizer.showTrail && (
        <SampleTrail
          points={effectiveSamples}
          distribution={distribution}
          maxDensity={maxDensity}
          show3D={visualizer.show3D}
        />
      )}

      {/* HMC/NUTS trajectory path */}
      <Trajectory
        path={visualizer.trajectoryPath}
        distribution={distribution}
        maxDensity={maxDensity}
        showPoints={visualizer.showLeapfrogPoints}
        show3D={visualizer.show3D}
      />

      {/* HMC momentum vector - shown at trajectory start */}
      {visualizer.showMomentum && (
        <MomentumVector
          position={visualizer.trajectoryPath?.[0] ?? null}
          momentum={visualizer.momentum}
          distribution={distribution}
          maxDensity={maxDensity}
          scale={0.5}
          show3D={visualizer.show3D}
        />
      )}

      {/* Langevin gradient arrow - shows direction of steepest ascent */}
      {visualizer.showLangevinGradient && (
        <GradientArrow
          position={visualizer.currentPosition}
          gradient={visualizer.langevinGradient}
          distribution={distribution}
          maxDensity={maxDensity}
          scale={0.3}
          show3D={visualizer.show3D}
        />
      )}

      {/* Langevin drift marker - shows drift point and noise radius */}
      <DriftMarker
        currentPosition={visualizer.currentPosition}
        driftPoint={visualizer.langevinDriftPoint}
        noiseRadius={visualizer.langevinNoiseRadius}
        distribution={distribution}
        maxDensity={maxDensity}
        show3D={visualizer.show3D}
        showDrift={visualizer.showLangevinDrift}
        showNoise={visualizer.showLangevinNoise}
      />

      {/* Proposal line - from current to proposal */}
      <ProposalLine
        from={visualizer.currentPosition}
        to={visualizer.proposalPosition}
        distribution={distribution}
        maxDensity={maxDensity}
        show3D={visualizer.show3D}
      />

      {/* Proposal ghost - shows proposed position */}
      <ProposalGhost
        position={visualizer.proposalPosition}
        distribution={distribution}
        maxDensity={maxDensity}
        show3D={visualizer.show3D}
        accepted={visualizer.proposalAccepted}
      />

      {/* Walker - current position (always green) */}
      <Walker
        position={visualizer.currentPosition}
        distribution={distribution}
        maxDensity={maxDensity}
        color="#4ade80"
        sphereSize={visualizer.sphereSize}
        show3D={visualizer.show3D}
      />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={30}
        enablePan={true}
        autoRotate={visualizer.autoRotate}
        autoRotateSpeed={2}
      />

      {/* View cube for quick camera orientation */}
      <GizmoHelper alignment="bottom-left" margin={isMobile ? [70, 70] : [100, 100]}>
        <group scale={isMobile ? 0.85 : 1.2}>
          <GizmoViewcube
            faces={['-Y', 'Y', 'Top', 'Bottom', 'X', '-X']}
            font={isMobile ? "18px system-ui, -apple-system, sans-serif" : "20px system-ui, -apple-system, sans-serif"}
            color="#000"
            hoverColor="#4ade80"
            textColor="#fff"
            strokeColor="#fff"
            opacity={1}
          />
        </group>
      </GizmoHelper>
    </Canvas>
  );
}
