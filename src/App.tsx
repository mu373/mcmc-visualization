import { useEffect, useState } from 'react';
import { Scene } from './components/Scene';
import { ControlPanel } from './components/ControlPanel';
import { InfoPanel } from './components/InfoPanel';
import { MarginalHistograms } from './components/MarginalHistograms';
import { HeatmapPanel } from './components/HeatmapPanel';
import { Simulation } from './core/Simulation';
import { StandardGaussian } from './distributions/StandardGaussian';
import { createAlgorithm } from './algorithms';

function App() {
  const [simulation] = useState(() => {
    const sim = new Simulation();

    // Initialize with a standard Gaussian distribution
    const distribution = new StandardGaussian();
    sim.setDistribution(distribution);

    // Initialize with Random Walk Metropolis-Hastings algorithm
    const algorithm = createAlgorithm('rwmh');
    sim.setAlgorithm(algorithm);

    return sim;
  });

  // Control panel collapsed state
  const [controlPanelCollapsed, setControlPanelCollapsed] = useState(false);

  // Force re-render when visualization state changes
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, []);

  // Trajectory animation driver - runs independently at configurable speed
  useEffect(() => {
    let timeoutId: number | undefined;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      if (simulation.visualizer.isTrajectoryAnimating()) {
        simulation.visualizer.advanceTrajectoryAnimation();
      }

      // Always schedule next tick to check for new animations
      timeoutId = window.setTimeout(tick, simulation.visualizer.trajectoryAnimationSpeed);
    };

    // Start the animation tick loop
    tick();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [simulation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        simulation.toggle();
      } else if (e.code === 'KeyN') {
        simulation.step();
      } else if (e.code === 'KeyR') {
        simulation.visualizer.autoRotate = !simulation.visualizer.autoRotate;
      } else if (e.code === 'KeyC' && e.shiftKey) {
        setControlPanelCollapsed(prev => !prev);
      } else if (e.code === 'KeyC' && !e.shiftKey) {
        simulation.visualizer.showContours = !simulation.visualizer.showContours;
      } else if (e.code === 'Digit3' && e.shiftKey) {
        // # key (Shift+3)
        simulation.visualizer.show3D = !simulation.visualizer.show3D;
      } else if (e.code === 'KeyG') {
        simulation.visualizer.showGrid = !simulation.visualizer.showGrid;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [simulation]);

  // Get acceptance rate from algorithm
  const acceptanceRate = simulation.algorithm?.getAcceptanceRate?.() || 0;

  return (
    <>
      <Scene simulation={simulation} />
      <ControlPanel simulation={simulation} collapsed={controlPanelCollapsed} />
      <InfoPanel
        algorithm={simulation.algorithm}
        samples={simulation.visualizer.allSamples.length}
        acceptanceRate={acceptanceRate}
      />
      {(simulation.visualizer.showHeatmap || simulation.visualizer.showHistogram) && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            zIndex: 100,
          }}
        >
          {simulation.visualizer.showHeatmap && (
            <HeatmapPanel
              samples={simulation.visualizer.allSamples}
              sampleCount={simulation.visualizer.allSamples.length}
              distribution={simulation.distribution!}
              bins={simulation.visualizer.histogramBins}
              colorScheme={simulation.visualizer.colorScheme}
            />
          )}
          {simulation.visualizer.showHistogram && (
            <MarginalHistograms
              samples={simulation.visualizer.allSamples}
              sampleCount={simulation.visualizer.allSamples.length}
              distribution={simulation.distribution!}
              bins={simulation.visualizer.histogramBins}
            />
          )}
        </div>
      )}
      <footer
        style={{
          position: 'absolute',
          bottom: 12,
          right: 20,
          fontSize: 11,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          zIndex: 100,
        }}
      >
        <a
          href="https://github.com/mu373/mcmc-visualization"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#666', textDecoration: 'none' }}
        >
          GitHub
        </a>
      </footer>
    </>
  );
}

export default App;
