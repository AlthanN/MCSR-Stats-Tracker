# MCSR Stats — Frontend

Next.js (App Router) + Tailwind + Recharts frontend for the MCSR stats dashboard.

## Setup

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` with FastAPI running on port 8000. No `.env.local`
file is required: Next.js proxies browser requests under `/api/*` to FastAPI,
while server-rendered requests use `http://localhost:8000` directly.

On Vercel, the root `vercel.json` supplies a private `BACKEND_URL` service
binding for server-rendered requests. Browser requests remain on the current
deployment's `/api/*` routes, so production and previews do not need a public
API URL environment variable.

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

## Backend endpoints

The backend's public interface is namespaced under `/api`.

### 1. `GET /api/players/{username}` → `FullProfile`

The profile contains player data plus analytics aggregated across recent
ranked runs:

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

### 2. `GET /api/players/{username}/runs/{run_id}` → `RunDetail`

Single match's full split list, each with `deltaVsAverageMs` = that run's
split time minus the player's average for that split (negative = faster).

The API also exposes `/api/meta/current-season`, player summaries and match
lists, and `/api/matches/{match_id}`. Swagger documentation is available at
`/api/docs`.
