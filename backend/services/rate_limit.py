import json
import os
import re
import time
from contextvars import ContextVar
from dataclasses import dataclass
from datetime import datetime, timezone


DEFAULT_LIMIT = 500
DEFAULT_WINDOW_SECONDS = 600
REDIS_KEY = "mcsr:rate-limit:global"
_HEADER_VALUE = re.compile(r"(?:^|;)\s*([qrtw])=(\d+)")


@dataclass
class RateLimitTracker:
    limit: int = DEFAULT_LIMIT
    remaining: int = DEFAULT_LIMIT
    window_seconds: int = DEFAULT_WINDOW_SECONDS
    reset_at: float | None = None
    observed_at: float | None = None
    estimated: bool = True
    attempted: int = 0

    @property
    def exhausted(self) -> bool:
        return self.remaining <= 0 and bool(
            self.reset_at and self.reset_at > time.time()
        )

    def refresh_if_expired(self) -> None:
        if self.reset_at is not None and self.reset_at <= time.time():
            self.remaining = self.limit
            self.reset_at = None
            self.observed_at = None
            self.estimated = True
            self.attempted = 0

    def note_attempt(self) -> None:
        self.refresh_if_expired()
        self.attempted += 1
        if self.estimated:
            self.remaining = max(0, self.remaining - 1)
            now = time.time()
            self.observed_at = now
            self.reset_at = self.reset_at or now + self.window_seconds

    def observe_headers(self, headers) -> None:
        rate = _parse_pairs(headers.get("ratelimit", ""))
        policy = _parse_pairs(headers.get("ratelimit-policy", ""))
        if "r" not in rate:
            return

        now = time.time()
        limit = policy.get("q", self.limit)
        window = policy.get("w", self.window_seconds)
        reset_at = float(int(now + rate.get("t", window)))
        remaining = max(0, min(limit, rate["r"]))

        same_window = self.reset_at is not None and abs(self.reset_at - reset_at) <= 5
        if same_window:
            remaining = min(self.remaining, remaining)

        self.limit = limit
        self.remaining = remaining
        self.window_seconds = window
        self.reset_at = reset_at
        self.observed_at = now
        self.estimated = False

    def to_dict(self) -> dict:
        self.refresh_if_expired()
        used = max(0, self.limit - self.remaining)
        return {
            "limit": self.limit,
            "used": used,
            "remaining": self.remaining,
            "windowSeconds": self.window_seconds,
            "resetAt": _iso(self.reset_at),
            "observedAt": _iso(self.observed_at),
            "exhausted": self.exhausted,
            "estimated": self.estimated,
        }

    @classmethod
    def from_dict(cls, data: dict | None) -> "RateLimitTracker":
        if not data:
            return cls()
        tracker = cls(
            limit=int(data.get("limit") or DEFAULT_LIMIT),
            remaining=int(data.get("remaining", DEFAULT_LIMIT)),
            window_seconds=int(data.get("windowSeconds") or DEFAULT_WINDOW_SECONDS),
            reset_at=_timestamp(data.get("resetAt")),
            observed_at=_timestamp(data.get("observedAt")),
            estimated=bool(data.get("estimated", True)),
        )
        tracker.refresh_if_expired()
        return tracker


def _parse_pairs(value: str) -> dict[str, int]:
    return {key: int(number) for key, number in _HEADER_VALUE.findall(value)}


def _iso(value: float | None) -> str | None:
    if value is None:
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()


def _timestamp(value: str | None) -> float | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return None


_tracker_var: ContextVar[RateLimitTracker | None] = ContextVar(
    "mcsr_rate_limit_tracker", default=None
)
_memory_state: dict | None = None
_redis = None


def get_request_tracker() -> RateLimitTracker:
    tracker = _tracker_var.get()
    if tracker is None:
        tracker = RateLimitTracker()
        _tracker_var.set(tracker)
    return tracker


def set_request_tracker(tracker: RateLimitTracker):
    return _tracker_var.set(tracker)


def reset_request_tracker(token) -> None:
    _tracker_var.reset(token)


def _redis_client():
    global _redis
    if _redis is not None:
        return _redis
    if not (
        os.getenv("UPSTASH_REDIS_REST_URL")
        and os.getenv("UPSTASH_REDIS_REST_TOKEN")
    ):
        return None
    try:
        from upstash_redis.asyncio import Redis

        _redis = Redis.from_env()
    except Exception as exc:
        print(f"error initializing rate-limit store: {exc}")
        return None
    return _redis


async def load_rate_limit() -> RateLimitTracker:
    global _memory_state
    client = _redis_client()
    if client is not None:
        try:
            raw = await client.get(REDIS_KEY)
            if isinstance(raw, str):
                return RateLimitTracker.from_dict(json.loads(raw))
            if isinstance(raw, dict):
                return RateLimitTracker.from_dict(raw)
        except Exception as exc:
            print(f"error reading rate-limit store: {exc}")
    return RateLimitTracker.from_dict(_memory_state)


async def persist_rate_limit(tracker: RateLimitTracker) -> None:
    global _memory_state
    status = tracker.to_dict()
    _memory_state = status
    client = _redis_client()
    if client is None:
        return

    ttl = max(60, int((tracker.reset_at or time.time() + 60) - time.time()) + 60)
    try:
        # A request only lowers the remaining count within a window. The Lua
        # merge prevents a slower concurrent request from increasing it again.
        stored_status = {**status, "_resetEpoch": int(tracker.reset_at or 0)}
        script = """
        local current = redis.call('GET', KEYS[1])
        local incoming = cjson.decode(ARGV[1])
        if current then
          local old = cjson.decode(current)
          local oldReset = old._resetEpoch or 0
          local newReset = incoming._resetEpoch or 0
          if math.abs(oldReset - newReset) <= 5 and old.remaining < incoming.remaining then
            incoming.remaining = old.remaining
            incoming.used = incoming.limit - incoming.remaining
          end
        end
        redis.call('SET', KEYS[1], cjson.encode(incoming), 'EX', ARGV[2])
        return cjson.encode(incoming)
        """
        await client.eval(
            script, keys=[REDIS_KEY], args=[json.dumps(stored_status), str(ttl)]
        )
    except Exception as exc:
        print(f"error writing rate-limit store: {exc}")
        try:
            await client.set(REDIS_KEY, json.dumps(status), ex=ttl)
        except Exception as fallback_exc:
            print(f"error writing fallback rate-limit state: {fallback_exc}")


def rate_limit_error_detail(tracker: RateLimitTracker) -> dict:
    return {
        "code": "mcsr_rate_limit_exceeded",
        "message": "The shared MCSR API limit has been reached.",
        "rateLimit": tracker.to_dict(),
    }
