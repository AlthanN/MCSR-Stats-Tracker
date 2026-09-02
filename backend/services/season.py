import time

from services.mcsr_client import request_mcsr

CURRENT_SEASON_FALLBACK = 11
_CACHE_TTL_SECONDS = 3600

_cached_season: int | None = None
_cached_at: float = 0.0


async def get_current_season() -> int:
    """Resolve the active MCSR ranked season, with a cached probe match."""
    global _cached_season, _cached_at

    now = time.time()
    if _cached_season is not None and now - _cached_at < _CACHE_TTL_SECONDS:
        return _cached_season

    try:
        # Omitting season returns matches from the active season.
        resp = await request_mcsr(
            "/users/Feinberg/matches",
            params={"count": 1, "type": 2},
        )
        resp.raise_for_status()
        matches = resp.json().get("data") or []
        if matches and matches[0].get("season") is not None:
            _cached_season = int(matches[0]["season"])
            _cached_at = now
            return _cached_season
    except Exception as e:
        print(f"error resolving current season: {e}")

    return _cached_season or CURRENT_SEASON_FALLBACK


async def resolve_season(season: int | None) -> int:
    if season is None:
        return await get_current_season()
    return season
