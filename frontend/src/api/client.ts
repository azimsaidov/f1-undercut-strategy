import type { MeetingInfo, SessionInfo, DriverInfo, UndercutResult } from '../types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export function fetchMeetings(year: number) {
  return get<MeetingInfo[]>(`/meetings?year=${year}`);
}

export function fetchSessions(meetingKey: number) {
  return get<SessionInfo[]>(`/sessions?meeting_key=${meetingKey}`);
}

export function fetchDrivers(sessionKey: number) {
  return get<DriverInfo[]>(`/drivers?session_key=${sessionKey}`);
}

export interface PositionEntry {
  driver_number: number;
  position: number;
}

export function fetchPositions(sessionKey: number, lap?: number) {
  let url = `/positions?session_key=${sessionKey}`;
  if (lap != null) url += `&lap=${lap}`;
  return get<PositionEntry[]>(url);
}

export function fetchEvaluation(sessionKey: number, leader: number, chaser: number, lap?: number) {
  let url = `/strategy/evaluate?session_key=${sessionKey}&leader=${leader}&chaser=${chaser}`;
  if (lap != null) url += `&lap=${lap}`;
  return get<UndercutResult>(url);
}
