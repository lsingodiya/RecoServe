import { useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { CategoryStat } from '../api/client';

interface Props { data: CategoryStat[] }

const theme = {
  axis: { ticks: { text: { fill: '#475569', fontSize: 11 } }, legend: { text: { fill: '#64748b' } } },
  grid: { line: { stroke: 'rgba(0,0,0,0.04)' } },
  tooltip: { container: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', color: '#1e293b', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } },
};

type Metric = 'Avg Score' | 'Avg Lift';

export default function CategoryBar({ data }: Props) {
  const [metric, setMetric] = useState<Metric>('Avg Score');

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        No category data available
      </div>
    );
  }

  const formatted = data.map(d => ({
    category: d.category.length > 12 ? d.category.slice(0, 11) + '…' : d.category,
    'Avg Score': parseFloat(d.avg_score.toFixed(3)),
    'Avg Lift':  parseFloat(d.avg_lift.toFixed(3)),
  }));

  const color = metric === 'Avg Score' ? '#6378ff' : '#22d3ee';

  return (
    <div>
      {/* Metric toggle — avoids a misleading dual-axis where scores dwarf lifts */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'flex-end' }}>
        {(['Avg Score', 'Avg Lift'] as Metric[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            style={{
              padding: '3px 10px', fontSize: 11, borderRadius: 6, border: '1px solid',
              cursor: 'pointer', fontWeight: 500,
              background: metric === m ? (m === 'Avg Score' ? '#6378ff' : '#22d3ee') : 'transparent',
              color: metric === m ? '#fff' : '#64748b',
              borderColor: metric === m ? (m === 'Avg Score' ? '#6378ff' : '#22d3ee') : 'rgba(0,0,0,0.12)',
              transition: 'all 0.15s',
            }}
          >{m}</button>
        ))}
      </div>

      <div style={{ height: 240 }}>
        <ResponsiveBar
          data={formatted}
          keys={[metric]}
          indexBy="category"
          margin={{ top: 4, right: 20, bottom: 60, left: 52 }}
          padding={0.3}
          // In Nivo v0.99, min/max live inside valueScale — minValue/maxValue don't exist.
          // min: 0 forces the Y axis to always start at zero.
          // max: 'auto' lets Nivo scale the top to just above the data's highest bar.
          valueScale={{ type: 'linear', min: 0, max: 'auto' }}
          colors={[color]}
          borderRadius={4}
          axisBottom={{ tickRotation: -30, tickSize: 0, tickPadding: 6 }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            tickValues: 5,
            format: (v: number) => metric === 'Avg Score' ? v.toFixed(2) : `×${v.toFixed(1)}`,
          }}
          tooltip={({ id, value, indexValue }) => (
            <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, fontSize: 12, color: '#1e293b', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <strong>{indexValue}</strong>
              <span style={{ marginLeft: 8, color }}>
                {id === 'Avg Lift' ? `×${(value as number).toFixed(3)}` : (value as number).toFixed(3)}
              </span>
            </div>
          )}
          enableLabel={false}
          enableGridX={false}
          theme={theme}
          animate
        />
      </div>
    </div>
  );
}
