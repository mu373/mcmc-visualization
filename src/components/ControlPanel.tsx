import { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import type { Simulation } from '../core/Simulation';
import { ALGORITHMS, createAlgorithm, type AlgorithmType } from '../algorithms';
import type { RandomWalkMH } from '../algorithms/RandomWalkMH';
import type { HamiltonianMC } from '../algorithms/HamiltonianMC';
import type { NUTS } from '../algorithms/NUTS';
import type { GibbsSampler } from '../algorithms/GibbsSampler';
import { StandardGaussian } from '../distributions/StandardGaussian';
import { DonutDistribution } from '../distributions/DonutDistribution';
import { BimodalDistribution } from '../distributions/BimodalDistribution';
import { BananaDistribution } from '../distributions/BananaDistribution';
import { RastriginDistribution } from '../distributions/RastriginDistribution';
import { RosenbrockDistribution } from '../distributions/RosenbrockDistribution';
import { AckleyDistribution } from '../distributions/AckleyDistribution';
import { SquiggleDistribution } from '../distributions/SquiggleDistribution';
import { MultimodalDistribution } from '../distributions/MultimodalDistribution';

// Distribution presets
const DISTRIBUTIONS = {
  gaussian: () => new StandardGaussian(),
  donut: () => new DonutDistribution(2, 0.4),
  bimodal: () => new BimodalDistribution(3, 0.8),
  banana: () => new BananaDistribution(1, 1),
  rastrigin: () => new RastriginDistribution(10, 0.1),
  rosenbrock: () => new RosenbrockDistribution(1, 100, 0.02),
  ackley: () => new AckleyDistribution(20, 0.2, 2 * Math.PI, 0.3),
  squiggle: () => new SquiggleDistribution(5),
  multimodal: () => new MultimodalDistribution(),
};

interface ControlPanelProps {
  simulation: Simulation;
  onDistributionChange?: () => void;
}

export function ControlPanel({ simulation, onDistributionChange }: ControlPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paneRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create pane - using any type since Tweakpane types are incomplete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pane: any = new Pane({
      title: 'MCMC Controls',
      container: containerRef.current,
    });

    paneRef.current = pane;

    // Distribution selector
    const distFolder = pane.addFolder({ title: 'Distribution' });
    const distParams = { selected: 'gaussian' };

    distFolder.addBinding(distParams, 'selected', {
      label: 'Target',
      options: {
        'Standard Gaussian': 'gaussian',
        'Donut': 'donut',
        'Bimodal': 'bimodal',
        'Banana': 'banana',
        'Rastrigin': 'rastrigin',
        'Rosenbrock': 'rosenbrock',
        'Ackley': 'ackley',
        'Squiggle': 'squiggle',
        'Multimodal': 'multimodal',
      },
    }).on('change', (e: { value: keyof typeof DISTRIBUTIONS }) => {
      const newDist = DISTRIBUTIONS[e.value]();
      simulation.setDistribution(newDist);
      simulation.reset();
      onDistributionChange?.();
    });

    // Simulation controls
    const simFolder = pane.addFolder({ title: 'Simulation' });

    simFolder.addButton({ title: 'Play/Pause' }).on('click', () => {
      simulation.toggle();
    });

    simFolder.addButton({ title: 'Step' }).on('click', () => {
      simulation.step();
    });

    simFolder.addButton({ title: 'Reset' }).on('click', () => {
      simulation.reset();
    });

    simFolder.addBinding(simulation, 'delay', {
      min: 0,
      max: 500,
      step: 10,
      label: 'Delay (ms)',
    });

    simFolder.addBinding(simulation, 'totalSamples', {
      readonly: true,
      label: 'Total Samples',
    });

    // Algorithm selector and parameters
    const algFolder = pane.addFolder({ title: 'Algorithm' });

    // Build algorithm options
    const algorithmOptions: Record<string, AlgorithmType> = {};
    ALGORITHMS.forEach(a => {
      algorithmOptions[a.name] = a.key;
    });

    const algParams = { selected: 'rwmh' as AlgorithmType };

    // Parameter folder (will be rebuilt when algorithm changes)
    let paramFolder = pane.addFolder({ title: 'Parameters' });

    // Stats for acceptance rate
    const stats = { acceptanceRate: 0 };

    // Function to rebuild parameter controls for current algorithm
    const rebuildParams = () => {
      // Remove old parameter folder and create new one
      paramFolder.dispose();
      paramFolder = pane.addFolder({ title: 'Parameters', index: 3 });

      const algorithm = simulation.algorithm;
      if (!algorithm) return;

      if (algorithm.name === 'Random Walk Metropolis-Hastings') {
        const mh = algorithm as RandomWalkMH;
        paramFolder.addBinding(mh, 'sigma', {
          min: 0.05,
          max: 3,
          step: 0.05,
          label: 'Step Size (σ)',
        }).on('change', (e: { value: number }) => {
          simulation.visualizer.proposalRadius = e.value;
        });
        paramFolder.addBinding(simulation.visualizer, 'showSigmaRings', {
          label: 'Show Step σ',
        });
      } else {
        // Hide sigma ring for non-RWMH algorithms
        simulation.visualizer.showSigmaRings = false;
      }

      if (algorithm.name === 'Hamiltonian Monte Carlo') {
        const hmc = algorithm as HamiltonianMC;
        paramFolder.addBinding(hmc, 'epsilon', {
          min: 0.01,
          max: 0.5,
          step: 0.01,
          label: 'Leapfrog Δt',
        });
        paramFolder.addBinding(hmc, 'L', {
          min: 5,
          max: 100,
          step: 5,
          label: 'Leapfrog steps',
        });
        paramFolder.addBinding(simulation.visualizer, 'showLeapfrogPoints', {
          label: 'Show leapfrog points',
        });
      } else if (algorithm.name === 'No-U-Turn Sampler') {
        const nuts = algorithm as NUTS;
        paramFolder.addBinding(nuts, 'epsilon', {
          min: 0.01,
          max: 0.5,
          step: 0.01,
          label: 'Step Size (ε)',
        });
        paramFolder.addBinding(nuts, 'maxTreeDepth', {
          min: 3,
          max: 15,
          step: 1,
          label: 'Max Tree Depth',
        });
      } else if (algorithm.name === 'Gibbs Sampler') {
        const gibbs = algorithm as GibbsSampler;
        paramFolder.addBinding(gibbs, 'gridResolution', {
          min: 50,
          max: 500,
          step: 50,
          label: 'Grid Resolution',
        });
      }

      // Add acceptance rate (not applicable for Gibbs)
      if (algorithm.name !== 'Gibbs Sampler') {
        paramFolder.addBinding(stats, 'acceptanceRate', {
          readonly: true,
          label: 'Accept Rate',
          format: (v: number) => `${(v * 100).toFixed(1)}%`,
        });
      }
    };

    // Algorithm selector
    algFolder.addBinding(algParams, 'selected', {
      label: 'Method',
      options: algorithmOptions,
    }).on('change', (e: { value: AlgorithmType }) => {
      const newAlgorithm = createAlgorithm(e.value);
      simulation.setAlgorithm(newAlgorithm);
      simulation.reset();
      rebuildParams();
    });

    // Initial parameter setup
    rebuildParams();

    // Update acceptance rate periodically
    const updateInterval = setInterval(() => {
      const alg = simulation.algorithm;
      if (alg?.getAcceptanceRate) {
        stats.acceptanceRate = alg.getAcceptanceRate();
      }
    }, 100);

    // Store interval for cleanup
    (pane as unknown as { _acceptRateInterval?: number })._acceptRateInterval = updateInterval;

    // Visual settings
    const vizFolder = pane.addFolder({ title: 'Visuals' });

    vizFolder.addBinding(simulation.visualizer, 'show3D', {
      label: 'Show 3D',
    });

    vizFolder.addBinding(simulation.visualizer, 'colorScheme', {
      label: 'Color Scheme',
      options: {
        'Terrain': 'terrain',
        'Plasma': 'plasma',
        'Viridis': 'viridis',
        'Hot': 'hot',
      },
    });

    vizFolder.addBinding(simulation.visualizer, 'terrainOpacity', {
      min: 0,
      max: 1,
      step: 0.05,
      label: 'Terrain Opacity',
    });

    vizFolder.addBinding(simulation.visualizer, 'showContours', {
      label: 'Show Contours',
    });

    vizFolder.addBinding(simulation.visualizer, 'contourLevels', {
      min: 3,
      max: 20,
      step: 1,
      label: 'Contour Levels',
    });

    vizFolder.addBinding(simulation.visualizer, 'showGrid', {
      label: 'Show Grid',
    });

    vizFolder.addBinding(simulation.visualizer, 'sphereSize', {
      min: 0.2,
      max: 3,
      step: 0.1,
      label: 'Sphere Size',
    });

    vizFolder.addBinding(simulation.visualizer, 'showTrail', {
      label: 'Show Trail',
    });

    vizFolder.addBinding(simulation.visualizer, 'maxTrailLength', {
      min: 10,
      max: 2000,
      step: 10,
      label: 'Visible Samples',
    });

    vizFolder.addBinding(simulation.visualizer, 'histogramBins', {
      min: 10,
      max: 80,
      step: 5,
      label: 'Histogram Bins',
    });

    return () => {
      const interval = (pane as unknown as { _acceptRateInterval?: number })._acceptRateInterval;
      if (interval) clearInterval(interval);
      pane.dispose();
    };
  }, [simulation]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
      }}
    />
  );
}
