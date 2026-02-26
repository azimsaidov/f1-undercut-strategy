import { useEffect, useState } from 'react';
import { fetchDrivers, fetchPositions, type PositionEntry } from '../api/client';
import type { DriverInfo } from '../types';

interface Props {
  sessionKey: number;
  onAnalyze: (leader: number, chaser: number) => void;
  analyzing: boolean;
  currentLap?: number | null;
}

function PositionBadge({ position }: { position: number | null }) {
  if (position == null) return null;
  let bg = 'bg-zinc-700';
  if (position === 1) bg = 'bg-yellow-600';
  else if (position === 2) bg = 'bg-zinc-500';
  else if (position === 3) bg = 'bg-amber-800';
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white ${bg}`}>
      {position}
    </span>
  );
}

function DriverChip({ driver, position }: { driver: DriverInfo; position: number | null }) {
  const color = driver.team_colour ? `#${driver.team_colour}` : '#666';
  return (
    <span className="inline-flex items-center gap-1.5">
      <PositionBadge position={position} />
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      <span className="font-mono text-xs text-zinc-400">#{driver.driver_number}</span>
      <span>{driver.name_acronym}</span>
      {driver.team_name && (
        <span className="text-xs text-zinc-500">({driver.team_name})</span>
      )}
    </span>
  );
}

export default function DriverSelector({ sessionKey, onAnalyze, analyzing, currentLap }: Props) {
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [positions, setPositions] = useState<Map<number, number>>(new Map());
  const [leader, setLeader] = useState<number | null>(null);
  const [chaser, setChaser] = useState<number | null>(null);

  useEffect(() => {
    fetchDrivers(sessionKey)
      .then((d) => {
        setDrivers(d);
        setLeader(null);
        setChaser(null);
      })
      .catch(console.error);

    fetchPositions(sessionKey)
      .then((p) => setPositions(new Map(p.map((e) => [e.driver_number, e.position]))))
      .catch(console.error);
  }, [sessionKey]);

  useEffect(() => {
    if (currentLap == null) return;
    fetchPositions(sessionKey, currentLap)
      .then((p) => setPositions(new Map(p.map((e) => [e.driver_number, e.position]))))
      .catch(console.error);
  }, [sessionKey, currentLap]);

  const sorted = [...drivers].sort((a, b) => {
    const pa = positions.get(a.driver_number) ?? 99;
    const pb = positions.get(b.driver_number) ?? 99;
    return pa - pb;
  });

  const canAnalyze = leader !== null && chaser !== null && leader !== chaser;

  const posLabel = (dn: number) => {
    const p = positions.get(dn);
    return p != null ? `P${p}` : '';
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Leader */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Leader (car ahead)
        </label>
        <select
          value={leader ?? ''}
          onChange={(e) => setLeader(Number(e.target.value))}
          className="rounded-lg border border-zinc-700 bg-[#1e1e2e] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-red-500"
        >
          <option value="">Select driver...</option>
          {sorted.map((d) => (
            <option key={d.driver_number} value={d.driver_number}>
              {posLabel(d.driver_number)} {d.name_acronym} #{d.driver_number} — {d.full_name}
              {d.team_name ? ` (${d.team_name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Chaser */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Chaser (attempting undercut)
        </label>
        <select
          value={chaser ?? ''}
          onChange={(e) => setChaser(Number(e.target.value))}
          className="rounded-lg border border-zinc-700 bg-[#1e1e2e] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-red-500"
        >
          <option value="">Select driver...</option>
          {sorted.map((d) => (
            <option key={d.driver_number} value={d.driver_number}>
              {posLabel(d.driver_number)} {d.name_acronym} #{d.driver_number} — {d.full_name}
              {d.team_name ? ` (${d.team_name})` : ''}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => {
          if (canAnalyze) onAnalyze(leader!, chaser!);
        }}
        disabled={!canAnalyze || analyzing}
        className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {analyzing ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Analyzing...
          </span>
        ) : (
          'Analyze Undercut'
        )}
      </button>

      {/* Selected driver chips with position badges */}
      <div className="flex gap-3">
        {leader !== null && drivers.find((d) => d.driver_number === leader) && (
          <div className="rounded-md border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 text-xs">
            <span className="text-zinc-400">Leader: </span>
            <DriverChip
              driver={drivers.find((d) => d.driver_number === leader)!}
              position={positions.get(leader) ?? null}
            />
          </div>
        )}
        {chaser !== null && drivers.find((d) => d.driver_number === chaser) && (
          <div className="rounded-md border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 text-xs">
            <span className="text-zinc-400">Chaser: </span>
            <DriverChip
              driver={drivers.find((d) => d.driver_number === chaser)!}
              position={positions.get(chaser) ?? null}
            />
          </div>
        )}
      </div>
    </div>
  );
}
