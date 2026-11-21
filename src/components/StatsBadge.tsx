import type { Histograms } from '../core/histogram';
import type { Distribution } from '../distributions/Distribution';

export interface StatsPanelProps {
  histograms: Histograms;
  revision: number; // changes whenever the counts change, so canvases redraw only then
  total: number;
  burnIn: number;
  distribution: Distribution;
  scale?: number;
}

export function StatsBadge({ histograms, total, burnIn }: StatsPanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        textAlign: 'right',
        fontSize: 10,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {total <= burnIn && (
        <div style={{ color: '#f97316' }}>
          Burn-in ({total - 1}/{burnIn})
        </div>
      )}
      <div style={{ color: '#666' }}>
        n={histograms.count} / {total}
      </div>
    </div>
  );
}
