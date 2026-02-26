import type { WeatherEntry } from '../types';

interface Props {
  weather: WeatherEntry[];
}

export default function WeatherStrip({ weather }: Props) {
  if (weather.length === 0) return null;

  const latest = weather[weather.length - 1];
  const avgTrack =
    weather.reduce((acc, w) => acc + (w.track_temperature ?? 0), 0) / weather.length;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-4 py-2.5 text-xs">
      <span className="font-medium uppercase tracking-wider text-zinc-400">Weather</span>
      {latest.track_temperature != null && (
        <span>
          <span className="text-zinc-500">Track: </span>
          <span className="text-orange-400">{latest.track_temperature.toFixed(1)}°C</span>
        </span>
      )}
      {latest.air_temperature != null && (
        <span>
          <span className="text-zinc-500">Air: </span>
          <span className="text-sky-400">{latest.air_temperature.toFixed(1)}°C</span>
        </span>
      )}
      {latest.humidity != null && (
        <span>
          <span className="text-zinc-500">Humidity: </span>
          <span className="text-blue-400">{latest.humidity}%</span>
        </span>
      )}
      {latest.rainfall != null && latest.rainfall > 0 && (
        <span className="text-blue-300">Rain</span>
      )}
      <span>
        <span className="text-zinc-500">Avg Track Temp: </span>
        <span className="text-orange-300">{avgTrack.toFixed(1)}°C</span>
      </span>
    </div>
  );
}
