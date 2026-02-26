import { useCallback, useRef, useState } from 'react';

interface Props {
  totalLaps: number;
  currentLap: number | null;
  onChange: (lap: number) => void;
  loading: boolean;
}

export default function LapSlider({ totalLaps, currentLap, onChange, loading }: Props) {
  const [localValue, setLocalValue] = useState(currentLap ?? totalLaps);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback(
    (val: number) => {
      setLocalValue(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange(val), 300);
    },
    [onChange],
  );

  if (totalLaps <= 1) return null;

  const lap = localValue;
  const pct = ((lap - 1) / (totalLaps - 1)) * 100;

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-200">Race Lap</h3>
          <span className="rounded-md bg-red-600/20 px-2.5 py-0.5 text-lg font-bold tabular-nums text-red-400">
            {lap}
          </span>
          <span className="text-xs text-zinc-500">of {totalLaps}</span>
          {loading && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-500 border-t-red-500" />
          )}
        </div>
        <span className="text-xs text-zinc-500">
          Drag to scrub through the race
        </span>
      </div>

      <div className="relative">
        {/* Track background */}
        <div className="h-2 w-full rounded-full bg-zinc-700/50" />
        {/* Filled portion */}
        <div
          className="absolute top-0 h-2 rounded-full bg-gradient-to-r from-red-600 to-red-500"
          style={{ width: `${pct}%` }}
        />
        {/* Range input overlaid */}
        <input
          type="range"
          min={1}
          max={totalLaps}
          value={lap}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="absolute top-0 h-2 w-full cursor-pointer appearance-none bg-transparent
            [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-red-500/30 [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-red-500 [&::-webkit-slider-thumb]:-mt-1.5
            [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-red-500"
        />
      </div>

      {/* Lap markers */}
      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-zinc-600">
        <span>Lap 1</span>
        {totalLaps > 10 && <span>Lap {Math.round(totalLaps * 0.25)}</span>}
        {totalLaps > 10 && <span>Lap {Math.round(totalLaps * 0.5)}</span>}
        {totalLaps > 10 && <span>Lap {Math.round(totalLaps * 0.75)}</span>}
        <span>Lap {totalLaps}</span>
      </div>
    </div>
  );
}
