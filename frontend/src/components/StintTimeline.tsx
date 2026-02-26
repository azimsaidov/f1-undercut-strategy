import type { StintData, DriverInfo } from '../types';

interface Props {
  stintsLeader: StintData[];
  stintsChaser: StintData[];
  leaderInfo: DriverInfo | null;
  chaserInfo: DriverInfo | null;
  atLap?: number | null;
}

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#ef4444',
  MEDIUM: '#facc15',
  HARD: '#e4e4e7',
  INTERMEDIATE: '#22c55e',
  WET: '#3b82f6',
};

function StintBar({ stints, driverInfo, atLap }: { stints: StintData[]; driverInfo: DriverInfo | null; atLap?: number | null }) {
  if (stints.length === 0) return null;
  const maxLap = Math.max(...stints.map((s) => s.lap_end));
  const markerPct = atLap != null ? (atLap / maxLap) * 100 : null;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-300">
        {driverInfo?.name_acronym ?? `#${stints[0]?.driver_number}`}
      </span>
      <div className="relative flex h-7 w-full overflow-hidden rounded">
        {stints.map((s) => {
          const width = ((s.lap_end - s.lap_start + 1) / maxLap) * 100;
          const bg = COMPOUND_COLORS[s.compound?.toUpperCase()] ?? '#71717a';
          return (
            <div
              key={s.stint_number}
              className="flex items-center justify-center text-[10px] font-bold"
              style={{
                width: `${width}%`,
                background: bg,
                color: s.compound?.toUpperCase() === 'HARD' ? '#15151e' : '#fff',
                minWidth: 20,
              }}
              title={`${s.compound} (Lap ${s.lap_start}–${s.lap_end}, age ${s.tyre_age_at_start})`}
            >
              {s.compound?.[0]}
            </div>
          );
        })}
        {markerPct != null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-red-500 shadow-[0_0_6px_rgba(225,6,0,0.6)]"
            style={{ left: `${markerPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default function StintTimeline({ stintsLeader, stintsChaser, leaderInfo, chaserInfo, atLap }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-zinc-300">
        Stint Timeline
        {atLap != null && <span className="ml-2 text-xs font-normal text-red-400">@ Lap {atLap}</span>}
      </h3>
      <StintBar stints={stintsLeader} driverInfo={leaderInfo} atLap={atLap} />
      <StintBar stints={stintsChaser} driverInfo={chaserInfo} atLap={atLap} />
      <div className="mt-1 flex gap-3 text-[10px] text-zinc-500">
        {Object.entries(COMPOUND_COLORS).map(([name, color]) => (
          <span key={name} className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
