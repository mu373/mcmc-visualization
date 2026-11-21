import { useEffect, useState, useSyncExternalStore } from 'react';
import { Scene } from './components/Scene';
import { ControlPanel } from './components/ControlPanel';
import { InfoPanel } from './components/InfoPanel';
import { MarginalHistograms } from './components/MarginalHistograms';
import { HeatmapPanel } from './components/HeatmapPanel';
import { Simulation } from './core/Simulation';
import { Histograms } from './core/histogram';

function App() {
  const [simulation] = useState(() => {
    const sim = new Simulation('multimodal', 'hmc');
    sim.delay = 900; // Slower default for HMC to see trajectory animation
    if (window.innerWidth < 768) sim.visualizer.showHeatmap = false;
    return sim;
  });
  useSyncExternalStore(simulation.subscribe, simulation.getVersion);
  const [histograms] = useState(() => new Histograms());

  // Control panel collapsed state (collapsed by default on mobile)
  const [controlPanelCollapsed, setControlPanelCollapsed] = useState(() => window.innerWidth < 768);

  // Responsive panel scale
  const [panelScale, setPanelScale] = useState(() => window.innerWidth < 768 ? 0.6 : 1);

  useEffect(() => {
    const handleResize = () => {
      setPanelScale(window.innerWidth < 768 ? 0.6 : 1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    simulation.play();
    return () => simulation.pause();
  }, [simulation]);

  // Trajectory animation runs at its own speed and only re-renders when it advances.
  useEffect(() => {
    let timeoutId: number | undefined;
    const tick = () => {
      if (simulation.visualizer.advanceTrajectoryAnimation()) simulation.notify();
      timeoutId = window.setTimeout(tick, simulation.visualizer.trajectoryAnimationSpeed);
    };
    tick();
    return () => window.clearTimeout(timeoutId);
  }, [simulation]);

  useEffect(() => {
    const v = simulation.visualizer;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        simulation.toggle();
      } else if (e.code === 'KeyN') {
        simulation.step();
      } else if (e.code === 'KeyC' && e.shiftKey) {
        setControlPanelCollapsed(prev => !prev);
      } else {
        if (e.code === 'KeyR') v.autoRotate = !v.autoRotate;
        else if (e.code === 'KeyC') v.showContours = !v.showContours;
        else if (e.code === 'Digit3' && e.shiftKey) v.show3D = !v.show3D;
        else if (e.code === 'KeyG') v.showGrid = !v.showGrid;
        else return;
        simulation.notify();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [simulation]);

  const v = simulation.visualizer;
  const from = v.excludeBurnIn ? v.burnIn : 0;
  histograms.sync(simulation.chain, simulation.distribution.bounds, v.histogramBins, from, simulation.runId);
  const statsProps = {
    histograms,
    revision: histograms.revision,
    total: simulation.chain.length,
    burnIn: from,
    distribution: simulation.distribution,
    scale: panelScale,
  };

  return (
    <>
      <Scene simulation={simulation} />
      <ControlPanel simulation={simulation} collapsed={controlPanelCollapsed} />
      <InfoPanel simulation={simulation} used={histograms.count} />
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
            <HeatmapPanel {...statsProps} colorScheme={simulation.visualizer.colorScheme} />
          )}
          {simulation.visualizer.showHistogram && <MarginalHistograms {...statsProps} />}
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
