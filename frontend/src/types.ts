export interface MeetingInfo {
  meeting_key: number;
  meeting_name: string;
  country_name: string;
  location: string;
  date_start: string;
  date_end: string;
  year: number;
  circuit_short_name?: string;
}

export interface SessionInfo {
  session_key: number;
  session_name: string;
  session_type: string;
  meeting_key: number;
  date_start: string;
  date_end: string;
  country_name?: string;
  circuit_short_name?: string;
}

export interface DriverInfo {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name?: string;
  team_colour?: string;
  headshot_url?: string;
}

export interface LapData {
  lap_number: number;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
  duration_sector_1?: number | null;
  duration_sector_2?: number | null;
  duration_sector_3?: number | null;
  i1_speed?: number | null;
  st_speed?: number | null;
}

export interface StintData {
  stint_number: number;
  compound: string;
  lap_start: number;
  lap_end: number;
  tyre_age_at_start: number;
  driver_number: number;
}

export interface GapEntry {
  date: string;
  interval: number | string | null;
  gap_to_leader: number | string | null;
  driver_number: number;
}

export interface WeatherEntry {
  date: string;
  track_temperature?: number | null;
  air_temperature?: number | null;
  humidity?: number | null;
  rainfall?: number | null;
}

export interface UndercutResult {
  gap: number | null;
  pit_loss: number | null;
  leader_pace: number | null;
  chaser_pace: number | null;
  projected_outlap_pace: number | null;
  pace_delta: number | null;
  undercut_margin: number | null;
  probability: number;
  window_open: boolean;
  leader_compound: string | null;
  chaser_compound: string | null;
  leader_tyre_age: number | null;
  chaser_tyre_age: number | null;
  leader_info: DriverInfo | null;
  chaser_info: DriverInfo | null;
  laps_leader: LapData[];
  laps_chaser: LapData[];
  stints_leader: StintData[];
  stints_chaser: StintData[];
  gap_history: GapEntry[];
  weather: WeatherEntry[];
  at_lap: number | null;
  total_laps: number;
}
