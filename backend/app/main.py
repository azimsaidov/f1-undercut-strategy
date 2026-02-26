from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .models import DriverInfo, MeetingInfo, SessionInfo, UndercutResult
from .openf1_client import OpenF1Client
from . import session_manager, strategy_engine

client: OpenF1Client


@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    client = OpenF1Client()
    yield
    await client.close()


app = FastAPI(title="F1 Undercut Strategy Simulator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Meetings / Sessions / Drivers ----------------------------------------

@app.get("/api/meetings", response_model=list[MeetingInfo])
async def meetings(year: int = Query(...)):
    raw = await session_manager.list_meetings(client, year)
    return [
        MeetingInfo(
            meeting_key=m["meeting_key"],
            meeting_name=m.get("meeting_name", ""),
            country_name=m.get("country_name", ""),
            location=m.get("location", ""),
            date_start=m.get("date_start", ""),
            date_end=m.get("date_end", ""),
            year=m.get("year", year),
            circuit_short_name=m.get("circuit_short_name"),
        )
        for m in raw
    ]


@app.get("/api/sessions", response_model=list[SessionInfo])
async def sessions(meeting_key: int = Query(...)):
    raw = await session_manager.list_sessions(client, meeting_key)
    return [
        SessionInfo(
            session_key=s["session_key"],
            session_name=s.get("session_name", ""),
            session_type=s.get("session_type", ""),
            meeting_key=s.get("meeting_key", meeting_key),
            date_start=s.get("date_start", ""),
            date_end=s.get("date_end", ""),
            country_name=s.get("country_name"),
            circuit_short_name=s.get("circuit_short_name"),
        )
        for s in raw
    ]


@app.get("/api/drivers", response_model=list[DriverInfo])
async def drivers(session_key: int = Query(...)):
    raw = await session_manager.list_drivers(client, session_key)
    return [
        DriverInfo(
            driver_number=d["driver_number"],
            full_name=d.get("full_name", ""),
            name_acronym=d.get("name_acronym", ""),
            team_name=d.get("team_name"),
            team_colour=d.get("team_colour"),
            headshot_url=d.get("headshot_url"),
        )
        for d in raw
    ]


# ---- Strategy endpoints ---------------------------------------------------

@app.get("/api/strategy/evaluate", response_model=UndercutResult)
async def evaluate(
    session_key: int = Query(...),
    leader: int = Query(...),
    chaser: int = Query(...),
    lap: int | None = Query(None, description="Evaluate at this specific lap (historical scrub)"),
):
    try:
        return await strategy_engine.evaluate_undercut(
            client, session_key, leader, chaser, at_lap=lap
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.get("/api/strategy/gaps")
async def gaps(session_key: int = Query(...), driver_number: int = Query(...)):
    raw = await strategy_engine.get_gap_history(client, session_key, driver_number)
    return raw


@app.get("/api/strategy/laps")
async def laps(session_key: int = Query(...), driver_number: int = Query(...)):
    df = await strategy_engine.get_clean_laps(client, session_key, driver_number)
    if df.empty:
        return []
    return df.to_dict(orient="records")


@app.get("/api/strategy/stints")
async def stints(
    session_key: int = Query(...), driver_number: int = Query(None)
):
    params: dict[str, Any] = {"session_key": session_key}
    if driver_number is not None:
        params["driver_number"] = driver_number
    return await client.get_stints(**params)


@app.get("/api/weather")
async def weather(session_key: int = Query(...)):
    return await client.get_weather(session_key=session_key)


@app.get("/api/positions")
async def positions(
    session_key: int = Query(...),
    lap: int | None = Query(None, description="Get positions at this lap"),
):
    """Return each driver's position.

    When lap is provided, finds the closest position snapshot to that lap's
    timestamp.  Otherwise returns the latest position for each driver.
    """
    import asyncio

    pos_raw, laps_raw, drivers_raw = await asyncio.gather(
        client.get_position(session_key=session_key),
        client.get_laps(session_key=session_key),
        client.get_drivers(session_key=session_key),
    )

    if not pos_raw:
        return []

    # Build a driver_number -> latest-position map
    if lap is not None and laps_raw:
        from datetime import datetime

        # Find approximate timestamp for the target lap
        lap_entries = [l for l in laps_raw if l.get("lap_number") == lap and l.get("date_start")]
        if lap_entries:
            target_ts = lap_entries[0]["date_start"]
            try:
                target_dt = datetime.fromisoformat(target_ts.replace("Z", "+00:00"))
            except Exception:
                target_dt = None

            if target_dt:
                # For each driver, find position entry closest to target_dt
                from collections import defaultdict
                by_driver: dict[int, list] = defaultdict(list)
                for p in pos_raw:
                    if p.get("driver_number") and p.get("date"):
                        by_driver[p["driver_number"]].append(p)

                result = {}
                for dn, entries in by_driver.items():
                    best = min(
                        entries,
                        key=lambda e: abs(
                            (datetime.fromisoformat(e["date"].replace("Z", "+00:00")) - target_dt).total_seconds()
                        ),
                    )
                    result[dn] = best.get("position")

                return [
                    {"driver_number": dn, "position": pos}
                    for dn, pos in sorted(result.items(), key=lambda x: x[1] or 99)
                ]

    # Fallback: latest position per driver
    latest: dict[int, int] = {}
    for p in pos_raw:
        dn = p.get("driver_number")
        pos = p.get("position")
        if dn is not None and pos is not None:
            latest[dn] = pos

    return [
        {"driver_number": dn, "position": pos}
        for dn, pos in sorted(latest.items(), key=lambda x: x[1])
    ]
