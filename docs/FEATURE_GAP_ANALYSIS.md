# MeeplesShelf Feature Gap Document & Implementation Specification

## Context

MeeplesShelf is an early-stage board game inventory and session tracking app (2 commits, ~930 lines of code). It has basic CRUD for games, expansions, players, and sessions with a flexible 5-type scoring system. This document identifies what's missing compared to industry-standard tools (BG Stats, BoardGameGeek, NemeStats, Board Games Tracker) from three perspectives: the **owner/hobbyist**, **other players/non-owners**, and **general UX/infrastructure**. It then provides a phased implementation specification.

### Benchmarked Tools

| Tool | Focus | Key Strengths |
|------|-------|---------------|
| **BG Stats** | Play tracking & analytics | 2500+ scoring templates, deep stats, H-index, BGG sync |
| **BoardGameGeek (BGG)** | Reference database & community | 100K+ game database, 8+ collection statuses, ratings, forums |
| **NemeStats** | Social & gamification | Badges, achievements, player rankings, community play tracking |
| **Board Games Tracker** | Free collection management | Web + mobile, collection & play logging, basic stats |

---

## Part 1: Feature Gap Analysis

### 1. Game Metadata Gaps

| Gap | Current State | Industry Standard | Priority |
|-----|--------------|-------------------|----------|
| No play time range | Missing | `min_playtime`/`max_playtime` universal | **P0** |
| No game description | Only `name` stored | Full descriptions, flavor text | P1 |
| No game image/thumbnail | Missing | Box art shown everywhere | P1 |
| No weight/complexity rating | Missing | BGG 1.0-5.0 scale is standard | P1 |
| No designer/publisher | Missing | Designer is primary metadata on BGG | P1 |
| No categories/mechanics tags | Missing | BGG has ~80 mechanics, ~80 categories | P1 |
| No BGG ID reference | Missing | Required for any BGG integration | P1 |
| No year published | Missing | Core BGG metadata | P2 |
| No recommended age | Missing | `min_age` is universal | P2 |
| No game type classification | ✅ `game_type` column with 4 types | Base game vs expansion vs reimplementation | P2 |
| No personal rating | ✅ `user_rating` displayed via Rating component | 1-10 rating is universal | P2 |

**Impact**: Games are identified only by name with player count range. Users cannot make informed decisions about what to play (no playtime, complexity, or category info). No foundation for BGG integration exists.

---

### 2. Collection Management Gaps

| Gap | Current State | Industry Standard | Priority |
|-----|--------------|-------------------|----------|
| No search/filter on inventory | Full list, no search | Text search + filter by player count, mechanic, category, weight | **P0** |
| No sorting options | Backend sorts by name only | Sort by name, last played, play count, rating, date added | **P0** |
| No collection status tracking | All games implicitly "owned" | BGG has 8+ statuses: Owned, Wishlist, Want to Play, Previously Owned, For Trade, etc. | **P0** |
| No pagination | Returns all rows | Needed for any collection > 50 games | P1 |
| No favorites/tags | Missing | User-defined tags and favorites | P2 |
| No collection statistics | Missing | Total owned, total plays, collection value | P2 |
| No location tracking | ✅ `shelf_location` + `lent_to` columns | Shelf label, lent to friend | P3 |
| No acquisition info | ✅ `acquisition_date`, `acquisition_price`, `condition` | Purchase date, price, condition | P3 |

**Impact**: Any collection beyond ~20 games becomes unmanageable. Users cannot find games by criteria ("what 2-player game under 30 minutes?"), track wishlists, or organize their collection meaningfully.

---

### 3. Session/Play Logging Gaps

| Gap | Current State | Industry Standard | Priority |
|-----|--------------|-------------------|----------|
| No session editing | Create and delete only | All apps allow editing past sessions | **P0** |
| No session filtering | Only `game_id` filter | Filter by date range, player, game, winner | **P0** |
| No play duration tracking | Missing | BG Stats tracks duration; timer feature | **P0** |
| No cooperative game support | Winner always per-player | Coop games have group win/loss | P1 |
| No quick-log mode | Full form always required | "Quick log" = just game + players, skip scores | P1 |
| No session pagination | Returns all sessions | Needed for real usage | P1 |
| No session location | Missing | Home, cafe, game store, convention | P2 |
| No session photos | Missing | BG Stats supports photos per session | P2 |
| No incomplete session flag | ✅ `is_incomplete` column + UI | Mark abandoned/unfinished games | P3 |
| No tie-breaking rules | ✅ `tiebreaker_winner_id` for explicit tiebreak | Many games have specific tiebreakers | P3 |

**Impact**: Mistakes in logged sessions require delete-and-recreate. Cooperative games (Pandemic, Spirit Island, etc.) cannot be properly tracked. Finding historical sessions requires scrolling through the entire list.

---

### 4. Statistics & Analytics Gaps (Hobbyist Perspective)

| Gap | Current State | Industry Standard | Priority |
|-----|--------------|-------------------|----------|
| No statistics at all | Zero analytics | BG Stats is essentially an analytics app | **P0** |
| No dashboard/summary page | Missing | Every competitor has a home dashboard | **P0** |
| No play count per game | Must count client-side | Play count is the #1 hobbyist metric | **P0** |
| No last-played date per game | Missing | Encourages playing neglected games | **P0** |
| No win/loss record per player | Must derive manually | Wins, losses, win rate per player per game | **P0** |
| No charts/visualizations | No charting library | Line, bar, pie charts for play distribution | P1 |
| No play frequency/trends | Missing | Plays per week/month/year over time | P1 |
| No player performance metrics | Missing | Average score, highest score, improvement | P1 |
| No H-index | Missing | Core BGG hobbyist metric (N games played N+ times) | P1 |
| No "most/least played" rankings | Missing | Dashboard-level insight | P1 |
| No win streaks | Missing | Current and longest win streak | P2 |

**Impact**: This is the single largest gap. Board game hobbyists track plays primarily to see statistics. Without analytics, the app is just a data entry tool with no return value to the user.

---

### 5. Social & Multi-user Gaps (Non-owner/Player Perspective)

| Gap | Current State | Industry Standard | Priority |
|-----|--------------|-------------------|----------|
| No user accounts/auth | Single anonymous user | All apps have user accounts | **P0** (infra) |
| No player profiles | Player = just a name | Avatar, color, preferred games, stats | P1 |
| No multi-user/household mode | Single implicit user | Shared device / household accounts | P2 |
| No player groups | Missing | "Tuesday Night Group" in BG Stats | P2 |
| No sharing | Missing | Share stats, sessions, collection | P3 |
| No friends system | Missing | Add friends, see their collections | P3 |
| No gamification | Missing | Badges, achievements (NemeStats) | P3 |

**Impact**: Non-owner players have zero engagement with the system. They cannot view their own stats, see their play history, or interact with the app in any way. The app is strictly single-user with no identity concept.

---

### 6. Integration Gaps

| Gap | Current State | Industry Standard | Priority |
|-----|--------------|-------------------|----------|
| No BGG game search/lookup | Manual entry only | Search BGG to auto-fill metadata | **P0** |
| No data export | Missing | CSV/JSON export of plays, collection | P1 |
| No BGG collection import | Missing | Import full BGG collection | P1 |
| No data import from other apps | Missing | Import from BG Stats, CSV | P2 |
| No BGG two-way sync | Missing | Bidirectional collection/play sync | P2 |

**Impact**: Every game must be manually configured with name, player counts, and scoring spec. This is the highest-friction part of the app. BGG has all this data available via API.

---

### 7. UX/UI Gaps

| Gap | Current State | Industry Standard | Priority |
|-----|--------------|-------------------|----------|
| No loading states | No indicators | Skeleton loaders, spinners | **P0** |
| No error handling UI | Errors silently fail | Toast notifications, error boundaries | **P0** |
| No confirmation dialogs | Delete is instant | "Are you sure?" before destructive actions | **P0** |
| No toast/snackbar notifications | Missing | Feedback for all CRUD actions | **P0** |
| No game detail page | Game only on card | Dedicated page: info + play history + stats | P1 |
| No player detail page | Player = name in forms | Page: history, stats, recent games | P1 |
| No dark mode | Hardcoded light | Dark/light toggle | P1 |
| No empty states with CTAs | Basic text only | Illustrated empty states guiding user | P2 |
| No breadcrumbs | Flat 2-page nav | Breadcrumbs for drill-down pages | P2 |
| No keyboard shortcuts | ✅ Global shortcuts with help dialog | Quick-add, navigation | P3 |

**Impact**: Delete operations cannot be undone and have no confirmation. Users receive no feedback when operations succeed or fail. The app feels unresponsive during API calls.

---

### 8. Infrastructure Gaps

| Gap | Current State | Industry Standard | Priority |
|-----|--------------|-------------------|----------|
| No test suite | Zero tests | Unit, integration, API tests | **P0** |
| No input validation beyond types | Basic Pydantic only | min_players <= max_players, etc. | P1 |
| No database indexes | Only PKs | Indexes on FKs, name, played_at | P1 |
| No CI/CD | Missing | GitHub Actions for test + lint + build | P1 |
| No health check endpoint | Missing | `GET /health` | P1 |
| CORS wide open | `allow_origins=["*"]` | Restrict to known origins | P1 |
| No API rate limiting | Missing | Prevent abuse | P2 |
| No structured logging | Missing | Request tracing | P2 |
| No database backup strategy | Missing | Automated pg_dump | P2 |

**Impact**: No tests means no confidence in changes. Missing indexes will degrade query performance as data grows. Open CORS is a security risk in production.

---

## Part 2: Implementation Specification

### Phase 0 — MVP Enhancements (Critical Usability)

*Fix critical usability gaps that make the app feel incomplete.*

#### 0.1 Loading States & Error Handling
- **Files**: `web/src/pages/InventoryPage.tsx`, `web/src/pages/SessionsPage.tsx`, `web/src/api/client.ts`
- **New files**: `web/src/components/common/SnackbarProvider.tsx`, `web/src/components/common/ErrorBoundary.tsx`
- **Changes**: Add `loading` state to both pages, show MUI `Skeleton` during fetch. Add axios response interceptor for global error toasts. Wrap app in `SnackbarProvider` (use `notistack` library). Add `ErrorBoundary` at app root.
- **Complexity**: S

#### 0.2 Confirmation Dialogs & Toast Notifications
- **New file**: `web/src/components/common/ConfirmDialog.tsx`
- **Files**: `web/src/components/games/GameCard.tsx`, `web/src/components/sessions/SessionList.tsx`
- **Changes**: Wrap all delete actions in confirmation dialog. Show success snackbar on create/update/delete.
- **Complexity**: S

#### 0.3 Session Editing
- **Backend**: Add `PUT /api/sessions/{session_id}` in `apps/app/routers/sessions.py`. Add `GameSessionUpdate` schema in `apps/app/schemas/session.py`.
- **Frontend**: Modify `SessionForm.tsx` to accept existing session for pre-population. Add edit button in `SessionDetail.tsx`. Wire edit flow in `SessionsPage.tsx`.
- **API client**: Add `updateSession()` in `web/src/api/sessions.ts`
- **Complexity**: M

#### 0.4 Inventory Search, Sort & Filter
- **Backend**: Extend `GET /api/games` in `apps/app/routers/games.py` with query params: `search`, `sort_by` (name/created_at/min_players), `sort_dir` (asc/desc)
- **Frontend**: Add search `TextField`, sort `Select` to `InventoryPage.tsx`. Update `listGames()` in `web/src/api/games.ts`.
- **Complexity**: M

#### 0.5 Session Filtering
- **Backend**: Extend `GET /api/sessions` in `apps/app/routers/sessions.py` with: `player_id`, `date_from`, `date_to`, `sort_by`
- **Frontend**: New `web/src/components/sessions/SessionFilterBar.tsx` with date pickers, game/player dropdowns. Wire into `SessionsPage.tsx`.
- **Complexity**: M

#### 0.6 Input Validation & Indexes
- **Backend schemas** (`apps/app/schemas/game.py`): Add validators — `min_players >= 1`, `max_players >= min_players`, `name` non-empty
- **New migration** `apps/alembic/versions/002_indexes.py`: Add indexes on `game_sessions.game_id`, `game_sessions.played_at`, `session_players.player_id`, `games.name`
- **Complexity**: S

#### 0.7 Health Check & CORS Lockdown
- **File**: `apps/app/main.py` — Add `GET /health` endpoint, read allowed CORS origins from config
- **File**: `apps/app/config.py` — Add `cors_origins: list[str]` setting
- **Complexity**: S

---

### Phase 1 — V1.0: Core Feature Parity

*Bring the app to minimum viable product for serious hobbyists.*

#### 1.1 Game Metadata Expansion
- **Model** (`apps/app/models/game.py`): Add columns: `description` (Text), `image_url` (String), `thumbnail_url` (String), `min_playtime` (Integer), `max_playtime` (Integer), `min_age` (Integer), `weight` (Float), `year_published` (Integer), `bgg_id` (Integer, unique), `user_rating` (Float). New models: `Designer`, `Publisher`, `Category`, `Mechanic` with association tables.
- **Schemas** (`apps/app/schemas/game.py`): Extend `GameCreate`, `GameUpdate`, `GameRead` with all fields. Add `DesignerRead`, `PublisherRead`, `CategoryRead`, `MechanicRead`.
- **Router** (`apps/app/routers/games.py`): Extend create/update. Add `GET /api/categories`, `GET /api/mechanics`.
- **Frontend**: Extend `GameForm.tsx` with new fields. Extend `GameCard.tsx` with image, playtime, weight badge.
- **Migration**: `003_game_metadata.py`
- **Complexity**: L

#### 1.2 Collection Status Tracking
- **Model** (`apps/app/models/game.py`): Add `collection_status` (String, default "owned", enum: owned/wishlist/want_to_play/previously_owned/want_to_trade/for_trade/preordered), `is_favorite` (Boolean)
- **Router**: Add `PATCH /api/games/{id}/status`, filter `GET /api/games` by `status`
- **Frontend**: Status tabs on `InventoryPage.tsx`, status badge + favorite star on `GameCard.tsx`
- **Migration**: `004_collection_status.py`
- **Complexity**: M

#### 1.3 Play Duration & Cooperative Support
- **Model** (`apps/app/models/session.py`): Add `duration_minutes` (Integer), `is_cooperative` (Boolean), `cooperative_result` (String: "win"/"loss")
- **Schemas/Router**: Extend create/read/update with new fields
- **Frontend**: Duration field + optional timer in `SessionForm.tsx`, cooperative toggle
- **Migration**: `005_session_enhancements.py`
- **Complexity**: S

#### 1.4 Statistics Engine
- **New files**: `apps/app/routers/stats.py`, `apps/app/services/stats.py`, `apps/app/schemas/stats.py`
- **Endpoints**:
  - `GET /api/stats/overview` — total games, plays, players, play hours, H-index
  - `GET /api/stats/games/{game_id}` — play count, avg/high score, last played, win distribution
  - `GET /api/stats/players/{player_id}` — games played, win rate, average scores
  - `GET /api/stats/play-frequency?period=month&range=12` — plays grouped by period
  - `GET /api/stats/top-games?limit=10&metric=play_count` — leaderboard
- **Register**: Add router in `apps/app/main.py`
- **Complexity**: L

#### 1.5 Dashboard Page
- **New files**: `web/src/pages/DashboardPage.tsx`, `web/src/api/stats.ts`, `web/src/types/stats.ts`
- **New components**: `web/src/components/stats/OverviewCards.tsx`, `PlayFrequencyChart.tsx`, `TopGamesChart.tsx`
- **Dependency**: Add `recharts` to `package.json`
- **Routing**: Add `/dashboard` in `App.tsx` (make default). Add nav link in `AppShell.tsx`.
- **Complexity**: L

#### 1.6 BGG Game Search & Import
- **New files**: `apps/app/services/bgg.py` (BGG XML API v2 client), `apps/app/routers/integrations.py`, `apps/app/schemas/bgg.py`
- **Endpoints**: `GET /api/bgg/search?q=catan`, `POST /api/bgg/import/{bgg_id}`
- **Dependency**: Add `httpx` + `xmltodict` to `requirements.txt`
- **Frontend**: New `web/src/components/games/BGGSearchDialog.tsx` — search, preview, one-click import
- **Complexity**: L

#### 1.7 Game & Player Detail Pages
- **New files**: `web/src/pages/GameDetailPage.tsx`, `web/src/pages/PlayerDetailPage.tsx`
- **Routing**: Add `/games/:id` and `/players/:id` in `App.tsx`
- **Content**: Game detail = full metadata + play history + per-game stats. Player detail = profile + play history + win rates.
- **Complexity**: M each

#### 1.8 Dark Mode
- **File**: `web/src/App.tsx` — Add `ThemeContext` with dark/light toggle, persist to localStorage, use `prefers-color-scheme` for default
- **File**: `web/src/components/layout/AppShell.tsx` — Add theme toggle button
- **Complexity**: M

#### 1.9 Pagination
- **Backend**: Wrap `GET /api/games` and `GET /api/sessions` in `{"items": [...], "total": N, "offset": 0, "limit": 20}` envelope
- **New schema**: `PaginatedResponse[T]` pattern in both `game.py` and `session.py` schemas
- **Frontend**: Pagination controls on both list pages
- **Complexity**: M

#### 1.10 Test Suite Foundation
- **New directory**: `apps/tests/` with `conftest.py` (async test DB setup), `test_games.py`, `test_sessions.py`, `test_scoring.py`
- **Dependency**: Add `pytest`, `pytest-asyncio`, `httpx` to dev requirements
- **Frontend**: Add Vitest + React Testing Library, initial component tests
- **Complexity**: L

---

### Phase 2 — V1.5: Analytics & Polish

*Deep analytics and quality-of-life improvements.*

| Item | Key Files | Complexity |
|------|-----------|------------|
| Play frequency & player performance charts | New chart components, `stats.py` service | M |
| H-index calculation & display | `stats.py`, new `HIndexDisplay.tsx` | S |
| Win streaks tracking | `stats.py` service | M |
| Player profiles (avatar, color) | `session.py` model, `PlayerDetailPage.tsx` | S |
| Session photos | New `SessionPhoto` model, upload endpoint, `SessionDetail.tsx` | M |
| Session location | `session.py` model+schema, `SessionForm.tsx` | S |
| Data export (CSV/JSON) | New export endpoints in `integrations.py` | M |
| Player groups | New `PlayerGroup` model, new component | M |
| Favorites & user tags | `game.py` model, `GameCard.tsx` | S |
| Illustrated empty states | `GameList.tsx`, `SessionList.tsx` | S |
| CI/CD pipeline | New `.github/workflows/ci.yml` | M |

---

### Phase 3 — V2.0: Full Platform

*Multi-user, integrations, and advanced features.*

| Item | Key Files | Complexity |
|------|-----------|------------|
| User authentication (JWT) | New `user.py` model, `auth.py` router, middleware, login/register pages | XL |
| BGG collection sync | `bgg.py` service extension | L |
| Data import (BG Stats, CSV) | New import service + endpoints | L |
| API rate limiting | Middleware in `main.py` | S |
| Structured logging | Middleware, all services | M |
| Sharing/social features | New models, pages | XL |
| Gamification/badges | New models, service, UI | L |

---

## Part 3: Key Architecture Decisions

### 1. Pagination Pattern
Use offset/limit with total count. Response shape: `{"items": [...], "total": 123, "offset": 0, "limit": 20}`. Simpler than cursor-based and sufficient for collections under 10,000 items.

### 2. Statistics Computation
Phase 1: Compute on-the-fly with SQL aggregation queries. Phase 2+: Add materialized views or caching if performance degrades. Abstract behind `services/stats.py` so the router is unaware of the data source.

### 3. BGG Integration
Use BGG XML API v2 (`https://boardgamegeek.com/xmlapi2/`). Unauthenticated, rate-limited to ~2 req/sec. Implement retry with exponential backoff. Cache results to avoid repeated lookups. Use `httpx` + `xmltodict` for HTTP and XML parsing.

### 4. Image Storage
Phase 1: Store URLs only (from BGG or user-provided). Phase 2+: Add file upload via S3-compatible storage (MinIO for self-hosted). The `image_url`/`thumbnail_url` columns work for both approaches.

### 5. Authentication (Phase 3)
JWT with refresh tokens. Access token: 15 minutes. Refresh token: 7 days. Store refresh tokens in database for revocation. Use FastAPI `Depends(get_current_user)`. All existing data assigned to first registered user during migration.

### 6. Frontend State Management (Phase 2+)
Migrate from manual refresh pattern to TanStack Query for server state caching, optimistic updates, and automatic refetching.

---

## Verification Plan

| Phase | Verification |
|-------|-------------|
| **Phase 0** | Start Docker Compose, manually test all CRUD with loading/error/confirm states visible. Verify search returns filtered results. Verify session edit round-trips correctly. |
| **Phase 1** | Run `pytest` backend tests. Verify BGG search returns results and import populates all metadata. Check dashboard renders charts. Test dark mode toggle persistence. |
| **Phase 2** | Run full test suite + CI pipeline. Verify CSV export is importable by spreadsheet apps. Check all chart components render with real data. |
| **Phase 3** | Test auth flow (register, login, token refresh, protected routes). Verify multi-user data isolation. |
