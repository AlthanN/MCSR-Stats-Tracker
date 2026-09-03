import time
import unittest
from unittest.mock import AsyncMock, patch

import services.rate_limit as rate_limit
from services.rate_limit import RateLimitTracker


class RateLimitTrackerTests(unittest.TestCase):
    def test_parses_authoritative_headers(self):
        tracker = RateLimitTracker()
        tracker.observe_headers(
            {
                "ratelimit-policy": '"500-in-10min"; q=500; w=600',
                "ratelimit": '"500-in-10min"; r=245; t=372',
            }
        )

        status = tracker.to_dict()
        self.assertEqual(status["limit"], 500)
        self.assertEqual(status["remaining"], 245)
        self.assertEqual(status["used"], 255)
        self.assertEqual(status["windowSeconds"], 600)
        self.assertFalse(status["estimated"])
        self.assertFalse(status["exhausted"])

    def test_keeps_lowest_remaining_value_in_same_window(self):
        tracker = RateLimitTracker()
        tracker.observe_headers(
            {"ratelimit-policy": "q=500; w=600", "ratelimit": "r=10; t=300"}
        )
        tracker.observe_headers(
            {"ratelimit-policy": "q=500; w=600", "ratelimit": "r=12; t=300"}
        )
        self.assertEqual(tracker.remaining, 10)

    def test_exhaustion_and_reset(self):
        tracker = RateLimitTracker(remaining=0, reset_at=time.time() + 30)
        self.assertTrue(tracker.exhausted)

        tracker.reset_at = time.time() - 1
        tracker.refresh_if_expired()
        self.assertFalse(tracker.exhausted)
        self.assertEqual(tracker.remaining, tracker.limit)

    def test_missing_headers_uses_estimated_attempts(self):
        tracker = RateLimitTracker()
        tracker.note_attempt()
        self.assertEqual(tracker.to_dict()["used"], 1)
        self.assertTrue(tracker.estimated)


class RateLimitActivityTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        rate_limit._memory_active.clear()

    async def asyncTearDown(self):
        rate_limit._memory_active.clear()

    async def test_operation_is_visible_until_finished(self):
        tracker = RateLimitTracker()
        with patch("services.rate_limit._redis_client", return_value=None):
            await rate_limit.begin_rate_limit_operation(tracker)
            self.assertEqual(await rate_limit.active_operation_count(), 1)

            await rate_limit.finish_rate_limit_operation(tracker)
            self.assertEqual(await rate_limit.active_operation_count(), 0)

    async def test_expired_operation_lease_is_removed(self):
        rate_limit._memory_active["stale"] = time.time() - 1
        with patch("services.rate_limit._redis_client", return_value=None):
            self.assertEqual(await rate_limit.active_operation_count(), 0)
        self.assertNotIn("stale", rate_limit._memory_active)

    async def test_status_reports_updating_while_operation_is_active(self):
        tracker = RateLimitTracker(remaining=245, estimated=False)
        rate_limit._memory_active["active"] = time.time() + 30
        with (
            patch(
                "services.rate_limit.load_rate_limit",
                AsyncMock(return_value=tracker),
            ),
            patch("services.rate_limit._redis_client", return_value=None),
        ):
            status = await rate_limit.get_rate_limit_status()

        self.assertEqual(status["syncState"], "updating")
        self.assertEqual(status["activeOperations"], 1)

    async def test_publish_is_throttled_between_progress_updates(self):
        tracker = RateLimitTracker(operation_id="operation", attempted=1)
        with (
            patch(
                "services.rate_limit.persist_rate_limit", new_callable=AsyncMock
            ) as persist,
            patch(
                "services.rate_limit._renew_operation", new_callable=AsyncMock
            ),
        ):
            self.assertTrue(await rate_limit.maybe_publish_rate_limit(tracker))
            self.assertFalse(await rate_limit.maybe_publish_rate_limit(tracker))
            tracker.attempted += rate_limit.PUBLISH_EVERY_ATTEMPTS
            self.assertTrue(await rate_limit.maybe_publish_rate_limit(tracker))

        self.assertEqual(persist.await_count, 2)


if __name__ == "__main__":
    unittest.main()
