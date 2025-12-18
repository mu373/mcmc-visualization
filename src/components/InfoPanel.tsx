import type { MCMCAlgorithm } from '../algorithms/MCMCAlgorithm';

interface InfoPanelProps {
  algorithm: MCMCAlgorithm | null;
  samples: number;
  acceptanceRate: number;
}

const algorithmDescriptions: Record<string, { title: string; description: string }> = {
  'Random Walk Metropolis-Hastings': {
    title: 'Metropolis Hastings',
    description: 'Proposes new positions by taking random steps. Step size (σ) controls exploration vs acceptance trade-off.',
  },
  'Hamiltonian Monte Carlo': {
    title: 'Hamiltonian MC',
    description: 'Uses gradient information to simulate physics-based dynamics for efficient exploration.',
  },
  'Importance Sampling': {
    title: 'Importance Sampling',
    description: 'Draws weighted samples from a proposal distribution.',
  },
};

export function InfoPanel({ algorithm, samples, acceptanceRate }: InfoPanelProps) {
  const algName = algorithm?.name || 'None';
  const info = algorithmDescriptions[algName] || {
    title: algName,
    description: 'Select an algorithm to begin sampling.',
  };

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
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 6,
        color: '#fff',
      }}>
        {info.title}
      </div>

      <div style={{
        fontSize: 12,
        color: '#ddd',
        lineHeight: 1.4,
        marginBottom: 10,
      }}>
        {info.description}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        borderTop: '1px solid #222',
        paddingTop: 10,
      }}>
        <Stat label="Samples" value={samples.toString()} />
        <Stat label="Accept" value={`${(acceptanceRate * 100).toFixed(1)}%`} />
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
