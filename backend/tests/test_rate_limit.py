import time
import unittest

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


if __name__ == "__main__":
    unittest.main()
