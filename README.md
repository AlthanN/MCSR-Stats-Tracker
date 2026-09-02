# MCSR Stats Tracker

A stats dashboard for [MCSR Ranked](https://mcsrranked.com) (Minecraft Speedrunning Community Ranked). Search any ranked player by username to view split breakdowns, checkpoint consistency, seed-type performance, and recent match history.

This project is **not affiliated** with Mojang or MCSR Ranked. All match and player data is fetched live from the public MCSR Ranked API.

## Architecture

The app is a two-service stack: a **FastAPI backend** that proxies and enriches MCSR API data, and a **Next.js frontend** that renders the dashboard.

```
┌─────────────────┐       HTTP        ┌─────────────────┐       HTTP        ┌──────────────────┐
│  Next.js UI     │  ───────────────► │  FastAPI API    │  ───────────────► │  mcsrranked.com  │
│  (port 3000)    │  ◄─────────────── │  (port 8000)    │  ◄─────────────── │  /api            │
└─────────────────┘                   └─────────────────┘                   └──────────────────┘
```

There is no database. Every request pulls fresh data from MCSR Ranked, parses match timelines on the fly, and returns aggregated analytics. The backend caches only the current ranked season number (1-hour TTL).

## How data flows

1. **User searches** a username on the homepage. The frontend navigates to `/player/{username}`.
2. **Server-side fetch** — the player page calls `GET /api/players/{username}` on the backend before rendering.
3. **Backend fetches player profile** from `GET /users/{username}` on the MCSR API (ELO, wins/losses, season stats).
4. **Backend fetches recent matches** — up to 100 ranked matches (configurable, max 500) from `GET /users/{username}/matches`, paginated in batches of 100.
5. **Per-match detail fetch** — for each match, the backend calls `GET /matches/{id}` to retrieve the full timeline (nether enter, bastion find, dragon death, etc.). These run concurrently with a semaphore (max 10 at a time).
6. **Analytics aggregation** — checkpoint times, split averages, seed-type impact, win/loss records, and recent-run summaries are computed from the parsed timelines.
7. **Frontend renders** the profile dashboard: summary header, stats overview, checkpoint timeline, split table, seed chart, and clickable recent runs.
8. **Run detail modal** — clicking a run triggers a client-side fetch to `GET /api/players/{username}/runs/{run_id}`, which returns a side-by-side split comparison against the opponent plus delta-vs-average highlighting.

## Backend

**Stack:** Python 3, FastAPI, httpx (async HTTP), Pydantic

### Services

| Module | Role |
|---|---|
| `main.py` | FastAPI app, CORS, route definitions |
| `services/mcsr_client.py` | Shared async HTTP client to `https://mcsrranked.com/api`. Handles pagination, connection pooling, and concurrent match fetching. |
| `services/parsers.py` | Transforms raw MCSR JSON into typed Python dicts — player profiles, match lists, and filtered timelines. |
| `services/analytics.py` | Core analytics engine. Extracts checkpoint/split times from timelines, aggregates stats across runs, computes seed-type impact and season summaries. |
| `services/season.py` | Resolves the active ranked season (cached probe against a known player's recent match). |

### Key analytics concepts

**Checkpoints** — six macro milestones tracked across completed runs, in progression order:

- Nether Enter
- First Structure (Bastion)
- Second Structure (Fortress)
- Blind Travel
- Stronghold Enter
- Finish (dragon death)

For each checkpoint the backend computes average time, best time, and consistency (coefficient of variation = stdev / mean).

**Splits** — finer-grained progression events (enter nether, find bastion, obtain blaze rod, etc.). Same aggregation as checkpoints but with more granularity.

**Seed types** — MCSR assigns a seed category to each ranked match. The backend compares a player's average finish time on each seed type against their average on all other seeds, producing an "impact" value (positive = slower on that seed, negative = faster). Win rate per seed type is also tracked.

**Season stats** — wins, losses, draws, forfeits, completions, best/average finish time, and win streaks — computed from the fetched match list rather than trusting only the MCSR profile summary fields.

### API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/meta/current-season` | Active ranked season number |
| `GET /api/players/{username}` | Full profile: player summary + analytics + recent runs |
| `GET /api/players/{username}?season=N&count=M` | Same, scoped to season `N` with `M` matches analyzed |
| `GET /api/players/{username}/summary` | Lightweight player data without match analytics |
| `GET /api/players/{username}/matches` | Raw match list with bastion/seed counts |
| `GET /api/players/{username}/runs/{run_id}` | Single-run split timeline with opponent comparison |
| `GET /api/matches/{match_id}` | Single match detail with filtered timeline |

Query parameters:

- `season` — ranked season to analyze (defaults to current)
- `count` — number of recent matches to fetch and analyze (default 100, max 500)

## Frontend

**Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts

### Pages

- `/` — Homepage with username search
- `/player/[username]` — Full stats dashboard (server-rendered, with loading skeleton and 404 handling)
- `/player/[username]?season=N&count=M` — Season and match-count filters via URL params

### Component layout

The player page fetches the full profile server-side, then hands it to `ProfileDashboard` (a client component that owns modal state):

```
ProfileDashboard
├── PlayerSummary          ELO, country, PB, season/all-time stats
├── ProfileFilters         Season selector + match count (URL-driven)
├── StatsOverview          Win/loss record, completions, streaks
├── CheckpointSection      Ordered checkpoint timeline with consistency bars
├── SplitBreakdownTable    Full split table (avg / best / worst / consistency)
├── SeedTypePerformance    Recharts bar chart (green = helps, red = hurts)
├── RecentRunsList         Clickable match rows
└── RunDetailModal         Expanded split timeline vs. opponent + event log
```

Shared utilities live in `lib/`:

- `api.ts` — fetch wrapper against the FastAPI backend
- `types.ts` — TypeScript types mirroring backend Pydantic models
- `format.ts` — time, delta, and consistency formatting helpers

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000/api`. Interactive docs are at `http://localhost:8000/api/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`. During development, Next.js proxies `/api/*` to the backend at `http://localhost:8000`; no environment file is required.

## Deploying to Vercel

The root `vercel.json` deploys the Next.js frontend and FastAPI backend as two [Vercel Services](https://vercel.com/docs/services) in one project. Requests under `/api/*` go to FastAPI, while all other requests go to Next.js.

1. Import this repository into Vercel with the repository root as the project root.
2. In the project's Build and Deployment settings, select **Services** as the Framework Preset.
3. Deploy. Do not add `NEXT_PUBLIC_API_BASE_URL` or `BACKEND_URL` manually. Vercel creates the private `BACKEND_URL` service binding automatically.

To exercise the integrated routing locally with the Vercel CLI, run `vercel dev -L` from the repository root. The regular two-terminal `uvicorn` plus `npm run dev` workflow above remains supported.

## Project structure

```
MCSR-Stats-Tracker/
├── vercel.json                Vercel Services and routing configuration
├── backend/
│   ├── main.py                 FastAPI entry point
│   ├── requirements.txt
│   ├── models/
│   │   ├── player.py           PlayerData, season/all-time stats
│   │   ├── match.py            Match list and detail schemas
│   │   └── profile.py          FullProfile, RunDetail, analytics types
│   └── services/
│       ├── mcsr_client.py      MCSR API HTTP client
│       ├── parsers.py          Raw JSON → typed dicts
│       ├── analytics.py        Timeline parsing + stat aggregation
│       └── season.py           Current season resolution
└── frontend/
    ├── app/
    │   ├── layout.tsx          Root layout, fonts, dark theme
    │   ├── page.tsx            Homepage (search)
    │   └── player/[username]/  Player profile pages
    ├── components/             Dashboard UI components
    └── lib/                    API client, types, formatters
```

## Design notes

- **No persistence** — the backend is a stateless proxy/analytics layer. Response times depend on how many matches are analyzed (each requires a separate MCSR API call for timeline data).
- **Completed runs only** — checkpoint and split averages are computed from runs where the player finished (dragon death). Forfeits, resets, and decays are tracked separately in the recent-runs list.
- **Graceful degradation** — if a player has no ranked match data for the selected season, the dashboard shows profile summary stats with a banner explaining the missing data.
- **Season awareness** — users can browse historical seasons. The backend auto-detects the current season and defaults to it when none is specified.
