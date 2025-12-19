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

  // Force re-render when visualization state changes
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        simulation.toggle();
      } else if (e.code === 'KeyN') {
        simulation.step();
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
      <ControlPanel simulation={simulation} />
      <InfoPanel
        algorithm={simulation.algorithm}
        samples={simulation.visualizer.allSamples.length}
        acceptanceRate={acceptanceRate}
      />
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
        <HeatmapPanel
          samples={simulation.visualizer.allSamples}
          sampleCount={simulation.visualizer.allSamples.length}
          distribution={simulation.distribution!}
          bins={simulation.visualizer.histogramBins}
          colorScheme={simulation.visualizer.colorScheme}
        />
        <MarginalHistograms
          samples={simulation.visualizer.allSamples}
          sampleCount={simulation.visualizer.allSamples.length}
          distribution={simulation.distribution!}
          bins={simulation.visualizer.histogramBins}
        />
      </div>
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
