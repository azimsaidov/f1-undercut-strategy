from __future__ import annotations

from .openf1_client import OpenF1Client


async def list_meetings(client: OpenF1Client, year: int) -> list[dict]:
    return await client.get_meetings(year=year)


async def list_sessions(client: OpenF1Client, meeting_key: int) -> list[dict]:
    return await client.get_sessions(meeting_key=meeting_key)


async def find_session(
    client: OpenF1Client,
    year: int,
    country_name: str,
    session_name: str = "Race",
) -> dict | None:
    """Resolve a session_key from year + country + session type."""
    meetings = await client.get_meetings(year=year, country_name=country_name)
    if not meetings:
        return None
    meeting = meetings[0]
    sessions = await client.get_sessions(
        meeting_key=meeting["meeting_key"], session_name=session_name
    )
    if not sessions:
        return None
    session = sessions[0]
    session["country_name"] = meeting.get("country_name")
    session["circuit_short_name"] = meeting.get("circuit_short_name")
    return session


async def get_latest_session(client: OpenF1Client) -> dict | None:
    sessions = await client.get_sessions(session_key="latest")
    return sessions[0] if sessions else None


async def list_drivers(client: OpenF1Client, session_key: int) -> list[dict]:
    return await client.get_drivers(session_key=session_key)
