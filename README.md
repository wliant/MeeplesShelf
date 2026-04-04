# MeeplesShelf

Track your board game collection and play sessions.

MeeplesShelf is a self-hosted web app for managing your board game inventory, logging game sessions, and tracking scores — including complex, game-specific scoring systems.

---

## Features

- **Game inventory** — catalog your collection with player count ranges and custom scoring specs
- **Expansion tracking** — attach expansions that modify a base game's scoring rules
- **Session logging** — record who played, which expansions were used, and individual scores
- **Flexible scoring** — JSONB-backed scoring specs support game-specific score components (Catan, Dominion, Five Tribes, and more)
- **Seed data** — one-click seed with Four pre-configured games to get started fast

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 19, TypeScript, Vite, MUI 7   |
| Backend     | FastAPI, SQLAlchemy 2 (async)       |
| Database    | PostgreSQL 16                        |
| Migrations  | Alembic                              |
| Container   | Docker Compose                       |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

### Quickstart with Docker

```bash
# 1. Clone the repo
git clone https://github.com/wliant/MeeplesShelf.git
cd MeeplesShelf

# 2. Set up environment variables
cp .env.example .env
# Edit .env if you need custom credentials (defaults work out of the box)

# 3. Start the full stack
docker compose -f docker-compose.yml -f docker-compose.app.yml up -d --build
```

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost:5173   |
| Backend  | http://localhost:8000   |
| API docs | http://localhost:8000/docs |

### Seed default games

```bash
curl -X POST http://localhost:8000/api/seed
```

This populates the database with Four pre-configured games: **Five Tribes**, **Dominion**, **Catan**, and **War Chest**.

---

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev      # Vite dev server on :5173
npm run lint     # ESLint check
npm run build    # Production build
```

### Backend

```bash
cd backend
pip install -r requirements.txt

# Start the database first (Docker)
docker compose up -d

# Run migrations then start the server
alembic upgrade head
uvicorn app.main:app --reload  # API on :8000
```

### Environment Variables

See `.env.example` for all available variables:

| Variable            | Description                          |
|---------------------|--------------------------------------|
| `POSTGRES_USER`     | Database user                        |
| `POSTGRES_PASSWORD` | Database password                    |
| `POSTGRES_DB`       | Database name                        |
| `POSTGRES_PORT`     | Host port for PostgreSQL             |
| `APP_DATABASE_URL`  | Full async DB URL (used by backend)  |
| `BACKEND_PORT`      | Host port for the API server         |
| `VITE_API_BASE_URL` | API base URL used by the frontend    |
| `FRONTEND_PORT`     | Host port for the frontend           |

---

## API Overview

Full interactive docs are available at `http://localhost:8000/docs`.

### Games

| Method | Endpoint                                       | Description              |
|--------|------------------------------------------------|--------------------------|
| GET    | `/api/games`                                   | List all games           |
| POST   | `/api/games`                                   | Create a game            |
| GET    | `/api/games/{id}`                              | Get game details         |
| PUT    | `/api/games/{id}`                              | Update a game            |
| DELETE | `/api/games/{id}`                              | Delete a game            |
| POST   | `/api/games/{id}/expansions`                   | Add an expansion         |
| DELETE | `/api/games/{id}/expansions/{expansion_id}`    | Remove an expansion      |
| POST   | `/api/seed`                                    | Seed default games       |

### Sessions & Players

| Method | Endpoint                | Description              |
|--------|-------------------------|--------------------------|
| GET    | `/api/players`          | List all players         |
| POST   | `/api/players`          | Create a player          |
| GET    | `/api/sessions`         | List all sessions        |
| POST   | `/api/sessions`         | Log a new session        |
| GET    | `/api/sessions/{id}`    | Get session details      |
| DELETE | `/api/sessions/{id}`    | Delete a session         |

---

## Project Structure

```
MeeplesShelf/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── config.py         # Settings (Pydantic)
│   │   ├── database.py       # Async session factory
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── routers/          # API route handlers
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   └── services/         # Seed data & scoring logic
│   └── alembic/              # Database migrations
├── frontend/
│   └── src/
│       ├── api/              # Axios API clients
│       ├── components/       # React components
│       ├── pages/            # Route-level page components
│       └── types/            # TypeScript types
├── specs/future/             # Planned feature specs
├── docker-compose.yml        # Base infrastructure (database)
├── docker-compose.app.yml    # App services (frontend + backend)
└── .env.example              # Environment variable template
```

---

## Roadmap

Planned features are documented in [`specs/future/`](specs/future/):

- **Authentication** ([`specs/future/authentication.md`](specs/future/authentication.md)) — Guest (read-only) and Admin roles
- **Image-based scoring** ([`specs/future/image-scoring.md`](specs/future/image-scoring.md)) — Capture scores from a photo of a score sheet

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
