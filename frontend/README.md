# MCSR Stats — Frontend

Next.js (App Router) + Tailwind + Recharts frontend for the MCSR stats dashboard.

## Setup

```bash
npm install
cp .env.local.example .env.local   # point at your FastAPI backend
npm run dev
```

Visit `http://localhost:3000`. Make sure your FastAPI backend (with CORS enabled
for `http://localhost:3000`) is running on the URL in `.env.local`.

## File map

```
app/
  layout.tsx              root layout, loads JetBrains Mono
  globals.css             dark theme, scanline texture, focus styles
  page.tsx                homepage (search + trending)
  player/[username]/
    page.tsx               server component: fetches profile, handles 404/error
    loading.tsx             skeleton shown while fetching
    not-found.tsx            shown when backend returns 404 for a username
components/
  SearchBar.tsx            client-side nav, used on home + profile pages
  PlayerSummary.tsx        PB / runs / avg / completion header
  CheckpointSection.tsx    signature element — ordered checkpoint timeline
  SplitBreakdownTable.tsx  full split table
  SeedTypePerformance.tsx  Recharts bar chart, green=helps / red=hurts
  RecentRunsList.tsx       clickable run rows
  RunDetailModal.tsx       expanded split timeline with above/below-avg highlight
  ProfileDashboard.tsx     client wrapper, owns the run-detail modal state
lib/
  api.ts                   fetch wrapper against the FastAPI backend
  types.ts                 TypeScript types mirroring backend Pydantic models
  format.ts                time/delta/consistency formatting helpers
```

## ⚠️ Backend endpoints this frontend expects

Your current FastAPI backend only exposes `/players/{username}` returning the
flat `PlayerData` shape from your original parsing function. This frontend
needs a richer payload to drive the checkpoints/splits/seed-type/recent-runs
sections. You'll need to extend the backend with:

### 1. `GET /players/{username}` → `FullProfile`

Wrap your existing `PlayerData` plus four new pieces, computed from the MCSR
`matches` endpoint (your `getUserMatch()`/`fetch_user_matches` function) by
aggregating across recent ranked runs:

```python
class FullProfile(BaseModel):
    player: PlayerData
    checkpoints: dict[str, CheckpointStat]   # keys: netherEnter, bastion, fortress, blindTravel, strongholdEnter, finish
    splits: list[SplitStat]
    seedTypes: list[SeedTypePerformance]
    recentRuns: list[RecentRun]
```

`CheckpointStat.average`/`best` come straight from MCSR's per-match timeline
data; `consistency` is the coefficient of variation
(`stdev(times) / mean(times)`) across the player's recent ranked matches —
`statistics.stdev()` from the standard library gets you most of the way
there.

### 2. `GET /players/{username}/runs/{run_id}` → `RunDetail`

Single match's full split list, each with `deltaVsAverageMs` = that run's
split time minus the player's average for that split (negative = faster).

### 3. `GET /players/trending` → `list[TrendingPlayer]` (optional)

Homepage degrades gracefully without this — it's wrapped in a try/catch — so
it's fine to ship without it and add later (e.g. backed by an in-memory list
of the last N usernames your backend has served).

I can help write the backend aggregation logic (consistency calculations,
checkpoint extraction from match timelines) next if useful — just share the
shape of the data MCSR's `/users/{username}/matches` actually returns and
I'll wire up the parsing.
