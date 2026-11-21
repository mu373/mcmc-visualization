import { useEffect, useRef, useState } from 'react';
import { Pane } from 'tweakpane';
import type { Simulation } from '../core/Simulation';
import { ALGORITHMS, ALGORITHM_KEYS, type AlgorithmType } from '../algorithms';
import type { RandomWalkMH } from '../algorithms/RandomWalkMH';
import type { HamiltonianMC } from '../algorithms/HamiltonianMC';
import type { NUTS } from '../algorithms/NUTS';
import type { GibbsSampler } from '../algorithms/GibbsSampler';
import type { LangevinMC } from '../algorithms/LangevinMC';
import { DISTRIBUTIONS, DISTRIBUTION_KEYS, type DistributionKey } from '../distributions/presets';
import { chainToCsv, csvFilename } from '../core/csv';

function downloadCsv(simulation: Simulation) {
  const url = URL.createObjectURL(new Blob([chainToCsv(simulation)], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = csvFilename(simulation);
  a.click();
  URL.revokeObjectURL(url);
}

interface ControlPanelProps {
  simulation: Simulation;
  collapsed?: boolean;
}

export function ControlPanel({ simulation, collapsed = false }: ControlPanelProps) {
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

    const playButton = simFolder.addButton({ title: simulation.isRunning ? 'Pause' : 'Play' }).on('click', () => {
      simulation.toggle();
    });

    simFolder.addButton({ title: 'Step' }).on('click', () => {
      simulation.step();
    });

    simFolder.addButton({ title: 'Reset' }).on('click', () => {
      simulation.reset();
    });

    simFolder.addButton({ title: 'Export samples' }).on('click', () => {
      downloadCsv(simulation);
    });

    simFolder.addBinding(simulation, 'delay', {
      min: 0,
      max: 2000,
      step: 50,
      label: 'Delay (ms)',
    });

    // A proxy, so a typed seed can be told apart from the seed of a run Reset just started.
    const run = { seed: simulation.seed };
    simFolder.addBinding(run, 'seed', {
      label: 'Seed',
      min: 0,
      max: 4294967295,
      step: 1,
      format: (v: number) => v.toFixed(0),
    }).on('change', (e: { value: number }) => {
      if (e.value !== simulation.seed) simulation.setSeed(e.value);
    });

    simFolder.addButton({ title: 'Replay seed' }).on('click', () => {
      simulation.setSeed(simulation.seed);
    });

    simFolder.addBinding(simulation, 'iterations', {
      readonly: true,
      label: 'Iterations',
      format: (v: number) => v.toFixed(0),
    });

    const distFolder = pane.addFolder({ title: 'Distribution' });
    const distParams = { selected: simulation.distributionKey };
    distFolder.addBinding(distParams, 'selected', {
      label: 'Target',
      options: Object.fromEntries(DISTRIBUTION_KEYS.map(k => [DISTRIBUTIONS[k].label, k])),
    }).on('change', (e: { value: DistributionKey }) => {
      simulation.setDistribution(e.value);
    });

    const algFolder = pane.addFolder({ title: 'Algorithm' });
    const algParams = { selected: simulation.algorithm.key as AlgorithmType };

    // Parameter folder (will be rebuilt when algorithm changes)
    let paramFolder = pane.addFolder({ title: 'Parameters' });

    const rebuildParams = () => {
      paramFolder.dispose();
      paramFolder = pane.addFolder({ title: 'Parameters', index: 3 });

      const algorithm = simulation.algorithm;
      simulation.visualizer.showSigmaRings = algorithm.key === 'rwmh';

      switch (algorithm.key) {
        case 'rwmh': {
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
          break;
        }
        case 'hmc': {
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
          break;
        }
        case 'nuts': {
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
          break;
        }
        case 'gibbs': {
          const gibbs = algorithm as GibbsSampler;
          paramFolder.addBinding(gibbs, 'gridResolution', {
            min: 50,
            max: 500,
            step: 50,
            label: 'Grid Resolution',
          });
          break;
        }
        case 'mala': {
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
          break;
        }
      }

      if (algorithm.rateLabel) {
        paramFolder.addBinding(simulation, 'rate', {
          readonly: true,
          label: `${algorithm.rateLabel} Rate`,
          format: (v: number) => `${(v * 100).toFixed(1)}%`,
        });
      }
    };

    algFolder.addBinding(algParams, 'selected', {
      label: 'Method',
      options: Object.fromEntries(ALGORITHM_KEYS.map(k => [ALGORITHMS[k].name, k])),
    }).on('change', (e: { value: AlgorithmType }) => {
      simulation.setAlgorithm(e.value);
      rebuildParams();
    });

    rebuildParams();

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

    // Every Tweakpane edit mutates simulation state directly; tell React about it.
    pane.on('change', () => simulation.notify());

    // Keyboard shortcuts flip these outside the pane, so their checkboxes need a refresh.
    const shortcutState = () => {
      const v = simulation.visualizer;
      return `${simulation.runId}|${v.autoRotate}|${v.showContours}|${v.show3D}|${v.showGrid}`;
    };
    let shown = shortcutState();
    const unsubscribe = simulation.subscribe(() => {
      playButton.title = simulation.isRunning ? 'Pause' : 'Play';
      const state = shortcutState();
      if (state !== shown) {
        shown = state;
        run.seed = simulation.seed;
        pane.refresh();
      }
    });

    return () => {
      unsubscribe();
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
