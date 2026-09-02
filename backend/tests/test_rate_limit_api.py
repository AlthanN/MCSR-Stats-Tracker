import time
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app
from services.rate_limit import RateLimitTracker
from services.rate_limit import get_request_tracker


class RateLimitApiTests(unittest.TestCase):
    def test_exhausted_preflight_returns_structured_429_without_handler_call(self):
        tracker = RateLimitTracker(remaining=0, reset_at=time.time() + 300)
        with (
            patch("main.load_rate_limit", AsyncMock(return_value=tracker)),
            patch("main.persist_rate_limit", AsyncMock()),
            TestClient(app) as client,
        ):
            response = client.get("/api/meta/current-season")

        self.assertEqual(response.status_code, 429)
        detail = response.json()["detail"]
        self.assertEqual(detail["code"], "mcsr_rate_limit_exceeded")
        self.assertEqual(detail["rateLimit"]["remaining"], 0)
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_status_endpoint_does_not_consume_upstream_budget(self):
        tracker = RateLimitTracker(remaining=245, reset_at=time.time() + 300)
        with (
            patch("main.load_rate_limit", AsyncMock(return_value=tracker)),
            TestClient(app) as client,
        ):
            response = client.get("/api/meta/rate-limit")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["used"], 255)
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_profile_returns_uncacheable_partial_response_when_analysis_exhausts_limit(self):
        tracker = RateLimitTracker(remaining=5, reset_at=time.time() + 300)
        player = {
            "name": "Runner",
            "seasonMatchesInfo": {},
            "allTime": {},
        }
        analytics = {
            "seasonStats": {},
            "checkpoints": {},
            "splits": [],
            "seedTypes": [],
            "recentRuns": [],
            "hasMatchData": True,
            "parsedById": {},
            "analyzedMatchCount": 3,
        }

        async def exhaust_during_analysis(*args, **kwargs):
            active = get_request_tracker()
            active.remaining = 0
            active.reset_at = time.time() + 300
            return analytics

        with (
            patch("main.load_rate_limit", AsyncMock(return_value=tracker)),
            patch("main.persist_rate_limit", AsyncMock()),
            patch("main.get_current_season", AsyncMock(return_value=11)),
            patch("main.fetch_user_data", AsyncMock(return_value={"data": {"uuid": "u"}})),
            patch("main.parse_player_data", return_value=player),
            patch("main.build_analytics", side_effect=exhaust_during_analysis),
            patch("main.build_season_pb_run", AsyncMock(return_value=None)),
            TestClient(app) as client,
        ):
            response = client.get("/api/players/Runner?season=11&count=100")

        self.assertEqual(response.status_code, 206)
        self.assertEqual(response.headers["cache-control"], "no-store")
        meta = response.json()["meta"]
        self.assertTrue(meta["partialData"])
        self.assertEqual(meta["partialReason"], "rate_limit")
        self.assertEqual(meta["analyzedMatchCount"], 3)
        self.assertEqual(meta["requestedMatchCount"], 100)


if __name__ == "__main__":
    unittest.main()
