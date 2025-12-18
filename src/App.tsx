import { useEffect, useState } from 'react';
import { Scene } from './components/Scene';
import { ControlPanel } from './components/ControlPanel';
import { InfoPanel } from './components/InfoPanel';
import { MarginalHistograms } from './components/MarginalHistograms';
import { Simulation } from './core/Simulation';
import { StandardGaussian } from './distributions/StandardGaussian';
import { RandomWalkMH } from './algorithms/RandomWalkMH';

function App() {
  const [simulation] = useState(() => {
    const sim = new Simulation();

    // Initialize with a standard Gaussian distribution
    const distribution = new StandardGaussian();
    sim.setDistribution(distribution);

    // Initialize with Random Walk Metropolis-Hastings algorithm
    const algorithm = new RandomWalkMH();
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
      <MarginalHistograms
        samples={simulation.visualizer.allSamples}
        sampleCount={simulation.visualizer.allSamples.length}
        bins={simulation.visualizer.histogramBins}
      />
    </>
  );
}

export default App;
