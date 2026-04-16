import { ResponsivePie } from '@nivo/pie';

interface Props {
  data: { association: number; fallback: number };
}

const theme = {
  labels: { text: { fill: '#475569', fontSize: 11, fontWeight: 600 } },
  tooltip: { container: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', color: '#1e293b', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } },
};

export default function QualityMixPie({ data }: Props) {
  const total = (data.association ?? 0) + (data.fallback ?? 0);

  // Guard: Nivo throws when all values are 0 (division-by-zero in arc calculation).
  // This happens when the data source has no trigger_product column.
  if (total === 0) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        No quality mix data available
      </div>
    );
  }

  const formatted = [
    { id: 'Association', label: 'Association', value: data.association ?? 0, color: '#6378ff' },
    { id: 'Fallback',    label: 'Fallback',    value: data.fallback ?? 0,    color: '#cbd5e1' },
  ];

  return (
    <div style={{ height: 280 }}>
      <ResponsivePie
        data={formatted}
        margin={{ top: 20, right: 80, bottom: 20, left: 20 }}
        innerRadius={0.6}
        padAngle={2}
        cornerRadius={4}
        activeOuterRadiusOffset={8}
        colors={{ datum: 'data.color' }}
        enableArcLabels={true}
        arcLabel={d => `${((d.value / total) * 100).toFixed(1)}%`}
        arcLabelsTextColor="#ffffff"
        arcLabelsSkipAngle={15}
        enableArcLinkLabels={false}
        theme={theme}
        legends={[{
          anchor: 'right',
          direction: 'column',
          justify: false,
          translateX: 0,
          translateY: 0,
          itemWidth: 75,
          itemHeight: 18,
          itemsSpacing: 6,
          symbolSize: 10,
          symbolShape: 'circle',
          itemTextColor: '#64748b',
        }]}
        animate
      />
    </div>
  );
}
