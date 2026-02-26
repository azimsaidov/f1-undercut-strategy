import type { UndercutResult } from '../types';
import UndercutGauge from './UndercutGauge';
import LapChart from './LapChart';
import GapChart from './GapChart';
import StintTimeline from './StintTimeline';
import WeatherStrip from './WeatherStrip';
import LapSlider from './LapSlider';

interface Props {
  result: UndercutResult;
  onLapChange: (lap: number) => void;
  lapLoading: boolean;
}

function MetricCard({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-4 py-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <span className={`text-xl font-bold ${accent ?? 'text-zinc-100'}`}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-zinc-500">{unit}</span>}
      </span>
    </div>
  );
}

function fmt(v: number | null | undefined, digits = 3): string {
  if (v == null) return '—';
  return v.toFixed(digits);
}

export default function Dashboard({ result, onLapChange, lapLoading }: Props) {
  const r = result;
  const marginPositive = r.undercut_margin != null && r.undercut_margin > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Lap scrubber */}
      {r.total_laps > 0 && (
        <LapSlider
          totalLaps={r.total_laps}
          currentLap={r.at_lap}
          onChange={onLapChange}
          loading={lapLoading}
        />
      )}

      {/* Undercut window alert */}
      {r.window_open && (
        <div className="flex items-center gap-3 rounded-lg border border-red-600/40 bg-red-600/10 px-5 py-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
          </span>
          <span className="text-sm font-semibold text-red-400">
            UNDERCUT WINDOW OPEN — Gap is under 1.5s
          </span>
        </div>
      )}

      {/* Top row: gauge + metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Undercut Probability
            {r.at_lap != null && (
              <span className="ml-2 text-red-400">@ Lap {r.at_lap}</span>
            )}
          </h3>
          <UndercutGauge probability={r.probability} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          <MetricCard
            label="Current Gap"
            value={fmt(r.gap)}
            unit="s"
            accent={r.window_open ? 'text-red-400' : undefined}
          />
          <MetricCard label="Pit Loss (avg)" value={fmt(r.pit_loss)} unit="s" />
          <MetricCard label="Leader Pace" value={fmt(r.leader_pace)} unit="s" />
          <MetricCard label="Chaser Pace" value={fmt(r.chaser_pace)} unit="s" />
          <MetricCard label="Fresh Tyre Pace" value={fmt(r.projected_outlap_pace)} unit="s" />
          <MetricCard
            label="Undercut Margin"
            value={fmt(r.undercut_margin)}
            unit="s"
            accent={marginPositive ? 'text-green-400' : 'text-red-400'}
          />
        </div>
      </div>

      {/* Driver info chips */}
      <div className="flex flex-wrap gap-4">
        {r.leader_info && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-4 py-2">
            {r.leader_info.headshot_url && (
              <img src={r.leader_info.headshot_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: r.leader_info.team_colour ? `#${r.leader_info.team_colour}` : '#666' }}
                />
                <span className="text-sm font-semibold">{r.leader_info.full_name}</span>
                <span className="text-xs text-zinc-500">Leader</span>
              </div>
              <div className="text-xs text-zinc-500">
                {r.leader_compound ?? '—'} tyre
                {r.leader_tyre_age != null && `, ${r.leader_tyre_age} laps old`}
              </div>
            </div>
          </div>
        )}
        {r.chaser_info && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-4 py-2">
            {r.chaser_info.headshot_url && (
              <img src={r.chaser_info.headshot_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: r.chaser_info.team_colour ? `#${r.chaser_info.team_colour}` : '#666' }}
                />
                <span className="text-sm font-semibold">{r.chaser_info.full_name}</span>
                <span className="text-xs text-zinc-500">Chaser</span>
              </div>
              <div className="text-xs text-zinc-500">
                {r.chaser_compound ?? '—'} tyre
                {r.chaser_tyre_age != null && `, ${r.chaser_tyre_age} laps old`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/20 p-3">
          <LapChart
            leaderLaps={r.laps_leader}
            chaserLaps={r.laps_chaser}
            leaderInfo={r.leader_info}
            chaserInfo={r.chaser_info}
            atLap={r.at_lap}
          />
        </div>
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/20 p-3">
          <GapChart gapHistory={r.gap_history} atLap={r.at_lap} chaserLaps={r.laps_chaser} />
        </div>
      </div>

      {/* Stint timeline */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/20 p-4">
        <StintTimeline
          stintsLeader={r.stints_leader}
          stintsChaser={r.stints_chaser}
          leaderInfo={r.leader_info}
          chaserInfo={r.chaser_info}
          atLap={r.at_lap}
        />
      </div>

      {/* Weather */}
      <WeatherStrip weather={r.weather} />
    </div>
  );
}
