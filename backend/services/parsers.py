from collections import Counter


def parse_player_data(
    raw: dict,
    *,
    selected_season: int | None = None,
    current_season: int | None = None,
) -> dict:
    """raw = full JSON from GET /users/{username}"""
    player_data = raw.get("data", {})
    season_stats = player_data.get("statistics", {}).get("season", {})
    total_stats = player_data.get("statistics", {}).get("total", {})
    season_result = player_data.get("seasonResult") or {}
    last_result = season_result.get("last") or {}

    completion_time = season_stats.get("completionTime", {}).get("ranked", 0)
    completions = season_stats.get("completions", {}).get("ranked", 0)
    avg_completion_time = (
        (completion_time / completions) if completions > 0 else None
    )

    total_completion_time = total_stats.get("completionTime", {}).get("ranked", 0)
    total_completions = total_stats.get("completions", {}).get("ranked", 0)
    total_avg_completion_time = (
        (total_completion_time / total_completions)
        if total_completions > 0
        else None
    )

    timestamp = player_data.get("timestamp", {})

    live_elo = player_data.get("eloRate")
    if (
        selected_season is not None
        and current_season is not None
        and selected_season == current_season
    ):
        season_elo = live_elo
    else:
        season_elo = last_result.get("eloRate")

    return {
        "name": player_data.get("nickname"),
        "country": player_data.get("country"),
        "highestElo": season_result.get("highest"),
        "currentElo": live_elo,
        "seasonElo": season_elo,
        "playTime": total_stats.get("playtime", {}).get("ranked"),
        "seasonMatchesInfo": {
            "bestTime": season_stats.get("bestTime", {}).get("ranked"),
            "averageCompletionTime": avg_completion_time,
            "highestWinStreak": season_stats.get("highestWinStreak", {}).get(
                "ranked"
            ),
            "currentWinStreak": season_stats.get("currentWinStreak", {}).get(
                "ranked"
            ),
            "forfeits": season_stats.get("forfeits", {}).get("ranked"),
            "wins": season_stats.get("wins", {}).get("ranked"),
            "losses": season_stats.get("loses", {}).get("ranked"),
            "playedMatches": season_stats.get("playedMatches", {}).get("ranked"),
            "completions": season_stats.get("completions", {}).get("ranked"),
        },
        "allTime": {
            "wins": total_stats.get("wins", {}).get("ranked"),
            "losses": total_stats.get("loses", {}).get("ranked"),
            "playTime": total_stats.get("playtime", {}).get("ranked"),
            "forfeits": total_stats.get("forfeits", {}).get("ranked"),
            "bestTime": total_stats.get("bestTime", {}).get("ranked"),
            "completions": total_stats.get("completions", {}).get("ranked"),
            "playedMatches": total_stats.get("playedMatches", {}).get("ranked"),
            "averageCompletionTime": total_avg_completion_time,
            "highestWinStreak": total_stats.get("highestWinStreak", {}).get(
                "ranked"
            ),
        },
        "firstOnline": timestamp.get("firstOnline"),
        "lastOnline": timestamp.get("lastOnline"),
    }


def _parse_player_ref(player: dict) -> dict:
    return {
        "country": player.get("country"),
        "eloRate": player.get("eloRate"),
        "nickname": player.get("nickname"),
        "uuid": player.get("uuid"),
    }


def parse_match_list(raw: dict) -> dict:
    """raw = full JSON from GET /users/{username}/matches

    Fixed vs. original: bastion/seed counts are returned as their own
    keys instead of being appended onto the same list as match dicts,
    so consumers don't have to guess which list items are matches vs.
    summary dicts.
    """
    matches_data = raw.get("data", [])

    matches = []
    bastion_counts: Counter[str] = Counter()
    seed_counts: Counter[str] = Counter()

    for match in matches_data:
        bastion_type = match.get("bastionType")
        seed_type = match.get("seedType")

        # Only count real values - a missing/None bastion or seed type
        # (e.g. a match that never reached the nether) shouldn't get
        # counted as its own category.
        if bastion_type:
            bastion_counts[bastion_type] += 1
        if seed_type:
            seed_counts[seed_type] += 1

        matches.append(
            {
                "id": match.get("id"),
                "bastionType": bastion_type,
                "seedType": seed_type,
                "forfeited": match.get("forfeited"),
                "players": [
                    _parse_player_ref(p) for p in match.get("players", [])
                ],
            }
        )

    return {
        "matches": matches,
        "bastionCounts": dict(bastion_counts),
        "seedCounts": dict(seed_counts),
    }


# Timeline event types we care about for split analysis.
TARGET_TIMELINE_TYPES = {
    "story.enter_the_nether",
    "story.follow_ender_eye",
    "story.enter_the_end",
    "nether.find_bastion",
    "nether.find_fortress",
    "nether.obtain_blaze_rod",
    "projectelo.timeline.blind_travel",
    "projectelo.timeline.death",
    "projectelo.timeline.dragon_death",
    "projectelo.timeline.reset",
    "projectelo.timeline.forfeit",
}


def parse_match_detail(raw: dict) -> dict:
    """raw = full JSON from GET /matches/{match_id}"""
    match = raw.get("data", {})

    timeline = [
        {
            "type": event.get("type"),
            "time": event.get("time"),
            "uuid": event.get("uuid"),
        }
        for event in match.get("timelines", [])
        if event.get("type") in TARGET_TIMELINE_TYPES
    ]
    # API serves newest-to-oldest; re-sort earliest-to-latest for display.
    timeline.sort(key=lambda e: e["time"] or 0)

    return {
        "id": match.get("id"),
        "date": match.get("date"),
        "result": match.get("result"),
        "players": [_parse_player_ref(p) for p in match.get("players", [])],
        "timeline": timeline,
    }
