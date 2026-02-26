from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

BASE_URL = "https://api.openf1.org/v1"

# Cached responses: key = URL, value = (timestamp, data)
_cache: dict[str, tuple[float, Any]] = {}

# Historical data lives a long time; live/latest data refreshes fast
_TTL_HISTORICAL = 3600  # 1 hour
_TTL_LIVE = 10  # 10 seconds

_MAX_RETRIES = 3
_BACKOFF_BASE = 1.0

# Concurrency limiter – OpenF1 allows 3 req/s
_semaphore = asyncio.Semaphore(3)


def _ttl_for(url: str) -> int:
    return _TTL_LIVE if "latest" in url else _TTL_HISTORICAL


def _cache_get(url: str) -> Any | None:
    entry = _cache.get(url)
    if entry is None:
        return None
    ts, data = entry
    if time.time() - ts > _ttl_for(url):
        del _cache[url]
        return None
    return data


def _cache_set(url: str, data: Any) -> None:
    _cache[url] = (time.time(), data)


async def _fetch(client: httpx.AsyncClient, url: str) -> Any:
    cached = _cache_get(url)
    if cached is not None:
        return cached

    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        async with _semaphore:
            try:
                resp = await client.get(url, timeout=30)
                if resp.status_code in (429, 503):
                    wait = _BACKOFF_BASE * (2 ** attempt)
                    await asyncio.sleep(wait)
                    continue
                resp.raise_for_status()
                data = resp.json()
                _cache_set(url, data)
                return data
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code < 500 and exc.response.status_code not in (429,):
                    raise
                last_exc = exc
                wait = _BACKOFF_BASE * (2 ** attempt)
                await asyncio.sleep(wait)
            except httpx.RequestError as exc:
                last_exc = exc
                wait = _BACKOFF_BASE * (2 ** attempt)
                await asyncio.sleep(wait)
    raise last_exc or RuntimeError(f"Failed to fetch {url}")


class OpenF1Client:
    """Async wrapper around the OpenF1 REST API."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(base_url=BASE_URL)

    async def close(self) -> None:
        await self._client.aclose()

    # --- low-level ---------------------------------------------------------

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> list[dict]:
        url = str(self._client.build_request("GET", path, params=params).url)
        return await _fetch(self._client, url)

    # --- endpoints ---------------------------------------------------------

    async def get_meetings(self, **params: Any) -> list[dict]:
        return await self._get("/meetings", params or None)

    async def get_sessions(self, **params: Any) -> list[dict]:
        return await self._get("/sessions", params or None)

    async def get_drivers(self, **params: Any) -> list[dict]:
        return await self._get("/drivers", params or None)

    async def get_intervals(self, **params: Any) -> list[dict]:
        return await self._get("/intervals", params or None)

    async def get_pit(self, **params: Any) -> list[dict]:
        return await self._get("/pit", params or None)

    async def get_laps(self, **params: Any) -> list[dict]:
        return await self._get("/laps", params or None)

    async def get_stints(self, **params: Any) -> list[dict]:
        return await self._get("/stints", params or None)

    async def get_weather(self, **params: Any) -> list[dict]:
        return await self._get("/weather", params or None)

    async def get_position(self, **params: Any) -> list[dict]:
        return await self._get("/position", params or None)
