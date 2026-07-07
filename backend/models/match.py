from pydantic import BaseModel


class PlayerRef(BaseModel):
    country: str | None = None
    eloRate: int | None = None
    nickname: str | None = None
    uuid: str | None = None


class MatchSummary(BaseModel):
    id: str | int | None = None
    bastionType: str | None = None
    seedType: str | None = None
    forfeited: bool | None = None
    players: list[PlayerRef] = []


class MatchListResponse(BaseModel):
    matches: list[MatchSummary]
    bastionCounts: dict[str, int]
    seedCounts: dict[str, int]


class TimelineEvent(BaseModel):
    type: str
    time: int | None = None
    uuid: str | None = None


class MatchDetail(BaseModel):
    id: str | int | None = None
    date: int | None = None
    result: dict | None = None
    players: list[PlayerRef] = []
    timeline: list[TimelineEvent] = []
