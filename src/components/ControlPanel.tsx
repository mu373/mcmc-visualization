import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';
import type { Simulation } from '../core/Simulation';
import { ALGORITHMS, createAlgorithm, type AlgorithmType } from '../algorithms';
import type { RandomWalkMH } from '../algorithms/RandomWalkMH';
import type { HamiltonianMC } from '../algorithms/HamiltonianMC';
import type { NUTS } from '../algorithms/NUTS';
import type { GibbsSampler } from '../algorithms/GibbsSampler';
import type { LangevinMC } from '../algorithms/LangevinMC';
import { StandardGaussian } from '../distributions/StandardGaussian';
import { DonutDistribution } from '../distributions/DonutDistribution';
import { BimodalDistribution } from '../distributions/BimodalDistribution';
import { BananaDistribution } from '../distributions/BananaDistribution';
import { RastriginDistribution } from '../distributions/RastriginDistribution';
import { RosenbrockDistribution } from '../distributions/RosenbrockDistribution';
import { AckleyDistribution } from '../distributions/AckleyDistribution';
import { SquiggleDistribution } from '../distributions/SquiggleDistribution';
import { MultimodalDistribution } from '../distributions/MultimodalDistribution';
import { QuarticGaussian } from '../distributions/QuarticGaussian';

// Distribution presets
const DISTRIBUTIONS = {
  gaussian: () => new StandardGaussian(),
  quartic: () => new QuarticGaussian(),
  donut: () => new DonutDistribution(2, 0.4),
  bimodal: () => new BimodalDistribution(3, 0.8),
  banana: () => new BananaDistribution(1, 1),
  rastrigin: () => new RastriginDistribution(10, 0.1),
  rosenbrock: () => new RosenbrockDistribution(1, 100, 0.02),
  ackley: () => new AckleyDistribution(20, 0.2, 2 * Math.PI, 0.3),
  squiggle: () => new SquiggleDistribution(5),
  multimodal: () => new MultimodalDistribution(),
};

// Map distribution names to keys
const DISTRIBUTION_NAME_TO_KEY: Record<string, keyof typeof DISTRIBUTIONS> = {
  'Standard Gaussian': 'gaussian',
  'Quartic Gaussian': 'quartic',
  'Donut': 'donut',
  'Bimodal': 'bimodal',
  'Banana': 'banana',
  'Rastrigin': 'rastrigin',
  'Rosenbrock': 'rosenbrock',
  'Ackley': 'ackley',
  'Squiggle': 'squiggle',
  'Multimodal': 'multimodal',
};

// Map algorithm names to keys
const ALGORITHM_NAME_TO_KEY: Record<string, AlgorithmType> = {
  'Random Walk Metropolis-Hastings': 'rwmh',
  'Hamiltonian Monte Carlo': 'hmc',
  'No-U-Turn Sampler': 'nuts',
  'Gibbs Sampler': 'gibbs',
  'Metropolis-adjusted Langevin': 'mala',
};

interface ControlPanelProps {
  simulation: Simulation;
  onDistributionChange?: () => void;
  collapsed?: boolean;
}

export function ControlPanel({ simulation, onDistributionChange, collapsed = false }: ControlPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paneRef = useRef<any>(null);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle collapsed state changes
  useEffect(() => {
    if (paneRef.current) {
      paneRef.current.expanded = !collapsed;
    }
  }, [collapsed]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create pane - using any type since Tweakpane types are incomplete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pane: any = new Pane({
      title: isMobile ? '' : 'MCMC Controls',
      container: containerRef.current,
      expanded: !collapsed,
    });

    paneRef.current = pane;

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

    simFolder.addButton({ title: 'Export samples' }).on('click', () => {
      const samples = simulation.visualizer.allSamples;
      if (samples.length === 0) return;

      // Build CSV content
      const header = 'x,y\n';
      const rows = samples.map(s => `${s.x},${s.y}`).join('\n');
      const csv = header + rows;

      // Build filename with distribution and algorithm
      const distName = simulation.distribution?.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
      const algName = simulation.algorithm?.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
      const filename = `${distName}_${algName}_n${samples.length}.csv`;

      // Trigger download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });

    simFolder.addBinding(simulation, 'delay', {
      min: 0,
      max: 2000,
      step: 50,
      label: 'Delay (ms)',
    });

    simFolder.addBinding(simulation, 'totalSamples', {
      readonly: true,
      label: 'Total Samples',
    });

    // Distribution selector
    const distFolder = pane.addFolder({ title: 'Distribution' });
    const currentDistKey = simulation.distribution
      ? DISTRIBUTION_NAME_TO_KEY[simulation.distribution.name] || 'gaussian'
      : 'gaussian';
    const distParams = { selected: currentDistKey };

    distFolder.addBinding(distParams, 'selected', {
      label: 'Target',
      options: {
        'Gaussian': 'gaussian',
        'Quartic': 'quartic',
        'Bimodal': 'bimodal',
        'Multimodal': 'multimodal',
        'Banana': 'banana',
        'Donut': 'donut',
        'Squiggle': 'squiggle',
        'Rosenbrock': 'rosenbrock',
        'Rastrigin': 'rastrigin',
        'Ackley': 'ackley',
      },
    }).on('change', (e: { value: keyof typeof DISTRIBUTIONS }) => {
      const newDist = DISTRIBUTIONS[e.value]();
      simulation.setDistribution(newDist);
      simulation.reset();
      onDistributionChange?.();
    });

    // Algorithm selector and parameters
    const algFolder = pane.addFolder({ title: 'Algorithm' });

    // Build algorithm options
    const algorithmOptions: Record<string, AlgorithmType> = {};
    ALGORITHMS.forEach(a => {
      algorithmOptions[a.name] = a.key;
    });

    const currentAlgKey = simulation.algorithm
      ? ALGORITHM_NAME_TO_KEY[simulation.algorithm.name] || 'rwmh'
      : 'rwmh';
    const algParams = { selected: currentAlgKey as AlgorithmType };

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
        paramFolder.addBinding(simulation.visualizer, 'showMomentum', {
          label: 'Show momentum',
        });
        paramFolder.addBinding(simulation.visualizer, 'showLeapfrogPoints', {
          label: 'Show leapfrog points',
        });
        paramFolder.addBinding(simulation.visualizer, 'animateTrajectory', {
          label: 'Animate trajectory',
        });
        paramFolder.addBinding(simulation.visualizer, 'trajectoryAnimationSpeed', {
          min: 0,
          max: 300,
          step: 10,
          label: 'Animation speed (ms)',
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
        paramFolder.addBinding(simulation.visualizer, 'showMomentum', {
          label: 'Show momentum',
        });
        paramFolder.addBinding(simulation.visualizer, 'showLeapfrogPoints', {
          label: 'Show leapfrog points',
        });
      } else if (algorithm.name === 'Gibbs Sampler') {
        const gibbs = algorithm as GibbsSampler;
        paramFolder.addBinding(gibbs, 'gridResolution', {
          min: 50,
          max: 500,
          step: 50,
          label: 'Grid Resolution',
        });
      } else if (algorithm.name === 'Metropolis-adjusted Langevin') {
        const mala = algorithm as LangevinMC;
        paramFolder.addBinding(mala, 'epsilon', {
          min: 0.01,
          max: 3.0,
          step: 0.01,
          label: 'Step Size (ε)',
        });
        paramFolder.addBinding(simulation.visualizer, 'showLangevinGradient', {
          label: 'Show gradient',
        });
        paramFolder.addBinding(simulation.visualizer, 'showLangevinDrift', {
          label: 'Show drift',
        });
        paramFolder.addBinding(simulation.visualizer, 'showLangevinNoise', {
          label: 'Show noise',
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

    // View options
    vizFolder.addBinding(simulation.visualizer, 'show3D', {
      label: 'Show 3D',
    });

    vizFolder.addBinding(simulation.visualizer, 'autoRotate', {
      label: 'Auto Rotate',
    });

    // Scene elements
    vizFolder.addBinding(simulation.visualizer, 'showGrid', {
      label: 'Show Grid',
    });

    vizFolder.addBinding(simulation.visualizer, 'showOrigin', {
      label: 'Show Origin',
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

    vizFolder.addBinding(simulation.visualizer, 'terrainOpacity', {
      min: 0,
      max: 1,
      step: 0.05,
      label: 'Terrain Opacity',
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

    // Sample visualization
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

    vizFolder.addBinding(simulation.visualizer, 'excludeBurnIn', {
      label: 'Exclude Burn-in',
    });

    vizFolder.addBinding(simulation.visualizer, 'burnIn', {
      min: 0,
      max: 1000,
      step: 10,
      label: 'Burn-in',
    });

    // UI panels
    vizFolder.addBinding(simulation.visualizer, 'showHeatmap', {
      label: 'Show Heatmap',
    });

    vizFolder.addBinding(simulation.visualizer, 'showHistogram', {
      label: 'Show Histogram',
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
