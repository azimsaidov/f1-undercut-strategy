import Plot from 'react-plotly.js';
import type { GapEntry, LapData } from '../types';

interface Props {
  gapHistory: GapEntry[];
  atLap?: number | null;
  chaserLaps?: LapData[];
}

export default function GapChart({ gapHistory, atLap, chaserLaps }: Props) {
  const numeric = gapHistory.filter(
    (g) => typeof g.interval === 'number' && g.interval !== null
  );

  const shapes: Partial<Plotly.Shape>[] = [];

  if (atLap != null && chaserLaps && chaserLaps.length > 0) {
    const lapEntry = chaserLaps.find((l) => l.lap_number === atLap);
    if (lapEntry) {
      const lapIdx = chaserLaps.indexOf(lapEntry);
      const approxFraction = lapIdx / chaserLaps.length;
      const tsIdx = Math.min(Math.floor(approxFraction * numeric.length), numeric.length - 1);
      if (numeric[tsIdx]) {
        shapes.push({
          type: 'line',
          x0: numeric[tsIdx].date,
          x1: numeric[tsIdx].date,
          y0: 0,
          y1: 1,
          yref: 'paper',
          line: { color: '#e10600', width: 2, dash: 'dot' },
        });
      }
    }
  }

  return (
    <Plot
      data={[
        {
          x: numeric.map((g) => g.date),
          y: numeric.map((g) => g.interval as number),
          type: 'scatter',
          mode: 'lines',
          fill: 'tozeroy',
          fillcolor: 'rgba(225,6,0,0.1)',
          line: { color: '#e10600', width: 2 },
          name: 'Gap',
        },
        {
          x: [numeric[0]?.date, numeric[numeric.length - 1]?.date].filter(Boolean),
          y: [1.5, 1.5],
          type: 'scatter',
          mode: 'lines',
          line: { color: '#facc15', width: 1, dash: 'dash' },
          name: 'Undercut threshold (1.5s)',
        },
      ]}
      layout={{
        title: {
          text: atLap != null ? `Gap to Car Ahead (viewing lap ${atLap})` : 'Gap to Car Ahead',
          font: { color: '#e4e4e7', size: 14 },
        },
        xaxis: {
          color: '#71717a',
          gridcolor: '#2a2a3e',
          zeroline: false,
        },
        yaxis: {
          title: { text: 'Interval (s)', font: { color: '#71717a' } },
          color: '#71717a',
          gridcolor: '#2a2a3e',
          zeroline: false,
        },
        shapes,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        legend: { font: { color: '#e4e4e7' }, bgcolor: 'transparent' },
        margin: { t: 40, b: 50, l: 60, r: 20 },
        height: 320,
        showlegend: true,
      }}
      config={{ displayModeBar: false, responsive: true }}
      className="w-full"
    />
  );
}
