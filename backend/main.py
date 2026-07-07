from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from models.player import PlayerData
from models.match import MatchListResponse, MatchDetail
from models.profile import FullProfile, RunDetail, TrendingPlayer
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
from services.analytics import build_analytics, build_run_detail
from services.trending import get_trending, record_lookup
from services.season import get_current_season, resolve_season


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_client()
    yield
    await close_client()


app = FastAPI(title="MCSR Stats API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/meta/current-season")
async def current_season():
    season = await get_current_season()
    return {"currentSeason": season}


@app.get("/players/trending", response_model=list[TrendingPlayer])
async def trending_players():
    return get_trending()


@app.get("/players/{username}", response_model=FullProfile)
async def get_player_profile(
    username: str,
    match_count: int = Query(DEFAULT_MATCH_COUNT, ge=1, le=MAX_MATCH_COUNT, alias="count"),
    season: int | None = Query(None, ge=0),
):
    current = await get_current_season()
    selected_season = await resolve_season(season)

    raw = await fetch_user_data(username)
    if raw is None:
        raise HTTPException(status_code=502, detail="Failed to reach MCSR API")
    if not raw.get("data"):
        raise HTTPException(
            status_code=404, detail=f"Player '{username}' not found"
        )

    player_data = parse_player_data(raw)
    player_uuid = raw["data"].get("uuid")
    if not player_uuid:
        raise HTTPException(status_code=502, detail="Player UUID missing from MCSR API")

    analytics = await build_analytics(
        username,
        player_uuid,
        match_count=match_count,
        season=selected_season,
    )

    record_lookup(player_data.get("name"), player_data.get("currentElo"))

    return {
        "player": player_data,
        "meta": {
            "currentSeason": current,
            "selectedSeason": selected_season,
            "matchCount": match_count,
        },
        "seasonStats": analytics["seasonStats"],
        "hasMatchData": analytics["hasMatchData"],
        "checkpoints": analytics["checkpoints"],
        "splits": analytics["splits"],
        "seedTypes": analytics["seedTypes"],
        "recentRuns": analytics["recentRuns"],
    }


@app.get("/players/{username}/runs/{run_id}", response_model=RunDetail)
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


@app.get("/players/{username}/summary", response_model=PlayerData)
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


@app.get("/players/{username}/matches", response_model=MatchListResponse)
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


@app.get("/matches/{match_id}", response_model=MatchDetail)
async def get_match(match_id: str):
    raw = await fetch_specific_match_data(match_id)
    if raw is None:
        raise HTTPException(status_code=502, detail="Failed to reach MCSR API")
    if not raw.get("data"):
        raise HTTPException(
            status_code=404, detail=f"Match '{match_id}' not found"
        )
    return parse_match_detail(raw)
