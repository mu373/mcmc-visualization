import type { Simulation } from '../core/Simulation';
import type { AlgorithmType } from '../algorithms';

const algorithmDescriptions: Record<AlgorithmType, { title: string; description: string }> = {
  rwmh: {
    title: 'Metropolis Hastings',
    description: 'Proposes new positions by taking random steps. Step size (σ) controls exploration vs acceptance trade-off.',
  },
  hmc: {
    title: 'Hamiltonian MC',
    description: 'Uses gradient information to simulate physics-based dynamics for efficient exploration.',
  },
  nuts: {
    title: 'NUTS',
    description: 'Extends HMC by automatically determining optimal trajectory length, stopping when the path would start doubling back.',
  },
  gibbs: {
    title: 'Gibbs Sampler',
    description: 'Samples each coordinate from its conditional distribution, producing axis-aligned movements. Conditionals are drawn from a grid approximation over the plotted box.',
  },
  mala: {
    title: 'MALA',
    description: 'Combines gradient-driven drift toward local peaks with Gaussian noise. Efficient within modes but tends to get trapped in multimodal distributions.',
  },
};

const FLAG_LABELS = { divergent: 'Divergent', wall: 'Wall hits' } as const;

export function InfoPanel({ simulation, used }: { simulation: Simulation; used: number }) {
  const { algorithm, distribution, flagCounts } = simulation;
  const info = algorithmDescriptions[algorithm.key];
  const b = distribution.bounds;
  const stats: [string, string][] = [
    ['Iterations', simulation.iterations.toString()],
    ['Used', `${used} / ${simulation.chain.length}`],
  ];
  if (algorithm.rateLabel) stats.push([algorithm.rateLabel, `${(simulation.rate * 100).toFixed(1)}%`]);
  for (const flag of ['divergent', 'wall'] as const) {
    if (flagCounts[flag] > 0) stats.push([FLAG_LABELS[flag], flagCounts[flag].toString()]);
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        maxWidth: 280,
        background: 'rgba(17, 17, 17, 0.95)',
        borderRadius: 8,
        padding: 12,
        border: '1px solid #222',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 100,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#fff' }}>
        {info.title}
      </div>

      <div style={{ fontSize: 12, color: '#ddd', lineHeight: 1.4, marginBottom: 6 }}>
        {info.description}
      </div>

      <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
        Target truncated to x ∈ [{b.xMin}, {b.xMax}], y ∈ [{b.yMin}, {b.yMax}]
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        borderTop: '1px solid #222',
        paddingTop: 10,
      }}>
        {stats.map(([label, value]) => <Stat key={label} label={label} value={value} />)}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>
        {value}
      </div>
    </div>
  );
}
