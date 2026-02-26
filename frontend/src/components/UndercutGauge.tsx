import Plot from 'react-plotly.js';

interface Props {
  probability: number;
}

function barColor(p: number): string {
  if (p <= 30) return '#ef4444';
  if (p <= 60) return '#facc15';
  return '#22c55e';
}

function numberColor(p: number): string {
  if (p <= 30) return '#fca5a5';
  if (p <= 60) return '#fef08a';
  return '#86efac';
}

export default function UndercutGauge({ probability }: Props) {
  return (
    <Plot
      data={[
        {
          type: 'indicator',
          mode: 'gauge+number',
          value: probability,
          number: { suffix: '%', font: { color: numberColor(probability), size: 42 } },
          gauge: {
            axis: {
              range: [0, 100],
              tickcolor: '#71717a',
              tickfont: { color: '#71717a' },
            },
            bar: { color: barColor(probability), thickness: 0.6 },
            bgcolor: '#1e1e2e',
            bordercolor: '#2a2a3e',
            steps: [
              { range: [0, 30], color: 'rgba(239,68,68,0.15)' },
              { range: [30, 60], color: 'rgba(250,204,21,0.15)' },
              { range: [60, 100], color: 'rgba(34,197,94,0.15)' },
            ],
            threshold: {
              line: { color: '#e4e4e7', width: 2 },
              thickness: 0.8,
              value: probability,
            },
          },
        },
      ]}
      layout={{
        width: 320,
        height: 220,
        margin: { t: 30, b: 0, l: 30, r: 30 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#e4e4e7' },
      }}
      config={{ displayModeBar: false, responsive: true }}
    />
  );
}
