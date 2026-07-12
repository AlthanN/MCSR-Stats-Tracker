from pydantic import BaseModel


class SeasonMatchesInfo(BaseModel):
    bestTime: int | None = None
    averageCompletionTime: float | None = None
    highestWinStreak: int | None = None
    currentWinStreak: int | None = None
    forfeits: int | None = None
    wins: int | None = None
    losses: int | None = None
    playedMatches: int | None = None
    completions: int | None = None


class AllTimeStats(BaseModel):
    wins: int | None = None
    losses: int | None = None
    playTime: int | None = None
    forfeits: int | None = None
    bestTime: int | None = None
    completions: int | None = None
    playedMatches: int | None = None
    averageCompletionTime: float | None = None
    highestWinStreak: int | None = None


class PlayerData(BaseModel):
    name: str | None = None
    country: str | None = None
    highestElo: int | None = None
    currentElo: int | None = None
    seasonElo: int | None = None
    playTime: int | None = None
    seasonMatchesInfo: SeasonMatchesInfo
    allTime: AllTimeStats
    firstOnline: int | None = None
    lastOnline: int | None = None
