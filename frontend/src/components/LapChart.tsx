import Plot from 'react-plotly.js';
import type { LapData, DriverInfo } from '../types';

interface Props {
  leaderLaps: LapData[];
  chaserLaps: LapData[];
  leaderInfo: DriverInfo | null;
  chaserInfo: DriverInfo | null;
  atLap?: number | null;
}

export default function LapChart({ leaderLaps, chaserLaps, leaderInfo, chaserInfo, atLap }: Props) {
  const leaderColor = leaderInfo?.team_colour ? `#${leaderInfo.team_colour}` : '#3b82f6';
  const chaserColor = chaserInfo?.team_colour ? `#${chaserInfo.team_colour}` : '#ef4444';

  const filterValid = (laps: LapData[]) =>
    laps.filter((l) => l.lap_duration !== null && l.lap_duration > 0);

  const leaderValid = filterValid(leaderLaps);
  const chaserValid = filterValid(chaserLaps);

  const shapes: Partial<Plotly.Shape>[] = [];
  if (atLap != null) {
    shapes.push({
      type: 'line',
      x0: atLap,
      x1: atLap,
      y0: 0,
      y1: 1,
      yref: 'paper',
      line: { color: '#e10600', width: 2, dash: 'dot' },
    });
  }

  return (
    <Plot
      data={[
        {
          x: leaderValid.map((l) => l.lap_number),
          y: leaderValid.map((l) => l.lap_duration),
          type: 'scatter',
          mode: 'lines+markers',
          name: leaderInfo?.name_acronym ?? 'Leader',
          line: { color: leaderColor, width: 2 },
          marker: {
            size: leaderValid.map((l) => (l.is_pit_out_lap ? 8 : 4)),
            symbol: leaderValid.map((l) => (l.is_pit_out_lap ? 'x' : 'circle')),
            color: leaderColor,
          },
        },
        {
          x: chaserValid.map((l) => l.lap_number),
          y: chaserValid.map((l) => l.lap_duration),
          type: 'scatter',
          mode: 'lines+markers',
          name: chaserInfo?.name_acronym ?? 'Chaser',
          line: { color: chaserColor, width: 2 },
          marker: {
            size: chaserValid.map((l) => (l.is_pit_out_lap ? 8 : 4)),
            symbol: chaserValid.map((l) => (l.is_pit_out_lap ? 'x' : 'circle')),
            color: chaserColor,
          },
        },
      ]}
      layout={{
        title: {
          text: atLap != null ? `Lap Times (viewing lap ${atLap})` : 'Lap Times',
          font: { color: '#e4e4e7', size: 14 },
        },
        xaxis: {
          title: { text: 'Lap', font: { color: '#71717a' } },
          color: '#71717a',
          gridcolor: '#2a2a3e',
          zeroline: false,
        },
        yaxis: {
          title: { text: 'Duration (s)', font: { color: '#71717a' } },
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
      }}
      config={{ displayModeBar: false, responsive: true }}
      className="w-full"
    />
  );
}
