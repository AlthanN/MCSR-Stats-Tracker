from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from models.player import PlayerData
from models.match import MatchListResponse, MatchDetail
from models.profile import FullProfile, RunDetail
from services.mcsr_client import (
    DEFAULT_MATCH_COUNT,
    MAX_MATCH_COUNT,
    close_client,
    fetch_user_data,
    fetch_match_data,
    fetch_specific_match_data,
    init_client,
)
from services.parsers import parse_player_data, parse_match_list, parse_match_detail
from services.analytics import (
    apply_season_pb_bests,
    build_analytics,
    build_run_detail,
    build_season_pb_run,
)
from services.season import get_current_season, resolve_season


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_client()
    yield
    await close_client()


app = FastAPI(
    title="MCSR Stats API",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    swagger_ui_oauth2_redirect_url="/api/docs/oauth2-redirect",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/meta/current-season")
async def current_season():
    season = await get_current_season()
    return {"currentSeason": season}


@app.get("/api/players/{username}", response_model=FullProfile)
async def get_player_profile(
    username: str,
    match_count: int = Query(DEFAULT_MATCH_COUNT, ge=1, le=MAX_MATCH_COUNT, alias="count"),
    season: int | None = Query(None, ge=0),
):
    current = await get_current_season()
    selected_season = await resolve_season(season)

    raw = await fetch_user_data(username, season=selected_season)
    if raw is None:
        raise HTTPException(status_code=502, detail="Failed to reach MCSR API")
    if not raw.get("data"):
        raise HTTPException(
            status_code=404, detail=f"Player '{username}' not found"
        )

    player_data = parse_player_data(
        raw, selected_season=selected_season, current_season=current
    )
    player_uuid = raw["data"].get("uuid")
    if not player_uuid:
        raise HTTPException(status_code=502, detail="Player UUID missing from MCSR API")

    analytics = await build_analytics(
        username,
        player_uuid,
        match_count=match_count,
        season=selected_season,
    )

    # Season totals come from the MCSR season profile, not the sampled match
    # window. Analytics only fetch the last N matches (default 100).
    season_stats = analytics["seasonStats"]
    season_info = player_data.get("seasonMatchesInfo") or {}
    for key in (
        "bestTime",
        "averageCompletionTime",
        "wins",
        "losses",
        "playedMatches",
        "completions",
        "forfeits",
        "highestWinStreak",
        "currentWinStreak",
    ):
        season_stats[key] = season_info.get(key)

    played = season_stats.get("playedMatches") or 0
    wins = season_stats.get("wins") or 0
    losses = season_stats.get("losses") or 0
    season_stats["draws"] = max(0, played - wins - losses) if played else None

    season_pb = await build_season_pb_run(
        username,
        player_uuid,
        selected_season,
        season_info.get("bestTime"),
        parsed_by_id=analytics.get("parsedById") or {},
    )

    checkpoints = analytics["checkpoints"]
    splits = analytics["splits"]
    official_best = season_info.get("bestTime")
    apply_season_pb_bests(checkpoints, splits, season_pb, official_best)

    return {
        "player": player_data,
        "meta": {
            "currentSeason": current,
            "selectedSeason": selected_season,
            "matchCount": match_count,
        },
        "seasonStats": season_stats,
        "hasMatchData": analytics["hasMatchData"],
        "checkpoints": checkpoints,
        "splits": splits,
        "seedTypes": analytics["seedTypes"],
        "recentRuns": analytics["recentRuns"],
        "checkpointBestFromPb": official_best is not None or season_pb is not None,
    }


@app.get("/api/players/{username}/runs/{run_id}", response_model=RunDetail)
async def get_run_detail(
    username: str,
    run_id: str,
    season: int | None = Query(None, ge=0),
    match_count: int = Query(DEFAULT_MATCH_COUNT, ge=1, le=MAX_MATCH_COUNT, alias="count"),
):
    selected_season = await resolve_season(season)

    raw = await fetch_user_data(username)
    if raw is None:
        raise HTTPException(status_code=502, detail="Failed to reach MCSR API")
    if not raw.get("data"):
        raise HTTPException(
            status_code=404, detail=f"Player '{username}' not found"
        )

    player_uuid = raw["data"].get("uuid")
    if not player_uuid:
        raise HTTPException(status_code=502, detail="Player UUID missing from MCSR API")

    analytics = await build_analytics(
        username,
        player_uuid,
        match_count=match_count,
        season=selected_season,
    )

    detail = await build_run_detail(
        run_id,
        player_uuid,
        split_averages=analytics.get("splitAverages"),
        checkpoint_averages=analytics.get("checkpointAverages"),
    )
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")

    return detail


@app.get("/api/players/{username}/summary", response_model=PlayerData)
async def get_player_summary(username: str):
    """Lightweight player summary without match analytics."""
    raw = await fetch_user_data(username)
    if raw is None:
        raise HTTPException(status_code=502, detail="Failed to reach MCSR API")
    if not raw.get("data"):
        raise HTTPException(
            status_code=404, detail=f"Player '{username}' not found"
        )
    return parse_player_data(raw)


@app.get("/api/players/{username}/matches", response_model=MatchListResponse)
async def get_player_matches(
    username: str,
    count: int = Query(DEFAULT_MATCH_COUNT, ge=1, le=MAX_MATCH_COUNT),
    season: int | None = Query(None, ge=0),
    match_type: int = Query(2, alias="type"),
):
    selected_season = await resolve_season(season)
    raw = await fetch_match_data(
        username, count=count, season=selected_season, match_type=match_type
    )
    if raw is None:
        raise HTTPException(status_code=502, detail="Failed to reach MCSR API")
    if raw.get("data") is None:
        raise HTTPException(
            status_code=404, detail=f"No matches found for '{username}'"
        )
    return parse_match_list(raw)


@app.get("/api/matches/{match_id}", response_model=MatchDetail)
async def get_match(match_id: str):
    raw = await fetch_specific_match_data(match_id)
    if raw is None:
        raise HTTPException(status_code=502, detail="Failed to reach MCSR API")
    if not raw.get("data"):
        raise HTTPException(
            status_code=404, detail=f"Match '{match_id}' not found"
        )
    return parse_match_detail(raw)
