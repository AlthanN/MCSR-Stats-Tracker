import asyncio
import time

import httpx

from services.rate_limit import get_request_tracker, maybe_publish_rate_limit

BASE_URL = "https://mcsrranked.com/api"
DEFAULT_MATCH_COUNT = 100
MAX_MATCH_COUNT = 500
MCSR_PAGE_SIZE = 100
MAX_CONCURRENT_MATCH_FETCHES = 10

_client: httpx.AsyncClient | None = None
_match_fetch_sem: asyncio.Semaphore | None = None


class MCSRRateLimitBlocked(Exception):
    """Raised when the last observed MCSR bucket is still exhausted."""


def init_client() -> None:
    """Create the shared HTTP client and match-fetch semaphore."""
    global _client, _match_fetch_sem
    if _client is not None:
        return

    limits = httpx.Limits(max_connections=20, max_keepalive_connections=20)
    _client = httpx.AsyncClient(
        base_url=BASE_URL,
        timeout=httpx.Timeout(30.0),
        limits=limits,
    )
    _match_fetch_sem = asyncio.Semaphore(MAX_CONCURRENT_MATCH_FETCHES)


async def close_client() -> None:
    """Close the shared HTTP client on app shutdown."""
    global _client, _match_fetch_sem
    if _client is not None:
        await _client.aclose()
    _client = None
    _match_fetch_sem = None


def _ensure_client() -> httpx.AsyncClient:
    """Lazy-init for scripts/tests outside the FastAPI lifespan."""
    if _client is None:
        init_client()
    return _client


async def request_mcsr(path: str, *, params: dict | None = None) -> httpx.Response:
    """Make one tracked upstream request and capture authoritative quota headers."""
    tracker = get_request_tracker()
    tracker.refresh_if_expired()
    if tracker.exhausted:
        raise MCSRRateLimitBlocked()

    tracker.note_attempt()
    response = await _ensure_client().get(path, params=params)
    tracker.observe_headers(response.headers)
    if response.status_code == 429:
        tracker.remaining = 0
        tracker.reset_at = tracker.reset_at or (time.time() + tracker.window_seconds)
    await maybe_publish_rate_limit(tracker)
    return response


async def fetch_user_data(
    username: str, season: int | None = None
) -> dict | None:
    """Raw player profile payload from MCSR."""
    params: dict = {}
    if season is not None:
        params["season"] = season
    try:
        resp = await request_mcsr(f"/users/{username}", params=params or None)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as e:
        print(f"error fetching user data for {username}: {e}")
        return None


async def fetch_match_data(
    username: str,
    count: int = DEFAULT_MATCH_COUNT,
    season: int = 11,
    match_type: int = 2,
    sort: str = "newest",
    exclude_decay: bool = False,
) -> dict | None:
    """Fetch up to `count` matches, paginating in batches of 100."""
    target = min(max(count, 1), MAX_MATCH_COUNT)
    all_matches: list[dict] = []
    before: int | None = None

    while len(all_matches) < target:
        batch_size = min(MCSR_PAGE_SIZE, target - len(all_matches))
        params: dict = {
            "count": batch_size,
            "season": season,
            "type": match_type,
            "sort": sort,
        }
        if exclude_decay:
            params["excludedecay"] = "true"
        if before is not None:
            params["before"] = before

        try:
            resp = await request_mcsr(f"/users/{username}/matches", params=params)
            resp.raise_for_status()
            batch = resp.json().get("data") or []
        except MCSRRateLimitBlocked:
            if not all_matches:
                raise
            break
        except httpx.HTTPError as e:
            print(f"error fetching matches for {username}: {e}")
            if not all_matches:
                return None
            break

        if not batch:
            break

        all_matches.extend(batch)
        if len(batch) < batch_size:
            break

        before = batch[-1]["id"]

    return {"data": all_matches[:target]}


async def fetch_match_page(
    username: str,
    *,
    season: int,
    match_type: int = 2,
    sort: str = "newest",
    count: int = MCSR_PAGE_SIZE,
    before: int | None = None,
    exclude_decay: bool = False,
) -> list[dict]:
    """Fetch a single page of matches. Empty list on error."""
    params: dict = {
        "count": min(max(count, 1), MCSR_PAGE_SIZE),
        "season": season,
        "type": match_type,
        "sort": sort,
    }
    if exclude_decay:
        params["excludedecay"] = "true"
    if before is not None:
        params["before"] = before

    try:
        resp = await request_mcsr(f"/users/{username}/matches", params=params)
        resp.raise_for_status()
        return resp.json().get("data") or []
    except MCSRRateLimitBlocked:
        return []
    except httpx.HTTPError as e:
        print(f"error fetching match page for {username}: {e}")
        return []


async def fetch_specific_match_data(match_id: str) -> dict | None:
    """Raw single-match payload, including full timeline."""
    sem = _match_fetch_sem
    try:
        if sem is not None:
            async with sem:
                resp = await request_mcsr(f"/matches/{match_id}")
        else:
            resp = await request_mcsr(f"/matches/{match_id}")
        resp.raise_for_status()
        return resp.json()
    except MCSRRateLimitBlocked:
        return None
    except httpx.HTTPError as e:
        print(f"error fetching match {match_id}: {e}")
        return None
