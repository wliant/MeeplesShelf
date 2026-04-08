# MeeplesShelf — System Overview

## Purpose

MeeplesShelf is a self-hosted web application for managing a personal board game collection and logging play sessions with detailed, game-specific scoring. A single household or gaming group runs one instance; access is either read-only (guest) or full administrative control (admin via shared password).

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19.2.4 |
| Frontend language | TypeScript | 5.9.3 |
| Frontend build tool | Vite | 8.0.1 |
| UI component library | Material UI (MUI) | 7.3.9 |
| HTTP client | Axios | 1.13.6 |
| Client-side routing | React Router | 7.13.2 |
| Backend framework | FastAPI | 0.115.6 |
| ORM | SQLAlchemy (async) | 2.0.36 |
| Database driver | AsyncPG | 0.30.0 |
| Database | PostgreSQL | 16 |
| Migrations | Alembic | 1.14.1 |
| Settings | Pydantic Settings | 2.7.1 |
| JWT | python-jose[cryptography] | ≥3.3.0 |
| Python package manager | uv | — |
| Containerization | Docker Compose | — |

---

## Architecture

```
Browser
  │
  │  HTTP (port 8000 in prod / port 5173 in dev)
  ▼
FastAPI application (uvicorn)
  │
  ├── /api/*        REST API endpoints
  │
  ├── /docs         Swagger UI (interactive API docs)
  │
  └── /*            React SPA (served from compiled static files)
        │
        └── Falls back to index.html for client-side routing
                          │
                          ▼
                   PostgreSQL 16
```

In production (Docker), the React app is built into a `static/` directory served directly by FastAPI using a custom `SPAStaticFiles` handler that returns `index.html` for any unmatched path (supporting client-side routing). In local development, the Vite dev server (`:5173`) proxies `/api` requests to the FastAPI server (`:8000`).

---

## URL Map

| URL | What it serves |
|---|---|
| `http://localhost:8000` | Full application (SPA + API in Docker) |
| `http://localhost:8000/docs` | Swagger UI (interactive API reference) |
| `http://localhost:8000/api/*` | REST API endpoints |
| `http://localhost:9002` | MinIO S3 API (game cover images served here) |
| `http://localhost:9003` | MinIO Console (web UI for object storage) |
| `http://localhost:5173` | Vite dev server (frontend dev only) |

---

## Environment Variables

All variables are defined in `.env` (copy from `.env.example`). Docker Compose reads this file automatically.

| Variable | Required | Default in example | Description |
|---|---|---|---|
| `COMPOSE_PROJECT_NAME` | no | `meeplesshelf` | Docker Compose project namespace |
| `POSTGRES_USER` | yes | `meeplesshelf` | PostgreSQL superuser name |
| `POSTGRES_PASSWORD` | yes | `meeplesshelf` | PostgreSQL superuser password |
| `POSTGRES_DB` | yes | `meeplesshelf` | PostgreSQL database name |
| `POSTGRES_PORT` | yes | `5532` | Host port mapped to PostgreSQL container |
| `APP_DATABASE_URL` | yes | `postgresql+asyncpg://meeplesshelf:meeplesshelf@db:5432/meeplesshelf` | Full async DB connection URL used by the backend |
| `APP_PORT` | yes | `8000` | Host port for the backend/app container |
| `APP_ADMIN_PASSWORD` | yes | *(must set)* | Shared admin password for obtaining a JWT |
| `APP_SECRET_KEY` | yes | *(must set)* | Secret used to sign and verify JWTs (min 32 random bytes recommended) |
| `MINIO_ROOT_USER` | no | `minioadmin` | MinIO root username |
| `MINIO_ROOT_PASSWORD` | no | `minioadmin` | MinIO root password |
| `MINIO_API_PORT` | no | `9000` | Host port for MinIO S3 API |
| `MINIO_CONSOLE_PORT` | no | `9001` | Host port for MinIO web console |
| `APP_S3_ENDPOINT_URL` | yes | `http://minio:9000` | Internal S3 endpoint (backend → MinIO, Docker network) |
| `APP_S3_ACCESS_KEY` | yes | `minioadmin` | S3 access key (matches `MINIO_ROOT_USER`) |
| `APP_S3_SECRET_KEY` | yes | `minioadmin` | S3 secret key (matches `MINIO_ROOT_PASSWORD`) |
| `APP_S3_BUCKET` | no | `meeplesshelf` | S3 bucket for game cover images |
| `APP_S3_PUBLIC_URL` | yes | `http://localhost:9000` | External S3 URL for browser image access |
| `APP_BGG_API_TOKEN` | no | *(none)* | BoardGameGeek XML API bearer token; enables BGG search/import in GameForm. Register at boardgamegeek.com/using_the_xml_api |
| `VITE_API_BASE_URL` | no | `http://localhost:8000/api` | API base URL injected into the frontend build |

Backend settings are loaded by Pydantic Settings with prefix `APP_` and will read from `.env` or `../.env`. The `extra = "ignore"` config means unknown env vars are silently ignored.

---

## Docker Compose Topology

Two Compose files are used together:

**`docker-compose.infra.yml`** — infrastructure only
- `db` service: PostgreSQL 16, persistent volume `pgdata`, port `${POSTGRES_PORT}:5432`
- `minio` service: MinIO S3-compatible object storage, persistent volume `miniodata`, ports `${MINIO_API_PORT}:9000` (S3 API) and `${MINIO_CONSOLE_PORT}:9001` (web console)

**`docker-compose.app.yml`** — application
- `app` service: multi-stage Docker image (builds frontend then serves from FastAPI), port `${APP_PORT}:8000`, depends on `db` and `minio`, receives `APP_DATABASE_URL`, `APP_ADMIN_PASSWORD`, `APP_SECRET_KEY`, and `APP_S3_*` vars from environment. Game cover images are stored in MinIO and served directly to browsers via the S3 public URL.

Start both together:
```bash
docker compose -f docker-compose.yml -f docker-compose.app.yml up -d --build
```

---

## Development Setup

### Database (always required)
```bash
docker compose up -d   # starts only PostgreSQL
```

### Backend
```bash
cd app
uv sync                          # install dependencies into .venv
uv run alembic upgrade head      # apply migrations
uv run uvicorn app.main:app --reload   # API on :8000
```

### Frontend
```bash
cd web
npm install
npm run dev    # Vite dev server on :5173 (proxies /api → :8000)
npm run build  # production build (output: web/dist, copied to app/app/static)
npm run lint   # ESLint check
```

---

## Project Structure

```
MeeplesShelf/
├── app/                          Backend
│   ├── app/
│   │   ├── main.py               FastAPI app factory, CORS, SPA static handler
│   │   ├── config.py             Pydantic Settings (APP_* env vars)
│   │   ├── database.py           Async SQLAlchemy engine + session factory
│   │   ├── dependencies.py       require_admin FastAPI dependency
│   │   ├── models/
│   │   │   ├── game.py           Game, Expansion ORM models
│   │   │   └── session.py        Player, GameSession, SessionPlayer, session_expansions
│   │   ├── routers/
│   │   │   ├── auth.py           POST /api/auth/token
│   │   │   ├── games.py          Games + expansions + seed endpoints
│   │   │   └── sessions.py       Players + sessions endpoints
│   │   ├── schemas/
│   │   │   ├── scoring.py        ScoringSpec + all field type Pydantic models
│   │   │   ├── game.py           GameCreate/Update/Read, ExpansionCreate/Read
│   │   │   └── session.py        PlayerCreate/Read, GameSessionCreate/Read, etc.
│   │   └── services/
│   │       ├── scoring.py        calculate_total() function
│   │       └── seed.py           SEED_GAMES constant (4 pre-configured games)
│   ├── alembic/
│   │   └── versions/001_initial.py   Initial schema migration
│   └── pyproject.toml
├── web/                          Frontend
│   └── src/
│       ├── api/
│       │   ├── client.ts         Axios instance + Bearer token interceptor
│       │   ├── auth.ts           loginAdmin()
│       │   ├── games.ts          listGames, createGame, updateGame, deleteGame, etc.
│       │   └── sessions.ts       listSessions, createSession, listPlayers, etc.
│       ├── components/
│       │   ├── auth/RequireAuth.tsx
│       │   ├── games/{GameCard,GameList,GameForm,ExpansionList}.tsx
│       │   ├── sessions/{SessionList,SessionForm,SessionDetail,ScoreSheet,ScoreFieldRenderer}.tsx
│       │   └── layout/AppShell.tsx
│       ├── context/AuthContext.tsx
│       ├── pages/{LoginPage,InventoryPage,SessionsPage}.tsx
│       ├── types/{game.ts,session.ts,scoring.ts}
│       └── utils/scoring.ts      calculateTotal() (client-side mirror of server logic)
├── e2e-test/                     End-to-end test scaffold (pytest + uv)
├── specs/                        This folder
├── docker-compose.yml
├── docker-compose.app.yml
├── Dockerfile
└── .env.example
```
