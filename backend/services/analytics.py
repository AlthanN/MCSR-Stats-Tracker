import asyncio
import statistics
from collections import defaultdict
from datetime import datetime, timezone

from services.mcsr_client import DEFAULT_MATCH_COUNT, fetch_match_data, fetch_specific_match_data
from services.parsers import parse_match_detail

CHECKPOINT_KEYS = [
    "netherEnter",
    "bastion",
    "fortress",
    "blindTravel",
    "strongholdEnter",
    "finish",
]

CHECKPOINT_EVENT_TYPES: dict[str, set[str]] = {
    "netherEnter": {"story.enter_the_nether"},
    "bastion": {"nether.find_bastion"},
    "fortress": {"nether.find_fortress"},
    "blindTravel": {"projectelo.timeline.blind_travel"},
    "strongholdEnter": {"story.follow_ender_eye"},
    "finish": {"projectelo.timeline.dragon_death"},
}

CHECKPOINT_LABELS: dict[str, str] = {
    "netherEnter": "Nether Enter",
    "bastion": "First Structure (Bastion)",
    "fortress": "Second Structure (Fortress)",
    "blindTravel": "Blind Travel",
    "strongholdEnter": "Stronghold Enter",
    "finish": "Finish",
}

SPLIT_LABELS: dict[str, str] = {
    "nether.find_bastion": "Find Bastion",
    "nether.find_fortress": "Find Fortress",
    "story.enter_the_nether": "Enter Nether",
    "nether.obtain_blaze_rod": "Obtain Blaze Rod",
    "projectelo.timeline.blind_travel": "Blind Travel",
    "story.follow_ender_eye": "Found Stronghold",
    "story.enter_the_end": "Enter End",
    "projectelo.timeline.dragon_death": "Dragon Death",
    "projectelo.timeline.death": "Death",
    "projectelo.timeline.reset": "Reset",
    "projectelo.timeline.forfeit": "Forfeit",
}

SPLIT_EVENT_TYPES = {
    "story.enter_the_nether",
    "story.follow_ender_eye",
    "story.enter_the_end",
    "nether.find_bastion",
    "nether.find_fortress",
    "nether.obtain_blaze_rod",
    "projectelo.timeline.blind_travel",
    "projectelo.timeline.dragon_death",
}

STATUS_EVENT_TYPES = {
    "projectelo.timeline.death",
    "projectelo.timeline.reset",
    "projectelo.timeline.forfeit",
}

STATUS_LABELS: dict[str, str] = {
    "projectelo.timeline.death": "Death",
    "projectelo.timeline.reset": "Reset",
    "projectelo.timeline.forfeit": "Forfeit",
}

SPLIT_ORDER = [
    "story.enter_the_nether",
    "nether.find_bastion",
    "nether.find_fortress",
    "nether.obtain_blaze_rod",
    "projectelo.timeline.blind_travel",
    "story.follow_ender_eye",
    "story.enter_the_end",
    "projectelo.timeline.dragon_death",
]


def _coefficient_of_variation(values: list[float]) -> float | None:
    if len(values) < 2:
        return None
    mean = statistics.mean(values)
    if mean == 0:
        return None
    return statistics.stdev(values) / mean


def _aggregate(values: list[float]) -> dict:
    if not values:
        return {
            "average": None,
            "best": None,
            "worst": None,
            "consistency": None,
        }
    return {
        "average": statistics.mean(values),
        "best": min(values),
        "worst": max(values),
        "consistency": _coefficient_of_variation(values),
    }


def _player_events(timeline: list[dict], player_uuid: str) -> list[dict]:
    return [
        e
        for e in timeline
        if e.get("uuid") == player_uuid and e.get("time") is not None
    ]


def _extract_checkpoint_times(events: list[dict]) -> dict[str, float | None]:
    times: dict[str, float | None] = {}
    for key in CHECKPOINT_KEYS:
        types = CHECKPOINT_EVENT_TYPES[key]
        matching = [float(e["time"]) for e in events if e.get("type") in types]
        times[key] = min(matching) if matching else None
    return times


def _extract_split_times(events: list[dict]) -> dict[str, float]:
    """Earliest time per progression split for a single run."""
    splits: dict[str, float] = {}
    for event in events:
        event_type = event.get("type")
        if event_type not in SPLIT_EVENT_TYPES:
            continue
        time_val = event.get("time")
        if time_val is None:
            continue
        time_f = float(time_val)
        if event_type not in splits or time_f < splits[event_type]:
            splits[event_type] = time_f
    return splits


def _player_forfeited(timeline: list[dict], player_uuid: str) -> bool:
    return any(
        e.get("type") == "projectelo.timeline.forfeit"
        and e.get("uuid") == player_uuid
        for e in timeline
    )


def _determine_result(
    timeline: list[dict], player_uuid: str, forfeited: bool | None = None
) -> str:
    if _player_forfeited(timeline, player_uuid):
        return "forfeit"
    player_types = {
        e.get("type") for e in timeline if e.get("uuid") == player_uuid
    }
    if "projectelo.timeline.reset" in player_types:
        return "reset"
    dragon = [
        e["time"]
        for e in timeline
        if e.get("uuid") == player_uuid
        and e.get("type") == "projectelo.timeline.dragon_death"
    ]
    if dragon:
        return "completed"
    return "reset"


def _match_duration(timeline: list[dict], result: dict | None) -> int | None:
    """How long the ranked match took — winner finish time from API or timeline."""
    if result and result.get("time"):
        return int(result["time"])
    dragons = [
        int(e["time"])
        for e in timeline
        if e.get("type") == "projectelo.timeline.dragon_death"
        and e.get("time") is not None
    ]
    return min(dragons) if dragons else None


def _finish_time(
    events: list[dict], result: dict | None, player_uuid: str
) -> int | None:
    """Searched player's personal finish time (dragon death or win result)."""
    dragon = [
        e["time"]
        for e in events
        if e.get("type") == "projectelo.timeline.dragon_death"
    ]
    if dragon:
        return int(min(dragon))
    if result and result.get("uuid") == player_uuid and result.get("time"):
        return int(result["time"])
    return None


def _opponent_name(players: list[dict], player_uuid: str) -> str | None:
    for p in players:
        if p.get("uuid") != player_uuid:
            return p.get("nickname")
    return None


def _opponent_uuid(players: list[dict], player_uuid: str) -> str | None:
    for p in players:
        if p.get("uuid") != player_uuid:
            return p.get("uuid")
    return None


def _player_name(players: list[dict], player_uuid: str) -> str | None:
    for p in players:
        if p.get("uuid") == player_uuid:
            return p.get("nickname")
    return None


def _winner_name(result: dict | None, players: list[dict]) -> str | None:
    if not result or not result.get("uuid"):
        return None
    return _player_name(players, result["uuid"])


def _is_official_draw(result_obj: dict | None) -> bool:
    """MCSR ranked draw — API sets result.uuid to null."""
    return bool(result_obj is not None and result_obj.get("uuid") is None)


def _is_decay_match(match: dict) -> bool:
    """Synthetic inactivity entry — not a real ranked match."""
    return bool(match.get("decayed"))


def _player_elo_change(match: dict, player_uuid: str) -> int | None:
    for change in match.get("changes") or []:
        if change.get("uuid") == player_uuid and change.get("change") is not None:
            return int(change["change"])
    return None


def _match_won(
    match: dict, player_uuid: str, forfeit_by_id: dict[str, bool]
) -> bool:
    match_id = str(match.get("id"))
    if forfeit_by_id.get(match_id, False):
        return False
    result = match.get("result")
    return bool(result and result.get("uuid") == player_uuid)


def _first_split_times(events: list[dict]) -> dict[str, int]:
    times: dict[str, int] = {}
    for event in sorted(events, key=lambda e: e.get("time") or 0):
        event_type = event.get("type")
        if event_type not in SPLIT_EVENT_TYPES:
            continue
        time_val = event.get("time")
        if time_val is None or event_type in times:
            continue
        times[event_type] = int(time_val)
    return times


def _extract_match_events(
    timeline: list[dict], players: list[dict]
) -> list[dict]:
    events = []
    for event in sorted(timeline, key=lambda e: e.get("time") or 0):
        event_type = event.get("type")
        if event_type not in STATUS_EVENT_TYPES:
            continue
        time_val = event.get("time")
        uuid = event.get("uuid")
        if time_val is None or not uuid:
            continue
        kind = event_type.rsplit(".", 1)[-1]
        name = _player_name(players, uuid) or "Unknown"
        events.append(
            {
                "kind": kind,
                "label": STATUS_LABELS.get(event_type, kind.title()),
                "playerName": name,
                "timeMs": int(time_val),
            }
        )
    return events


def _build_dual_splits(
    timeline: list[dict],
    player_uuid: str,
    players: list[dict],
    split_averages: dict[str, float] | None,
) -> list[dict]:
    opponent_uuid = _opponent_uuid(players, player_uuid)
    player_events = _player_events(timeline, player_uuid)
    opponent_events = (
        _player_events(timeline, opponent_uuid) if opponent_uuid else []
    )
    player_splits = _first_split_times(player_events)
    opponent_splits = _first_split_times(opponent_events)

    splits = []
    for event_type in SPLIT_ORDER:
        player_time = player_splits.get(event_type)
        opponent_time = opponent_splits.get(event_type)
        if player_time is None and opponent_time is None:
            continue

        label = SPLIT_LABELS.get(event_type, event_type)
        avg = split_averages.get(label) if split_averages else None
        delta = (
            (float(player_time) - avg)
            if player_time is not None and avg is not None
            else None
        )
        splits.append(
            {
                "checkpoint": event_type,
                "label": label,
                "kind": "split",
                "playerTimeMs": player_time,
                "opponentTimeMs": opponent_time,
                "timeMs": player_time,
                "deltaVsAverageMs": delta,
            }
        )
    return splits


def _iso_date(unix_ts: int | None) -> str:
    if unix_ts is None:
        return datetime.now(timezone.utc).isoformat()
    return datetime.fromtimestamp(unix_ts, tz=timezone.utc).isoformat()


class ParsedRun:
    __slots__ = (
        "match_id",
        "date",
        "result",
        "opponent",
        "seed_type",
        "finish_time",
        "match_duration",
        "checkpoint_times",
        "split_times",
        "won",
        "winner_name",
        "player_forfeited",
        "is_draw",
    )

    def __init__(
        self,
        match_id: str,
        date: int | None,
        result: str,
        opponent: str | None,
        seed_type: str | None,
        finish_time: int | None,
        match_duration: int | None,
        checkpoint_times: dict[str, float | None],
        split_times: dict[str, float],
        won: bool,
        winner_name: str | None,
        player_forfeited: bool,
        is_draw: bool,
    ):
        self.match_id = match_id
        self.date = date
        self.result = result
        self.opponent = opponent
        self.seed_type = seed_type
        self.finish_time = finish_time
        self.match_duration = match_duration
        self.checkpoint_times = checkpoint_times
        self.split_times = split_times
        self.won = won
        self.winner_name = winner_name
        self.player_forfeited = player_forfeited
        self.is_draw = is_draw


async def _fetch_and_parse_run(
    match_id: str | int,
    player_uuid: str,
    seed_type: str | None,
    forfeited: bool | None,
) -> ParsedRun | None:
    raw = await fetch_specific_match_data(str(match_id))
    if raw is None or not raw.get("data"):
        return None

    detail = parse_match_detail(raw)
    match_data = raw["data"]
    timeline = detail["timeline"]
    events = _player_events(timeline, player_uuid)
    result_obj = detail.get("result") or match_data.get("result")
    player_ff = _player_forfeited(timeline, player_uuid)
    run_result = _determine_result(timeline, player_uuid)
    finish = _finish_time(events, result_obj, player_uuid)
    duration = _match_duration(timeline, result_obj)
    players = detail.get("players", [])

    return ParsedRun(
        match_id=str(match_id),
        date=detail.get("date") or match_data.get("date"),
        result=run_result,
        opponent=_opponent_name(players, player_uuid),
        seed_type=seed_type,
        finish_time=finish,
        match_duration=duration,
        checkpoint_times=_extract_checkpoint_times(events),
        split_times=_extract_split_times(events),
        won=bool(result_obj and result_obj.get("uuid") == player_uuid),
        winner_name=_winner_name(result_obj, players),
        player_forfeited=player_ff,
        is_draw=_is_official_draw(result_obj),
    )


def _compute_win_streaks_from_matches(
    matches_data: list[dict],
    player_uuid: str,
    forfeit_by_id: dict[str, bool],
) -> tuple[int | None, int | None]:
    """Return (highest_win_streak, current_win_streak) from season match list."""
    if not matches_data:
        return None, None

    ordered = sorted(
        matches_data, key=lambda m: m.get("date") or 0, reverse=True
    )

    current = 0
    for match in ordered:
        if _is_decay_match(match):
            break
        if _match_won(match, player_uuid, forfeit_by_id):
            current += 1
        else:
            break

    highest = 0
    streak = 0
    for match in sorted(matches_data, key=lambda m: m.get("date") or 0):
        if _is_decay_match(match):
            streak = 0
            continue
        if _match_won(match, player_uuid, forfeit_by_id):
            streak += 1
            highest = max(highest, streak)
        else:
            streak = 0

    return highest or None, current or None


def _count_match_outcomes(
    matches_data: list[dict],
    player_uuid: str,
    forfeit_by_id: dict[str, bool],
) -> tuple[int, int, int]:
    """Count wins, losses, and player forfeits from the season match list."""
    wins = losses = forfeits = 0
    for match in matches_data:
        if _is_decay_match(match):
            continue
        match_id = str(match.get("id"))
        player_ff = forfeit_by_id.get(match_id, False)
        if player_ff:
            forfeits += 1
            losses += 1
            continue

        result = match.get("result")
        if result and result.get("uuid") == player_uuid:
            wins += 1
        elif _is_official_draw(result):
            continue
        else:
            # Opponent won, or result missing — ranked loss, not a draw.
            losses += 1

    return wins, losses, forfeits


def _is_loss(run) -> bool:
    """Loss = not a win, not a player forfeit, and not an official draw."""
    return not run.won and not run.player_forfeited and not run.is_draw


def _compute_season_stats(
    matches_data: list[dict],
    player_uuid: str,
    forfeit_by_id: dict[str, bool],
    runs: list,
) -> dict:
    """Aggregate season stats from the match list plus parsed run details."""
    if not matches_data:
        return {
            "bestTime": None,
            "averageCompletionTime": None,
            "wins": None,
            "losses": None,
            "draws": None,
            "playedMatches": 0,
            "completions": None,
            "forfeits": None,
            "highestWinStreak": None,
            "currentWinStreak": None,
        }

    wins, losses, forfeits = _count_match_outcomes(
        matches_data, player_uuid, forfeit_by_id
    )
    played = len(matches_data)
    decays = sum(1 for m in matches_data if _is_decay_match(m))
    draws = played - wins - losses - decays
    completions = sum(1 for r in runs if r.result == "completed")
    finish_times = [
        r.finish_time for r in runs if r.result == "completed" and r.finish_time
    ]
    highest_streak, current_streak = _compute_win_streaks_from_matches(
        matches_data, player_uuid, forfeit_by_id
    )

    return {
        "bestTime": min(finish_times) if finish_times else None,
        "averageCompletionTime": (
            statistics.mean(finish_times) if finish_times else None
        ),
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "playedMatches": played,
        "completions": completions,
        "forfeits": forfeits,
        "highestWinStreak": highest_streak,
        "currentWinStreak": current_streak,
    }


def _empty_analytics() -> dict:
    return {
        "checkpoints": {k: _aggregate([]) for k in CHECKPOINT_KEYS},
        "splits": [],
        "seedTypes": [],
        "recentRuns": [],
        "seasonStats": _compute_season_stats([], "", {}, []),
        "hasMatchData": False,
        "splitAverages": {},
        "checkpointAverages": {},
    }


async def build_analytics(
    username: str,
    player_uuid: str,
    match_count: int = DEFAULT_MATCH_COUNT,
    season: int = 11,
) -> dict:
    """Aggregate checkpoints, splits, seed performance, and recent runs."""
    raw_matches = await fetch_match_data(
        username, count=match_count, season=season, match_type=2
    )
    if raw_matches is None or raw_matches.get("data") is None:
        return _empty_analytics()

    matches_data = raw_matches["data"]
    if not matches_data:
        return _empty_analytics()
    tasks = [
        _fetch_and_parse_run(
            m.get("id"),
            player_uuid,
            m.get("seedType"),
            m.get("forfeited"),
        )
        for m in matches_data
        if m.get("id") is not None and not _is_decay_match(m)
    ]
    results = await asyncio.gather(*tasks)
    runs = [r for r in results if r is not None]
    parsed_by_id = {r.match_id: r for r in runs}
    forfeit_by_id = {r.match_id: r.player_forfeited for r in runs}

    # Checkpoint aggregation across completed runs only.
    checkpoint_values: dict[str, list[float]] = defaultdict(list)
    split_values: dict[str, list[float]] = defaultdict(list)

    for run in runs:
        if run.result != "completed":
            continue
        for key, time_val in run.checkpoint_times.items():
            if time_val is not None:
                checkpoint_values[key].append(time_val)
        for split_type, time_val in run.split_times.items():
            split_values[split_type].append(time_val)

    checkpoints = {
        key: _aggregate(checkpoint_values.get(key, [])) for key in CHECKPOINT_KEYS
    }

    splits = []
    for split_type in sorted(
        split_values.keys(),
        key=lambda t: (
            SPLIT_ORDER.index(t) if t in SPLIT_ORDER else len(SPLIT_ORDER)
        ),
    ):
        stats = _aggregate(split_values[split_type])
        splits.append(
            {
                "splitName": SPLIT_LABELS.get(split_type, split_type),
                "average": stats["average"],
                "best": stats["best"],
                "worst": stats["worst"],
                "consistency": stats["consistency"],
            }
        )

    seed_types = _compute_seed_performance(runs)

    recent_runs = []
    for match in matches_data:
        match_id = match.get("id")
        if match_id is None:
            continue
        mid = str(match_id)

        if _is_decay_match(match):
            recent_runs.append(
                {
                    "id": mid,
                    "date": _iso_date(match.get("date")),
                    "finalTimeMs": None,
                    "result": "decay",
                    "opponent": None,
                    "seedType": None,
                    "won": False,
                    "winnerName": None,
                    "isDraw": False,
                    "isDecay": True,
                    "eloChange": _player_elo_change(match, player_uuid),
                }
            )
            continue

        run = parsed_by_id.get(mid)
        if run is None:
            continue
        recent_runs.append(
            {
                "id": run.match_id,
                "date": _iso_date(run.date),
                "finalTimeMs": run.match_duration,
                "result": run.result,
                "opponent": run.opponent,
                "seedType": run.seed_type,
                "won": run.won,
                "winnerName": run.winner_name,
                "isDraw": run.is_draw,
                "isDecay": False,
                "eloChange": None,
            }
        )
    recent_runs.sort(key=lambda r: r["date"], reverse=True)

    return {
        "checkpoints": checkpoints,
        "splits": splits,
        "seedTypes": seed_types,
        "recentRuns": recent_runs,
        "seasonStats": _compute_season_stats(
            matches_data, player_uuid, forfeit_by_id, runs
        ),
        "hasMatchData": True,
        "splitAverages": {
            SPLIT_LABELS.get(k, k): statistics.mean(v)
            for k, v in split_values.items()
            if v
        },
        "checkpointAverages": {
            CHECKPOINT_LABELS[k]: statistics.mean(v)
            for k, v in checkpoint_values.items()
            if v
        },
    }


def _compute_seed_performance(runs: list[ParsedRun]) -> list[dict]:
    seed_runs: dict[str, list[ParsedRun]] = defaultdict(list)
    for run in runs:
        if run.seed_type:
            seed_runs[run.seed_type].append(run)

    if not seed_runs:
        return []

    completed = [r for r in runs if r.result == "completed" and r.finish_time]
    baseline_times = [
        r.finish_time for r in completed if r.finish_time is not None
    ]
    global_avg = statistics.mean(baseline_times) if baseline_times else None

    results = []
    for seed_type, seed_run_list in sorted(
        seed_runs.items(), key=lambda x: len(x[1]), reverse=True
    ):
        finish_times = [
            r.finish_time
            for r in seed_run_list
            if r.result == "completed" and r.finish_time is not None
        ]
        other_times = [
            r.finish_time
            for r in completed
            if r.seed_type != seed_type and r.finish_time is not None
        ]

        avg_impact = None
        if finish_times and other_times:
            avg_impact = statistics.mean(finish_times) - statistics.mean(other_times)
        elif finish_times and global_avg is not None:
            avg_impact = statistics.mean(finish_times) - global_avg

        wins = sum(1 for r in seed_run_list if r.won)
        losses = sum(1 for r in seed_run_list if _is_loss(r))
        decisive = wins + losses
        win_rate = wins / decisive if decisive > 0 else None

        results.append(
            {
                "seedType": seed_type,
                "runsEncountered": len(seed_run_list),
                "avgImpactMs": avg_impact,
                "winRate": win_rate,
            }
        )

    return results


async def build_run_detail(
    match_id: str,
    player_uuid: str,
    split_averages: dict[str, float] | None = None,
    checkpoint_averages: dict[str, float] | None = None,
) -> dict | None:
    raw = await fetch_specific_match_data(match_id)
    if raw is None or not raw.get("data"):
        return None

    detail = parse_match_detail(raw)
    match_data = raw["data"]
    timeline = detail["timeline"]
    players = detail.get("players", [])
    events = _player_events(timeline, player_uuid)
    result_obj = detail.get("result") or match_data.get("result")
    run_result = _determine_result(
        timeline, player_uuid
    )
    finish = _finish_time(events, result_obj, player_uuid)
    opponent_uuid = _opponent_uuid(players, player_uuid)
    opponent_events = (
        _player_events(timeline, opponent_uuid) if opponent_uuid else []
    )
    opponent_finish = (
        _finish_time(opponent_events, result_obj, opponent_uuid or "")
        if opponent_uuid
        else None
    )
    won = bool(result_obj and result_obj.get("uuid") == player_uuid)
    winner = _winner_name(result_obj, players)

    splits = _build_dual_splits(timeline, player_uuid, players, split_averages)
    events_list = _extract_match_events(timeline, players)

    return {
        "id": str(match_id),
        "date": _iso_date(detail.get("date") or match_data.get("date")),
        "finalTimeMs": finish,
        "result": run_result,
        "opponent": _opponent_name(players, player_uuid),
        "seedType": match_data.get("seedType"),
        "won": won,
        "winnerName": winner,
        "playerName": _player_name(players, player_uuid),
        "opponentFinishTimeMs": opponent_finish,
        "splits": splits,
        "events": events_list,
    }
