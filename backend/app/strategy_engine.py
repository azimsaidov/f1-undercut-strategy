from __future__ import annotations

import asyncio
import statistics
from typing import Any

import pandas as pd

from .models import (
    DriverInfo,
    GapEntry,
    LapData,
    StintData,
    UndercutResult,
    WeatherEntry,
)
from .openf1_client import OpenF1Client

UNDERCUT_WINDOW_THRESHOLD = 1.5  # seconds
OUTLIER_FACTOR = 1.2
# How many laps the undercut advantage plays out over before the leader responds
RESPONSE_LAPS = 2


async def calculate_mean_pit_loss(
    client: OpenF1Client, session_key: int, at_lap: int | None = None
) -> float | None:
    """Average lane_duration for the session, optionally only pits up to at_lap."""
    pits = await client.get_pit(session_key=session_key)
    if at_lap is not None:
        pits_filtered = [p for p in pits if p.get("lap_number") is not None and p["lap_number"] <= at_lap]
        if pits_filtered:
            pits = pits_filtered
    durations = [p["lane_duration"] for p in pits if p.get("lane_duration") is not None]
    if not durations:
        return None
    return statistics.mean(durations)


async def get_clean_laps(
    client: OpenF1Client,
    session_key: int,
    driver_number: int,
    up_to_lap: int | None = None,
) -> pd.DataFrame:
    """Fetch laps for a driver with pit-out and outlier laps removed."""
    raw = await client.get_laps(session_key=session_key, driver_number=driver_number)
    if not raw:
        return pd.DataFrame()
    df = pd.DataFrame(raw)
    if up_to_lap is not None:
        df = df[df["lap_number"] <= up_to_lap]
    df = df[df["lap_duration"].notna()]
    df = df[df["is_pit_out_lap"] != True]  # noqa: E712

    if not df.empty:
        mean_dur = df["lap_duration"].mean()
        df = df[df["lap_duration"] <= OUTLIER_FACTOR * mean_dur]
    return df


async def get_driver_race_pace(
    client: OpenF1Client,
    session_key: int,
    driver_number: int,
    last_n: int = 3,
    up_to_lap: int | None = None,
) -> float | None:
    """Mean of the driver's last N clean laps (up to a given lap)."""
    df = await get_clean_laps(client, session_key, driver_number, up_to_lap=up_to_lap)
    if df.empty:
        return None
    tail = df.sort_values("lap_number").tail(last_n)
    return float(tail["lap_duration"].mean())


async def get_fresh_tyre_pace(
    client: OpenF1Client,
    session_key: int,
    driver_number: int,
    compound: str | None,
) -> float | None:
    """Estimate the driver's own pace on fresh tyres for a compound.

    Uses the driver's first 3 clean racing laps of their current stint
    (when the tyres were newest).  This is compared against their current
    degraded pace to measure how much time fresh rubber is worth.
    Falls back to field data for the compound if the driver has no stint data.
    """
    all_laps_raw = await client.get_laps(
        session_key=session_key, driver_number=driver_number
    )
    stints_raw = await client.get_stints(session_key=session_key)
    if not all_laps_raw or not stints_raw:
        return None

    laps_df = pd.DataFrame(all_laps_raw)
    stints_df = pd.DataFrame(stints_raw)

    driver_stints = stints_df[stints_df["driver_number"] == driver_number]
    if compound:
        compound_stints = driver_stints[
            driver_stints["compound"].str.upper() == compound.upper()
        ]
        if not compound_stints.empty:
            driver_stints = compound_stints

    if driver_stints.empty:
        return await _field_fresh_pace(client, session_key, compound)

    # Collect the first 3 clean racing laps of each stint
    fresh_times: list[float] = []
    for _, stint in driver_stints.iterrows():
        lap_start = stint["lap_start"]
        early_laps = laps_df[
            (laps_df["lap_number"] >= lap_start)
            & (laps_df["lap_number"] <= lap_start + 3)
            & (laps_df["is_pit_out_lap"] != True)  # noqa: E712
            & (laps_df["lap_duration"].notna())
        ]
        fresh_times.extend(early_laps["lap_duration"].tolist())

    if not fresh_times:
        return await _field_fresh_pace(client, session_key, compound)

    mean_t = statistics.mean(fresh_times)
    filtered = [t for t in fresh_times if t <= OUTLIER_FACTOR * mean_t]
    return statistics.mean(filtered) if filtered else mean_t


async def _field_fresh_pace(
    client: OpenF1Client, session_key: int, compound: str | None,
) -> float | None:
    """Fallback: field-wide fresh-tyre pace for a compound."""
    all_laps_raw = await client.get_laps(session_key=session_key)
    stints_raw = await client.get_stints(session_key=session_key)
    if not all_laps_raw or not stints_raw:
        return None

    laps_df = pd.DataFrame(all_laps_raw)
    stints_df = pd.DataFrame(stints_raw)
    if compound:
        stints_df = stints_df[stints_df["compound"].str.upper() == compound.upper()]

    fresh_times: list[float] = []
    for _, stint in stints_df.iterrows():
        dn = stint["driver_number"]
        lap_start = stint["lap_start"]
        early = laps_df[
            (laps_df["driver_number"] == dn)
            & (laps_df["lap_number"] >= lap_start)
            & (laps_df["lap_number"] <= lap_start + 3)
            & (laps_df["is_pit_out_lap"] != True)  # noqa: E712
            & (laps_df["lap_duration"].notna())
        ]
        fresh_times.extend(early["lap_duration"].tolist())

    if not fresh_times:
        return None
    mean_t = statistics.mean(fresh_times)
    filtered = [t for t in fresh_times if t <= OUTLIER_FACTOR * mean_t]
    return statistics.mean(filtered) if filtered else mean_t


async def _get_gap_at_lap(
    client: OpenF1Client,
    session_key: int,
    chaser_number: int,
    leader_number: int,
    at_lap: int,
    all_laps_leader: list[dict],
    all_laps_chaser: list[dict],
    gap_history_raw: list[dict],
) -> float | None:
    """Find the interval between two drivers at a specific lap."""
    chaser_lap = next(
        (l for l in all_laps_chaser if l.get("lap_number") == at_lap and l.get("date_start")),
        None,
    )
    if chaser_lap and chaser_lap.get("date_start"):
        target_ts = chaser_lap["date_start"]
        best: dict | None = None
        best_diff = float("inf")
        for entry in gap_history_raw:
            if entry.get("date") and isinstance(entry.get("interval"), (int, float)):
                diff = abs(_ts_diff(entry["date"], target_ts))
                if diff < best_diff:
                    best_diff = diff
                    best = entry
        if best is not None and isinstance(best.get("interval"), (int, float)):
            return float(best["interval"])

    for entry in reversed(gap_history_raw):
        val = entry.get("interval")
        if isinstance(val, (int, float)):
            return float(val)
    return None


def _ts_diff(a: str, b: str) -> float:
    """Approximate seconds difference between two ISO timestamps."""
    from datetime import datetime
    try:
        ta = datetime.fromisoformat(a.replace("Z", "+00:00"))
        tb = datetime.fromisoformat(b.replace("Z", "+00:00"))
        return (ta - tb).total_seconds()
    except Exception:
        return float("inf")


async def get_current_gap(
    client: OpenF1Client, session_key: int, driver_number: int
) -> float | None:
    """Latest interval value for the driver."""
    intervals = await client.get_intervals(
        session_key=session_key, driver_number=driver_number
    )
    if not intervals:
        return None
    for entry in reversed(intervals):
        val = entry.get("interval")
        if isinstance(val, (int, float)):
            return float(val)
    return None


async def get_gap_history(
    client: OpenF1Client, session_key: int, driver_number: int
) -> list[dict]:
    return await client.get_intervals(
        session_key=session_key, driver_number=driver_number
    )


def _stint_at_lap(stints: list[dict], driver_number: int, at_lap: int | None) -> dict | None:
    driver_stints = [s for s in stints if s.get("driver_number") == driver_number]
    if not driver_stints:
        return None
    if at_lap is None:
        return max(driver_stints, key=lambda s: s.get("stint_number", 0))
    for s in sorted(driver_stints, key=lambda s: s.get("stint_number", 0)):
        if s.get("lap_start", 0) <= at_lap <= s.get("lap_end", 999):
            return s
    return max(driver_stints, key=lambda s: s.get("stint_number", 0))


def _probability_from_margin(margin: float | None) -> float:
    """Map undercut margin (seconds) to a 0-100 probability.

    Scale: margin >= +3.0s  -> 100 %  (slam dunk)
           margin == 0       -> 50 %  (coin flip — mathematically even)
           margin <= -3.0s  -> 0 %   (impossible)
    """
    if margin is None:
        return 0.0
    clamped = max(-3.0, min(3.0, margin))
    return round((clamped + 3.0) / 6.0 * 100, 1)


def _tyre_age_at_lap(stint: dict | None, at_lap: int | None) -> int | None:
    if stint is None:
        return None
    base_age = stint.get("tyre_age_at_start", 0)
    if at_lap is None:
        return base_age
    laps_into_stint = at_lap - stint.get("lap_start", 0)
    return base_age + max(0, laps_into_stint)


async def get_pit_stop_advantage(
    client: OpenF1Client, session_key: int, compound: str | None,
) -> float | None:
    """Measure the real fresh-tyre advantage by comparing driver pace
    before and after actual pit stops in this session.

    For each pit stop:
      - pre_pace  = mean of last 3 clean laps BEFORE the stop (degraded tyres)
      - post_pace = mean of first 3 clean laps AFTER the stop (fresh tyres)
      - advantage = pre_pace - post_pace  (positive = fresh is faster)

    Returns the average advantage across all stops (optionally filtered by
    the new compound).  This naturally accounts for fuel burn since the laps
    are only a few apart.
    """
    all_laps = await client.get_laps(session_key=session_key)
    stints_raw = await client.get_stints(session_key=session_key)
    if not all_laps or not stints_raw:
        return None

    laps_df = pd.DataFrame(all_laps)
    stints_df = pd.DataFrame(stints_raw)

    # Only look at stints after the first (i.e. after a pit stop)
    new_stints = stints_df[stints_df["stint_number"] > 1].copy()
    if compound:
        filtered = new_stints[new_stints["compound"].str.upper() == compound.upper()]
        if not filtered.empty:
            new_stints = filtered

    advantages: list[float] = []
    for _, stint in new_stints.iterrows():
        dn = stint["driver_number"]
        pit_lap = stint["lap_start"]  # the out-lap number

        driver_laps = laps_df[
            (laps_df["driver_number"] == dn)
            & (laps_df["lap_duration"].notna())
            & (laps_df["is_pit_out_lap"] != True)  # noqa: E712
        ].sort_values("lap_number")

        # Pre-stop: last 3 clean laps before the pit
        pre = driver_laps[driver_laps["lap_number"] < pit_lap].tail(3)
        # Post-stop: first 3 clean laps after the out-lap
        post = driver_laps[driver_laps["lap_number"] > pit_lap].head(3)

        if pre.empty or post.empty:
            continue

        pre_mean = pre["lap_duration"].mean()
        post_mean = post["lap_duration"].mean()

        # Sanity filter: ignore if either mean is an outlier
        all_mean = laps_df[laps_df["lap_duration"].notna()]["lap_duration"].mean()
        if pre_mean > OUTLIER_FACTOR * all_mean or post_mean > OUTLIER_FACTOR * all_mean:
            continue

        advantages.append(pre_mean - post_mean)

    if not advantages:
        return None

    return statistics.mean(advantages)


async def evaluate_undercut(
    client: OpenF1Client,
    session_key: int,
    leader_number: int,
    chaser_number: int,
    at_lap: int | None = None,
) -> UndercutResult:
    """Full undercut evaluation.

    The undercut equation over RESPONSE_LAPS:
      total_gain = RESPONSE_LAPS * (leader_degraded_pace - fresh_tyre_pace)
      undercut_margin = total_gain - pit_loss - gap
      Success ⟺ undercut_margin > 0
    """

    (
        pit_loss,
        leader_pace,
        chaser_pace,
        gap_history_raw,
        stints_raw,
        weather_raw,
        leader_all_laps_raw,
        chaser_all_laps_raw,
        drivers_raw,
    ) = await asyncio.gather(
        calculate_mean_pit_loss(client, session_key, at_lap=at_lap),
        get_driver_race_pace(client, session_key, leader_number, up_to_lap=at_lap),
        get_driver_race_pace(client, session_key, chaser_number, up_to_lap=at_lap),
        get_gap_history(client, session_key, chaser_number),
        client.get_stints(session_key=session_key),
        client.get_weather(session_key=session_key),
        client.get_laps(session_key=session_key, driver_number=leader_number),
        client.get_laps(session_key=session_key, driver_number=chaser_number),
        client.get_drivers(session_key=session_key),
    )

    all_lap_numbers = [
        l.get("lap_number", 0)
        for l in leader_all_laps_raw + chaser_all_laps_raw
        if l.get("lap_number")
    ]
    total_laps = max(all_lap_numbers) if all_lap_numbers else 0

    # Gap
    if at_lap is not None:
        gap = await _get_gap_at_lap(
            client, session_key, chaser_number, leader_number,
            at_lap, leader_all_laps_raw, chaser_all_laps_raw, gap_history_raw,
        )
    else:
        gap = None
        for entry in reversed(gap_history_raw):
            val = entry.get("interval")
            if isinstance(val, (int, float)):
                gap = float(val)
                break

    # Stints
    leader_stint = _stint_at_lap(stints_raw, leader_number, at_lap)
    chaser_stint = _stint_at_lap(stints_raw, chaser_number, at_lap)
    chaser_compound = chaser_stint["compound"] if chaser_stint else None

    # Fresh-tyre advantage: measured from actual pit stops in this session.
    # This is the per-lap gain a driver gets from fresh vs degraded tyres.
    tyre_advantage = await get_pit_stop_advantage(client, session_key, chaser_compound)
    fresh_pace = (leader_pace - tyre_advantage) if (leader_pace and tyre_advantage) else None

    # Pace delta per lap: how much the chaser gains per lap on fresh rubber
    pace_delta = tyre_advantage  # positive = fresh tyres are faster per lap

    # Undercut margin over the response window.
    # Both drivers make the same pit stop so pit_loss cancels out.
    # The chaser gains pace_delta per lap for the N laps before the
    # leader responds and pits themselves.
    # margin = RESPONSE_LAPS * pace_delta - gap
    undercut_margin: float | None = None
    if pace_delta is not None and gap is not None:
        total_gain = RESPONSE_LAPS * pace_delta
        undercut_margin = total_gain - gap

    probability = _probability_from_margin(undercut_margin)
    window_open = gap is not None and gap < UNDERCUT_WINDOW_THRESHOLD

    def _to_lap_data(raw: list[dict]) -> list[LapData]:
        out: list[LapData] = []
        for r in raw:
            if r.get("lap_number") is None:
                continue
            out.append(
                LapData(
                    lap_number=r["lap_number"],
                    lap_duration=r.get("lap_duration"),
                    is_pit_out_lap=r.get("is_pit_out_lap", False),
                    duration_sector_1=r.get("duration_sector_1"),
                    duration_sector_2=r.get("duration_sector_2"),
                    duration_sector_3=r.get("duration_sector_3"),
                    i1_speed=r.get("i1_speed"),
                    st_speed=r.get("st_speed"),
                )
            )
        return sorted(out, key=lambda l: l.lap_number)

    def _to_stint_data(raw: list[dict], dn: int) -> list[StintData]:
        return [
            StintData(
                stint_number=s["stint_number"],
                compound=s["compound"],
                lap_start=s["lap_start"],
                lap_end=s["lap_end"],
                tyre_age_at_start=s.get("tyre_age_at_start", 0),
                driver_number=s["driver_number"],
            )
            for s in raw
            if s.get("driver_number") == dn
        ]

    def _driver_info(raw: list[dict], dn: int) -> DriverInfo | None:
        for d in raw:
            if d.get("driver_number") == dn:
                return DriverInfo(
                    driver_number=d["driver_number"],
                    full_name=d.get("full_name", ""),
                    name_acronym=d.get("name_acronym", ""),
                    team_name=d.get("team_name"),
                    team_colour=d.get("team_colour"),
                    headshot_url=d.get("headshot_url"),
                )
        return None

    gap_history = [
        GapEntry(
            date=g["date"],
            interval=g.get("interval"),
            gap_to_leader=g.get("gap_to_leader"),
            driver_number=g["driver_number"],
        )
        for g in gap_history_raw
        if g.get("date")
    ]

    weather = [
        WeatherEntry(
            date=w["date"],
            track_temperature=w.get("track_temperature"),
            air_temperature=w.get("air_temperature"),
            humidity=w.get("humidity"),
            rainfall=w.get("rainfall"),
        )
        for w in weather_raw
        if w.get("date")
    ]

    return UndercutResult(
        gap=gap,
        pit_loss=pit_loss,
        leader_pace=leader_pace,
        chaser_pace=chaser_pace,
        projected_outlap_pace=fresh_pace,
        pace_delta=pace_delta,
        undercut_margin=undercut_margin,
        probability=probability,
        window_open=window_open,
        leader_compound=leader_stint["compound"] if leader_stint else None,
        chaser_compound=chaser_compound,
        leader_tyre_age=_tyre_age_at_lap(leader_stint, at_lap),
        chaser_tyre_age=_tyre_age_at_lap(chaser_stint, at_lap),
        leader_info=_driver_info(drivers_raw, leader_number),
        chaser_info=_driver_info(drivers_raw, chaser_number),
        laps_leader=_to_lap_data(leader_all_laps_raw),
        laps_chaser=_to_lap_data(chaser_all_laps_raw),
        stints_leader=_to_stint_data(stints_raw, leader_number),
        stints_chaser=_to_stint_data(stints_raw, chaser_number),
        gap_history=gap_history,
        weather=weather,
        at_lap=at_lap,
        total_laps=total_laps,
    )
