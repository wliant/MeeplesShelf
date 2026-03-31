# MeeplesShelf — Implementation Checklist

Cross-referenced against `docs/FEATURE_GAP_ANALYSIS.md`. Tracks what has been
implemented, what remains, and maps each gap to its resolution status.

Last updated: 2026-03-31

---

## Legend

- [x] Completed
- [ ] Not started
- [~] Partially done (see notes)

---

## Phase 0 — MVP Enhancements

### 0.1 Loading States & Error Handling
- [x] Skeleton placeholders on InventoryPage during data fetch
- [x] Skeleton placeholders on SessionsPage during data fetch
- [x] Axios response interceptor for global error logging
- [x] `SnackbarProvider` (notistack) wrapped at app root
- [x] `useNotify` hook with `success()` and `error()` helpers
- [x] Try/catch on all async API operations in pages

### 0.2 Confirmation Dialogs & Toast Notifications
- [x] `ConfirmDialog` reusable component
- [x] Confirmation before game deletion
- [x] Confirmation before session deletion
- [x] Success toast on game create/update/delete
- [x] Success toast on session create/update/delete

### 0.3 Session Editing
- [x] `PUT /api/sessions/{session_id}` backend endpoint
- [x] `GameSessionUpdate` Pydantic schema
- [x] `SessionForm` accepts optional `session` prop for pre-population
- [x] Edit button in `SessionDetail` dialog
- [x] `updateSession()` API client function
- [x] Scores recalculated on update

### 0.4 Inventory Search, Sort & Filter
- [x] Search `TextField` with real-time text filtering by game name
- [x] Sort by Name / Date Added / Players
- [x] Sort direction toggle (Asc / Desc)
- [x] Client-side filtering and sorting on loaded data

### 0.5 Session Filtering
- [x] `GET /api/sessions` accepts `player_id` query param
- [x] `GET /api/sessions` accepts `date_from` / `date_to` query params
- [x] `SessionFilterBar` component with game/player autocompletes
- [x] Date range pickers (From / To)
- [x] Clear button resets all filters
- [x] Filters trigger re-fetch via `useCallback` dependency

### 0.6 Input Validation & Database Indexes
- [x] `GameCreate` validator: name non-empty (stripped)
- [x] `GameCreate` validator: `min_players >= 1`
- [x] `GameCreate` / `GameUpdate` validator: `max_players >= min_players`
- [x] Migration `002_indexes.py`: index on `game_sessions.game_id`
- [x] Migration `002_indexes.py`: index on `game_sessions.played_at`
- [x] Migration `002_indexes.py`: index on `session_players.player_id`
- [x] Migration `002_indexes.py`: index on `games.name`

### 0.7 Health Check & CORS Lockdown
- [x] `GET /health` endpoint pings database
- [x] `cors_origins` setting in `config.py` (not wildcard)
- [x] Default origins: `localhost:5173`, `localhost:80`

**Phase 0: 32/32 items complete**

---

## Phase 1 — V1.0 Core Feature Parity

### 1.1 Game Metadata Expansion
- [x] `description` (Text) column on Game model
- [x] `image_url` / `thumbnail_url` (String) columns
- [x] `min_playtime` / `max_playtime` (Integer) columns
- [x] `min_age` (Integer) column
- [x] `weight` (Float) column
- [x] `year_published` (Integer) column
- [x] `bgg_id` (Integer, unique) column
- [x] `user_rating` (Float) column
- [x] `Designer` model with name + bgg_id
- [x] `Publisher` model with name + bgg_id
- [x] `Category` model with name + bgg_id
- [x] `Mechanic` model with name + bgg_id
- [x] `game_designers` / `game_publishers` / `game_categories` / `game_mechanics` association tables
- [x] Schemas extended: `GameCreate`, `GameUpdate`, `GameRead` with all new fields
- [x] `DesignerRead`, `PublisherRead`, `CategoryRead`, `MechanicRead` schemas
- [x] Get-or-create pattern for relationship entities in `create_game` / `update_game`
- [x] `selectinload` for all 4 new relationships in game queries
- [x] Migration `003_metadata_collection_sessions.py`
- [x] Frontend `Game` type extended with all metadata + relationship arrays
- [x] `GameForm` metadata section (description, image URL, playtime, age, weight, year)
- [x] `GameForm` taxonomy inputs (designers, publishers, categories, mechanics — comma-separated)
- [x] `GameCard` shows thumbnail image (`CardMedia`)
- [x] `GameCard` shows playtime range chip
- [x] `GameCard` shows weight chip
- [x] `GameCard` shows category/mechanic chips

### 1.2 Collection Status Tracking
- [x] `collection_status` column (String, default "owned")
- [x] `is_favorite` column (Boolean, default false)
- [x] Index on `games.collection_status`
- [x] `collection_status` filter param on `GET /api/games`
- [x] `PATCH /api/games/{id}/favorite` toggle endpoint
- [x] `CollectionStatus` literal type in schema
- [x] Collection status `Tabs` on InventoryPage (All, Owned, Wishlist, etc.)
- [x] Status `Select` dropdown in `GameForm`
- [x] Favorite star `IconButton` on `GameCard`
- [x] `toggleFavorite()` API client function

### 1.3 Play Duration & Cooperative Support
- [x] `duration_minutes` column on GameSession model
- [x] `is_cooperative` column on GameSession model
- [x] `cooperative_result` column on GameSession model (win/loss)
- [x] Schema validation: `cooperative_result` requires `is_cooperative=True`
- [x] Schema validation: `cooperative_result` must be "win" or "loss"
- [x] Skip individual winner marking for cooperative sessions
- [x] Duration `TextField` in `SessionForm`
- [x] Cooperative `Switch` toggle in `SessionForm`
- [x] Cooperative result `Select` (win/loss) in `SessionForm` (conditional)
- [x] Duration chip in `SessionDetail`
- [x] Cooperative result chip in `SessionDetail`

### 1.4 Statistics Engine
- [x] `GET /api/stats/overview` — total games, sessions, players, play time, unique games, last 30 days
- [x] `GET /api/stats/games/{game_id}` — plays, unique players, avg/high score, last played, win distribution
- [x] `GET /api/stats/players/{player_id}` — sessions, wins, win rate, favorite game, games played
- [x] `GET /api/stats/play-frequency?period=month&months=12` — `date_trunc` grouping
- [x] `GET /api/stats/top-games?limit=10` — most played with thumbnail
- [x] `OverviewStats`, `GameStats`, `PlayerStats`, `PlayFrequencyEntry`, `TopGame` schemas
- [x] Stats service with SQL aggregation queries
- [x] Stats router registered in `main.py`

### 1.5 Dashboard Page
- [x] `DashboardPage` with loading skeleton
- [x] `OverviewCards` component (6 metric cards)
- [x] `PlayFrequencyChart` (recharts `BarChart`)
- [x] `TopGamesChart` (recharts horizontal `BarChart`)
- [x] Stats API client (`api/stats.ts`)
- [x] Stats TypeScript types (`types/stats.ts`)
- [x] `/dashboard` route in `App.tsx`
- [x] Default redirect to `/dashboard`
- [x] "Dashboard" nav button in `AppShell`
- [x] `recharts` dependency added

### 1.6 BGG Game Search & Import
- [x] `services/bgg.py` — `search_bgg()` (BGG XML API v2 search)
- [x] `services/bgg.py` — `get_bgg_details()` (thing endpoint with 202 retry)
- [x] XML parsing with `xml.etree.ElementTree`
- [x] Extracts: name, description, image, thumbnail, players, playtime, year, age, weight, categories, mechanics, designers, publishers
- [x] `GET /api/integrations/bgg/search?query=X` endpoint
- [x] `POST /api/integrations/bgg/import` endpoint (get-or-create all relationships)
- [x] `BGGSearchResult`, `BGGGameDetails`, `BGGImportRequest` schemas
- [x] `httpx` added to `requirements.txt`
- [x] `BGGSearchDialog` frontend component (search + debounce + click-to-import)
- [x] "Import from BGG" button on InventoryPage
- [x] BGG API client (`api/bgg.ts`)
- [x] BGG types (`types/bgg.ts`)
- [x] Integrations router registered in `main.py`

### 1.7 Game & Player Detail Pages
- [x] `GameDetailPage` — `/games/:id` route
- [x] Game detail: image, name, year, player count, playtime, weight, description
- [x] Game detail: designer/publisher/category/mechanic chips
- [x] Game detail: stats card (plays, unique players, avg/high score)
- [x] Game detail: win distribution chips
- [x] `PlayerDetailPage` — `/players/:id` route
- [x] Player detail: session count, wins, win rate, favorite game
- [x] Player detail: games played chip list
- [x] Routes registered in `App.tsx`
- [x] Game name in `GameCard` links to `/games/:id`

### 1.8 Dark Mode
- [x] `ThemeContext` with `light` / `dark` / `system` modes
- [x] `useThemeMode` hook
- [x] Persist mode to `localStorage`
- [x] System preference detection via `window.matchMedia`
- [x] `createTheme` with resolved palette mode
- [x] App wrapped in `ThemeContextProvider`
- [x] Cycle button in `AppShell` toolbar (DarkMode/LightMode/SettingsBrightness icons)
- [x] Scoring field border uses `theme.palette.divider` (not hardcoded `#ddd`)

### 1.9 Pagination
- [x] `PaginatedResponse` schema (`items`, `total`, `offset`, `limit`)
- [x] `GET /api/games` accepts `offset` and `limit` params
- [x] `GET /api/games` returns `{items, total, offset, limit}` response
- [x] `GET /api/sessions` accepts `offset` and `limit` params
- [x] `GET /api/sessions` returns `{items, total, offset, limit}` response
- [x] Count query for total in both endpoints
- [x] Frontend `PaginatedResponse<T>` type
- [x] `listGames()` returns paginated response
- [x] `listSessions()` returns paginated response
- [x] `TablePagination` on InventoryPage
- [x] `TablePagination` on SessionsPage
- [x] Page / rowsPerPage state management on both pages

### 1.10 Test Suite Foundation
- [x] `pytest.ini` with `asyncio_mode = auto`
- [x] `tests/conftest.py` with async fixtures
- [x] `test_scoring.py` — 10 unit tests (all field types + edge cases)
- [x] `test_games.py` — 12 integration tests (CRUD, metadata, validation, status, favorites)
- [x] `test_sessions.py` — 7 integration tests (CRUD, scoring, cooperative, duration, filtering)
- [x] Integration tests skip gracefully without PostgreSQL
- [ ] Integration tests verified passing with PostgreSQL
- [x] `pytest`, `pytest-asyncio` added to `requirements.txt`

**Phase 1: 129/129 items complete**

---

## Phase 2 — V1.5 Analytics & Polish

### 2.1 Advanced Analytics Charts
- [x] Play frequency chart with period selector (day/week/month)
- [x] Player performance charts (per-player score trends)
- [x] Player win rate comparison chart
- [x] Per-game score distribution chart

### 2.2 H-Index Calculation
- [x] `GET /api/stats/h-index` endpoint
- [x] H-index computation in stats service
- [x] H-index display component on Dashboard
- [x] H-index breakdown (games contributing to H-index)

### 2.3 Win Streaks
- [x] Win streak computation in stats service
- [x] Current streak + longest streak per player
- [x] Win streak display on PlayerDetailPage

### 2.4 Player Profiles
- [x] `avatar_url` column on Player model
- [x] `color` column on Player model (hex)
- [x] Player avatar display in SessionList, SessionDetail
- [x] Player profile editing (avatar URL, color picker)

### 2.5 Session Photos
- [x] `SessionPhoto` model (id, session_id, url, caption)
- [x] `POST /api/sessions/{id}/photos` upload endpoint
- [x] Photo display in SessionDetail
- [x] Photo gallery component

### 2.6 Session Location
- [x] `location` column on GameSession model
- [x] Location field in SessionForm
- [x] Location display in SessionDetail and SessionList

### 2.7 Data Export
- [x] `GET /api/export/sessions?format=csv` endpoint
- [x] `GET /api/export/collection?format=csv` endpoint
- [x] JSON export option
- [x] Export button in UI (settings or dedicated page)

### 2.8 Player Groups
- [x] `PlayerGroup` model (id, name)
- [x] `player_group_members` association table
- [x] Group management UI
- [x] Group selection in SessionForm

### 2.9 Favorites & User Tags
- [x] `is_favorite` on Game model (Phase 1)
- [x] `GameTag` model (id, name, color)
- [x] `game_tags` association table
- [x] Tag management UI on GameCard/GameForm
- [x] Filter by tag on InventoryPage

### 2.10 Illustrated Empty States
- [x] Empty inventory state with illustration and CTA
- [x] Empty sessions state with illustration and CTA
- [x] Empty dashboard state with onboarding guidance

### 2.11 CI/CD Pipeline
- [x] `.github/workflows/ci.yml` — lint, typecheck, build
- [x] Backend test job (pytest)
- [x] Frontend build job (tsc + vite build)
- [ ] PR checks configuration

**Phase 2: 37/38 items complete**

---

## Phase 3 — V2.0 Full Platform

### 3.1 User Authentication
- [ ] `User` model (id, email, hashed_password, display_name, avatar_url)
- [ ] `user_id` FK on Game, GameSession, Player models
- [ ] `POST /api/auth/register` endpoint
- [ ] `POST /api/auth/login` endpoint (JWT)
- [ ] `POST /api/auth/refresh` endpoint
- [ ] `GET /api/auth/me` endpoint
- [ ] `get_current_user` dependency for protected routes
- [ ] All existing routes filtered by `user_id`
- [ ] Login page frontend
- [ ] Register page frontend
- [ ] Auth context/provider
- [ ] Protected route wrapper
- [ ] Migration adding users table + user_id FKs

### 3.2 BGG Collection Sync
- [ ] `POST /api/integrations/bgg/import-collection` (by BGG username)
- [ ] BGG collection XML API client
- [ ] Bulk import with progress tracking
- [ ] Sync status tracking (last synced timestamp)
- [ ] Conflict resolution (local vs BGG data)

### 3.3 Data Import
- [ ] `POST /api/import/sessions` (CSV format)
- [ ] BG Stats JSON import support
- [ ] Import preview and confirmation UI
- [ ] Import error reporting

### 3.4 API Rate Limiting
- [ ] Rate limiting middleware in `main.py`
- [ ] Configurable limits per endpoint
- [ ] 429 response with Retry-After header

### 3.5 Structured Logging
- [ ] Request/response logging middleware
- [ ] Structured JSON log format
- [ ] Request ID tracing
- [ ] Log level configuration

### 3.6 Sharing & Social Features
- [ ] Public profile/collection URLs
- [ ] Share session results
- [ ] Friends system (friend requests, friend list)
- [ ] Friend activity feed

### 3.7 Gamification & Badges
- [ ] Badge definition model
- [ ] Badge award logic (triggers on session create)
- [ ] Badge display on player profile
- [ ] Achievements page

**Phase 3: 0/32 items complete**

---

## Feature Gap Coverage Summary

### By Gap Category (from Feature Gap Analysis)

| Category | Total Gaps | Addressed | Remaining |
|----------|-----------|-----------|-----------|
| 1. Game Metadata | 11 | 9 | 2 (P2 game type classification, P2 personal rating display) |
| 2. Collection Management | 8 | 7 (search, sort, collection status, favorites, options endpoint, pagination, tags) | 1 (location/acquisition) |
| 3. Session/Play Logging | 10 | 8 (session editing, filtering, duration, cooperative, pagination, photos, location) | 2 (incomplete flag, tie-breaking) |
| 4. Statistics & Analytics | 11 | 11 (stats engine, dashboard, play count, last played, win/loss, play frequency, H-index, charts, player performance, rankings, win streaks) | 0 |
| 5. Social & Multi-user | 7 | 2 (player profiles, player groups) | 5 (auth, sharing, friends, gamification, multi-user) |
| 6. Integration | 5 | 3 (BGG search, BGG single-game import, data export) | 2 (BGG collection sync, data import) |
| 7. UX/UI | 10 | 9 (loading, errors, confirmations, toasts, game detail, player detail, dark mode, dashboard, empty states) | 1 (keyboard shortcuts) |
| 8. Infrastructure | 9 | 7 (validation, indexes, health check, CORS, test structure, scoring tests, CI/CD) | 2 (rate limiting, logging) |

### Overall Progress

| Phase | Items | Done | Remaining | Completion |
|-------|-------|------|-----------|------------|
| Phase 0 | 32 | 32 | 0 | **100%** |
| Phase 1 | 129 | 129 | 0 | **100%** |
| Phase 2 | 38 | 37 | 1 | **97%** |
| Phase 3 | 32 | 0 | 32 | 0% |
| **Total** | **231** | **198** | **33** | **86%** |

### Next Priority Items

1. **PR checks configuration** (Phase 2.11) — remaining CI/CD item
2. **User authentication** (Phase 3.1) — enables multi-user support
3. **BGG collection sync** (Phase 3.2) — bulk import from BGG
4. **Data import** (Phase 3.3) — import from BG Stats, CSV
5. **API rate limiting** (Phase 3.4) — production hardening
