import { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import type { Simulation } from '../core/Simulation';
import type { RandomWalkMH } from '../algorithms/RandomWalkMH';
import { StandardGaussian } from '../distributions/StandardGaussian';
import { DonutDistribution } from '../distributions/DonutDistribution';
import { BimodalDistribution } from '../distributions/BimodalDistribution';
import { BananaDistribution } from '../distributions/BananaDistribution';

// Distribution presets
const DISTRIBUTIONS = {
  gaussian: () => new StandardGaussian(),
  donut: () => new DonutDistribution(2, 0.4),
  bimodal: () => new BimodalDistribution(3, 0.8),
  banana: () => new BananaDistribution(1, 1),
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

    // Algorithm parameters
    const algFolder = pane.addFolder({ title: 'Algorithm' });

    if (simulation.algorithm) {
      const mh = simulation.algorithm as RandomWalkMH;

      algFolder.addBinding(mh, 'sigma', {
        min: 0.05,
        max: 3,
        step: 0.05,
        label: 'Step Size (σ)',
      });

      // Acceptance rate monitor - create an object to hold the reactive value
      const stats = { acceptanceRate: 0 };

      const acceptRateBinding = algFolder.addBinding(stats, 'acceptanceRate', {
        readonly: true,
        label: 'Accept Rate',
        format: (v: number) => `${(v * 100).toFixed(1)}%`,
      });

      // Update acceptance rate periodically
      const updateInterval = setInterval(() => {
        if (mh.getAcceptanceRate) {
          stats.acceptanceRate = mh.getAcceptanceRate();
          acceptRateBinding.refresh();
        }
      }, 100);

      // Store interval for cleanup
      (pane as unknown as { _acceptRateInterval?: number })._acceptRateInterval = updateInterval;
    }

    // Visual settings
    const vizFolder = pane.addFolder({ title: 'Visuals' });

    vizFolder.addBinding(simulation.visualizer, 'colorScheme', {
      label: 'Color Scheme',
      options: {
        'Plasma': 'plasma',
        'Viridis': 'viridis',
        'Terrain': 'terrain',
        'Hot': 'hot',
      },
    });

    vizFolder.addBinding(simulation.visualizer, 'terrainOpacity', {
      min: 0,
      max: 1,
      step: 0.05,
      label: 'Terrain Opacity',
    });

    vizFolder.addBinding(simulation.visualizer, 'maxTrailLength', {
      min: 10,
      max: 2000,
      step: 10,
      label: 'Visible Samples',
    });

    vizFolder.addBinding(simulation.visualizer, 'showGrid', {
      label: 'Show Grid',
    });

    vizFolder.addBinding(simulation.visualizer, 'showTrail', {
      label: 'Show Trail',
    });

    vizFolder.addBinding(simulation.visualizer, 'histogramBins', {
      min: 10,
      max: 80,
      step: 5,
      label: 'Histogram Bins',
    });

    vizFolder.addBinding(simulation.visualizer, 'sphereSize', {
      min: 0.2,
      max: 3,
      step: 0.1,
      label: 'Sphere Size',
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
