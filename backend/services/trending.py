"""In-memory trending tracker for recently looked-up players."""

from collections import OrderedDict

from models.profile import TrendingPlayer

_MAX_ENTRIES = 20
_recent: OrderedDict[str, int | None] = OrderedDict()

# Seed the homepage with well-known runners when nothing has been searched yet.
DEFAULT_TRENDING: list[TrendingPlayer] = [
    TrendingPlayer(name="Feinberg", currentElo=2276),
    TrendingPlayer(name="Dowsky", currentElo=2200),
    TrendingPlayer(name="Couriway", currentElo=2150),
    TrendingPlayer(name="Silverfish", currentElo=2100),
    TrendingPlayer(name="Reignex", currentElo=2050),
    TrendingPlayer(name="Ttsn", currentElo=2000),
]


def record_lookup(name: str | None, current_elo: int | None) -> None:
    if not name:
        return
    key = name.strip()
    if not key:
        return
    if key in _recent:
        _recent.move_to_end(key)
    _recent[key] = current_elo
    while len(_recent) > _MAX_ENTRIES:
        _recent.popitem(last=False)


def get_trending() -> list[TrendingPlayer]:
    if not _recent:
        return DEFAULT_TRENDING
    return [
        TrendingPlayer(name=name, currentElo=elo)
        for name, elo in reversed(_recent.items())
    ]
