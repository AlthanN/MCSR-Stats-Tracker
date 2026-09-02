from pydantic import BaseModel

from models.player import PlayerData


class CheckpointStat(BaseModel):
    average: float | None = None
    best: float | None = None
    consistency: float | None = None


class SplitStat(BaseModel):
    splitName: str
    average: float | None = None
    best: float | None = None
    worst: float | None = None
    consistency: float | None = None


class SeedTypePerformance(BaseModel):
    seedType: str
    runsEncountered: int
    avgImpactMs: float | None = None
    winRate: float | None = None


class RecentRun(BaseModel):
    id: str
    date: str
    finalTimeMs: int | None = None
    result: str  # completed | forfeit | reset | decay
    opponent: str | None = None
    seedType: str | None = None
    won: bool = False
    winnerName: str | None = None
    isDraw: bool = False
    isDecay: bool = False
    eloChange: int | None = None


class MatchEvent(BaseModel):
    kind: str  # death | reset | forfeit
    label: str
    playerName: str
    timeMs: int


class RunSplitEntry(BaseModel):
    checkpoint: str
    label: str
    kind: str = "split"
    playerTimeMs: int | None = None
    opponentTimeMs: int | None = None
    timeMs: int | None = None
    deltaVsAverageMs: float | None = None


class RunDetail(RecentRun):
    playerName: str | None = None
    opponentFinishTimeMs: int | None = None
    splits: list[RunSplitEntry] = []
    events: list[MatchEvent] = []


class ApiRateLimit(BaseModel):
    limit: int = 500
    used: int = 0
    remaining: int = 500
    windowSeconds: int = 600
    resetAt: str | None = None
    observedAt: str | None = None
    exhausted: bool = False
    estimated: bool = True


class ProfileMeta(BaseModel):
    currentSeason: int
    selectedSeason: int
    matchCount: int
    requestedMatchCount: int
    analyzedMatchCount: int
    partialData: bool = False
    partialReason: str | None = None
    apiRateLimit: ApiRateLimit


class SeasonStatsSummary(BaseModel):
    bestTime: int | None = None
    averageCompletionTime: float | None = None
    wins: int | None = None
    losses: int | None = None
    draws: int | None = None
    playedMatches: int | None = None
    completions: int | None = None
    forfeits: int | None = None
    highestWinStreak: int | None = None
    currentWinStreak: int | None = None


class FullProfile(BaseModel):
    player: PlayerData
    meta: ProfileMeta
    seasonStats: SeasonStatsSummary
    hasMatchData: bool
    checkpoints: dict[str, CheckpointStat]
    splits: list[SplitStat]
    seedTypes: list[SeedTypePerformance]
    recentRuns: list[RecentRun]
    checkpointBestFromPb: bool = False
