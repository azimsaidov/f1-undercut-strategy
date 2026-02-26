import { useEffect, useState } from 'react';
import { fetchMeetings, fetchSessions } from '../api/client';
import type { MeetingInfo, SessionInfo } from '../types';

interface Props {
  onSessionSelected: (session: SessionInfo) => void;
}

const YEARS = [2025, 2024, 2023];

export default function SessionPicker({ onSessionSelected }: Props) {
  const [year, setYear] = useState<number>(2024);
  const [meetings, setMeetings] = useState<MeetingInfo[]>([]);
  const [meetingKey, setMeetingKey] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchMeetings(year)
      .then((m) => {
        setMeetings(m);
        setMeetingKey(null);
        setSessions([]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => {
    if (!meetingKey) return;
    setLoading(true);
    fetchSessions(meetingKey)
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [meetingKey]);

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Year */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Season
        </label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-zinc-700 bg-[#1e1e2e] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-red-500"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Meeting */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Grand Prix
        </label>
        <select
          value={meetingKey ?? ''}
          onChange={(e) => setMeetingKey(Number(e.target.value))}
          disabled={meetings.length === 0}
          className="rounded-lg border border-zinc-700 bg-[#1e1e2e] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-red-500 disabled:opacity-50"
        >
          <option value="">Select race...</option>
          {meetings.map((m) => (
            <option key={m.meeting_key} value={m.meeting_key}>
              {m.meeting_name}
            </option>
          ))}
        </select>
      </div>

      {/* Session */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Session
        </label>
        <select
          onChange={(e) => {
            const s = sessions.find((s) => s.session_key === Number(e.target.value));
            if (s) onSessionSelected(s);
          }}
          disabled={sessions.length === 0}
          className="rounded-lg border border-zinc-700 bg-[#1e1e2e] px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-red-500 disabled:opacity-50"
          defaultValue=""
        >
          <option value="">Select session...</option>
          {sessions.map((s) => (
            <option key={s.session_key} value={s.session_key}>
              {s.session_name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-500 border-t-red-500" />
          Loading...
        </div>
      )}
    </div>
  );
}
