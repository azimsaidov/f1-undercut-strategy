from __future__ import annotations
from pydantic import BaseModel


class MeetingInfo(BaseModel):
    meeting_key: int
    meeting_name: str
    country_name: str
    location: str
    date_start: str
    date_end: str
    year: int
    circuit_short_name: str | None = None


class SessionInfo(BaseModel):
    session_key: int
    session_name: str
    session_type: str
    meeting_key: int
    date_start: str
    date_end: str
    country_name: str | None = None
    circuit_short_name: str | None = None


class DriverInfo(BaseModel):
    driver_number: int
    full_name: str
    name_acronym: str
    team_name: str | None = None
    team_colour: str | None = None
    headshot_url: str | None = None


class LapData(BaseModel):
    lap_number: int
    lap_duration: float | None = None
    is_pit_out_lap: bool = False
    duration_sector_1: float | None = None
    duration_sector_2: float | None = None
    duration_sector_3: float | None = None
    i1_speed: int | None = None
    st_speed: int | None = None


class StintData(BaseModel):
    stint_number: int
    compound: str
    lap_start: int
    lap_end: int
    tyre_age_at_start: int
    driver_number: int


class GapEntry(BaseModel):
    date: str
    interval: float | str | None = None
    gap_to_leader: float | str | None = None
    driver_number: int


class WeatherEntry(BaseModel):
    date: str
    track_temperature: float | None = None
    air_temperature: float | None = None
    humidity: float | None = None
    rainfall: float | None = None


class UndercutResult(BaseModel):
    gap: float | None = None
    pit_loss: float | None = None
    leader_pace: float | None = None
    chaser_pace: float | None = None
    projected_outlap_pace: float | None = None
    pace_delta: float | None = None
    undercut_margin: float | None = None
    probability: float
    window_open: bool
    leader_compound: str | None = None
    chaser_compound: str | None = None
    leader_tyre_age: int | None = None
    chaser_tyre_age: int | None = None
    leader_info: DriverInfo | None = None
    chaser_info: DriverInfo | None = None
    laps_leader: list[LapData] = []
    laps_chaser: list[LapData] = []
    stints_leader: list[StintData] = []
    stints_chaser: list[StintData] = []
    gap_history: list[GapEntry] = []
    weather: list[WeatherEntry] = []
    at_lap: int | None = None
    total_laps: int = 0
