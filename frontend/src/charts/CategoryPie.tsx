import { ResponsivePie } from '@nivo/pie';
import type { CategoryStat } from '../api/client';

interface Props { data: CategoryStat[] }

const theme = {
  labels: { text: { fill: '#475569', fontSize: 11, fontWeight: 600 } },
  tooltip: { container: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', color: '#1e293b', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } },
};

export default function CategoryPie({ data }: Props) {
  // Guard: nothing to render
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        No category data available
      </div>
    );
  }

  const formatted = data.map(d => ({
    id: d.category,
    label: d.category,
    value: d.count,
  }));

  return (
    <div style={{ height: 280 }}>
      <ResponsivePie
        data={formatted}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        innerRadius={0.6}
        padAngle={1}
        cornerRadius={4}
        activeOuterRadiusOffset={8}
        colors={{ scheme: 'nivo' }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        // Disable both label types to avoid overlap on small donut slices;
        // tooltip already shows the values on hover.
        enableArcLabels={false}
        enableArcLinkLabels={false}
        arcLabelsSkipAngle={10}
        theme={theme}
        tooltip={({ datum }) => (
          <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, fontSize: 12, color: '#1e293b', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <strong style={{ color: datum.color }}>{datum.label}</strong>
            <span style={{ marginLeft: 8 }}>{datum.value.toLocaleString()} recs</span>
          </div>
        )}
        legends={[{
          anchor: 'right',
          direction: 'column',
          justify: false,
          translateX: 0,
          translateY: 0,
          itemWidth: 80,
          itemHeight: 18,
          itemsSpacing: 4,
          symbolSize: 10,
          symbolShape: 'circle',
          itemTextColor: '#64748b',
        }]}
        animate
      />
    </div>
  );
}
