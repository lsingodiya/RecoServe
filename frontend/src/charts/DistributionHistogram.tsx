import { ResponsiveBar } from '@nivo/bar';

interface Props {
  data: { bucket: string; count: number }[];
  color?: string;
  label?: string;
}

const theme = {
  axis: { ticks: { text: { fill: '#475569', fontSize: 10 } } },
  grid: { line: { stroke: 'rgba(0,0,0,0.04)' } },
  tooltip: { container: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', color: '#1e293b', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } },
};

export default function DistributionHistogram({ data, color = '#a78bfa', label = 'Count' }: Props) {
  // Guard: nothing to render
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        No distribution data available
      </div>
    );
  }

  const formatted = data.map(d => ({ bucket: d.bucket, [label]: d.count }));

  return (
    <div style={{ height: 240 }}>
      <ResponsiveBar
        data={formatted}
        keys={[label]}
        indexBy="bucket"
        // Extra bottom margin to prevent long bucket labels (e.g. "1.00–2.50")
        // from clipping into the chart area at -40° rotation.
        margin={{ top: 10, right: 10, bottom: 80, left: 48 }}
        padding={0.15}
        colors={[color]}
        borderRadius={3}
        axisBottom={{
          tickRotation: -40,
          tickSize: 0,
          tickPadding: 6,
        }}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        enableLabel={false}
        enableGridX={false}
        theme={theme}
        animate
      />
    </div>
  );
}
