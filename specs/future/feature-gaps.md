# MeeplesShelf — Feature Gap Analysis

## Application Goal

MeeplesShelf is a self-hosted web application for a household or gaming group to catalogue
their board game collection and record competitive play sessions with detailed, game-specific
scoring. Its core value is reducing the friction of tracking "who played what, when, and by
how much they won" while supporting the wide variety of scoring mechanics found in modern
board games — all without relying on a third-party service.

---

## Current State

The application covers the essential record-keeping loop: add games with custom scoring
rules, log sessions with per-player scores, and view history. Access is split between a
read-only Guest mode and an Admin mode protected by a single shared password.

| Area | What exists today |
|---|---|
| Authentication | Single shared password → 24-hour JWT; Admin (full write) or Guest (read-only) |
| Game Inventory | Create / edit / delete games; 5 scoring-field types; add / remove named expansions |
| Sessions | Create / delete sessions; multi-player score entry; automatic winner calculation |
| Players | Global name registry; players created on-the-fly during session entry |
| Seed Data | 4 pre-configured games: Five Tribes, Dominion, Catan, War Chest |
| REST API | 18 endpoints (6 public read, 12 admin-protected write) |
| Deployment | Single Docker Compose stack (React + FastAPI + PostgreSQL) |

**Summary.** The app is a functional MVP. It handles the primary use-case well but is missing
the analytical layer that makes a tracker genuinely useful over time, lacks basic safeguards
(data export, session editing), has performance concerns at scale, and contains a
half-implemented feature (expansion scoring patches). Beyond the core loop, none of the
discovery, enrichment, or intelligence features that would differentiate the product from a
spreadsheet have been built.

---

## Target State

A self-hosted board game tracking platform that:

- Provides meaningful insights into play history, player performance, and game preferences
- Minimises manual effort through smart defaults, correctable entries, and (eventually) AI-assisted scoring
- Remains performant and navigable as collections and session histories grow over years
- Protects user data through export and backup mechanisms
- Supports natural household/group workflows — individual player profiles, multiple admins
- Optionally integrates with the wider board game community via BoardGameGeek

---

## Feature Gaps

### ~~Gap 1 — Expansion Scoring Patches~~ (Done)

**Status.** Implemented. `merge_scoring_spec()` added to both backend (`app/app/services/scoring.py`)
and frontend (`web/src/utils/scoring.ts`). The `create_session()` route now merges active expansion
patches into the scoring spec before calculating totals. The `SessionForm` component includes
expansion checkboxes and computes an effective spec for live score preview. Expansion IDs are
validated against the game (HTTP 400 if mismatched). Covered by backend unit tests
(`app/tests/test_scoring.py`), frontend unit tests (`web/src/utils/scoring.test.ts`), and e2e
integration tests (`e2e-test/tests/test_expansion_scoring.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — sessions logged with scoring expansions will have incorrect totals, silently undermining data accuracy |
| **Technical Complexity** | Low — the data model is already in place; change is limited to merging active expansion patches into the spec before calling `calculate_total()`, and mirroring the same logic in the TypeScript client |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P0~~ Done |

---

### ~~Gap 2 — Session Editing~~ (Done)

**Status.** Implemented. `PUT /api/sessions/{session_id}` endpoint added to the backend
(`app/app/routers/sessions.py`) with `GameSessionUpdate` schema (`app/app/schemas/session.py`).
The endpoint replaces players, scores, and expansions while recalculating totals and winners.
The game is immutable on edit. The frontend `SessionForm` component (`web/src/components/sessions/SessionForm.tsx`)
now supports an edit mode via an `editSession` prop, pre-populating all fields. `SessionDetail`
(`web/src/components/sessions/SessionDetail.tsx`) has an "Edit" button for admins. `SessionsPage`
(`web/src/pages/SessionsPage.tsx`) wires the detail → edit → save flow. Covered by 7 E2E
integration tests (`e2e-test/tests/test_session_edit.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | High — entry mistakes are inevitable; forcing delete-and-recreate discourages accurate record-keeping and erodes trust in historical data |
| **Technical Complexity** | Medium — requires a new `PUT` route that recalculates totals and winners, and pre-populating the existing `SessionForm` component for editing |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P0~~ Done |

---

### ~~Gap 3 — Statistics and Analytics~~ (Done)

**Status.** Implemented. Four public read-only endpoints added under `/api/stats/`:
`GET /stats/overview` (total games/sessions/players, recent sessions, most recent date),
`GET /stats/players` (per-player win rate, sessions played, wins — ordered by win rate),
`GET /stats/games` (per-game play count, unique players, last played — ordered by times played),
`GET /stats/activity?months=12` (sessions per month over a configurable lookback, gap-filled).
Backend: `app/app/schemas/stats.py`, `app/app/services/stats.py` (`fill_month_gaps` utility),
`app/app/routers/stats.py`, mounted in `app/app/main.py`. Frontend: new `/statistics` route
with `StatisticsPage` (`web/src/pages/StatisticsPage.tsx`) featuring four visualizations using
Recharts — OverviewCards (summary metrics), PlayerLeaderboard (bar chart + table),
MostPlayedGames (horizontal bar chart + table), and ActivityChart (area chart). Charts are
responsive (hidden on mobile, table-only fallback). Navigation link added to `AppShell`
(desktop toolbar + mobile drawer with `BarChartIcon`). API client in `web/src/api/stats.ts`,
types in `web/src/types/stats.ts`, formatting helpers in `web/src/utils/stats.ts`.
Covered by 6 backend unit tests (`app/tests/test_stats.py`), 3 frontend unit tests
(`web/src/utils/stats.test.ts`), and 18 E2E integration tests (`e2e-test/tests/test_stats.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | High — the primary long-term value of a play tracker is answering "who is actually better at Catan?" and "what do we play most?"; without this, the app is a log with no payoff |
| **Technical Complexity** | Medium — new `/api/stats` endpoints using SQL aggregations (window functions, GROUP BY); chart rendering in the frontend (e.g. Recharts); a dedicated Stats page or dashboard section |
| **Dependencies / Prerequisites** | Sufficient accumulated session history for stats to be meaningful; Session Editing (Gap 2) to ensure data is accurate before surfacing it |
| **Suggested Priority** | ~~P1~~ Done |

---

### ~~Gap 4 — Search and Filtering~~ (Done)

**Status.** Implemented. `GET /api/games` now accepts an optional `name` query parameter for
case-insensitive substring matching. `GET /api/sessions` now accepts `player_id`, `date_from`,
and `date_to` query parameters in addition to the existing `game_id`. The `InventoryPage` has
a search bar that filters games client-side by name using `filterGamesByName()` from
`web/src/utils/filters.ts`. The `SessionsPage` has a filter bar with game dropdown (server-side),
date range pickers (server-side), player name search (client-side via `filterSessionsByPlayerName()`),
and a Clear Filters button. Both pages show contextual empty-state messages when filters match
nothing. Covered by frontend unit tests (`web/src/utils/filters.test.ts`) and e2e integration
tests (`e2e-test/tests/test_search_filter.py`). Files changed: `app/app/routers/games.py`,
`app/app/routers/sessions.py`, `web/src/api/sessions.ts`, `web/src/utils/filters.ts`,
`web/src/pages/InventoryPage.tsx`, `web/src/pages/SessionsPage.tsx`.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — a collection of 30+ games or 100+ sessions becomes unwieldy to navigate without filtering |
| **Technical Complexity** | Low — add optional query parameters (`name`, `game_id`, `player_id`, date range) to `GET /api/games` and `GET /api/sessions`; add a filter/search bar to `InventoryPage` and `SessionsPage` |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P1~~ Done |

---

### ~~Gap 5 — Pagination~~ (Done)

**Status.** Implemented. `GET /api/games` and `GET /api/sessions` now accept `skip` (default 0, min 0) and
`limit` (default 20, min 1, max 100) query parameters. Both endpoints return a `PaginatedResponse` wrapper
(`{ items, total, skip, limit }`) instead of a bare array. A shared `PaginatedResponse` Pydantic schema
(`app/app/schemas/pagination.py`) and TypeScript type (`web/src/types/pagination.ts`) support the generic
wrapper. The `InventoryPage` uses server-side name filtering with a 300ms debounce and an MUI `Pagination`
component. The `SessionsPage` passes pagination params alongside existing filters and resets to page 0 on
filter changes; `SessionList` includes MUI `TablePagination`. Player name search on sessions remains
client-side within the current page. Covered by E2E integration tests (`e2e-test/tests/test_pagination.py`,
13 tests) and updated existing filter tests (`e2e-test/tests/test_search_filter.py`). Files changed:
`app/app/schemas/pagination.py`, `app/app/routers/games.py`, `app/app/routers/sessions.py`,
`web/src/types/pagination.ts`, `web/src/api/games.ts`, `web/src/api/sessions.ts`,
`web/src/pages/InventoryPage.tsx`, `web/src/pages/SessionsPage.tsx`,
`web/src/components/sessions/SessionList.tsx`.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — performance degrades noticeably at scale; the problem grows silently over time |
| **Technical Complexity** | Low — SQLAlchemy `offset`/`limit` on list queries; return `total` count alongside results; implement page controls or infinite scroll in the frontend |
| **Dependencies / Prerequisites** | Search and Filtering (Gap 4) should be implemented together or after, as pagination and filtering are typically designed as a unit |
| **Suggested Priority** | ~~P1~~ Done |

---

### ~~Gap 6 — Data Export and Backup~~ (Done)

**Status.** Implemented. Two admin-only export endpoints added: `GET /api/export` returns a full JSON
backup of all games (with expansions), players, and sessions (with scores) wrapped in a `FullExport`
schema with metadata (timestamp, version). `GET /api/export/sessions/csv` returns a flattened CSV with
one row per session-player, suitable for spreadsheet analysis. Both endpoints set `Content-Disposition`
attachment headers with dated filenames. The frontend `AppShell` nav bar includes an admin-only download
icon button with a dropdown menu offering "Export JSON (Full Backup)" and "Export Sessions CSV" options,
with loading state and snackbar feedback. Backend: `app/app/schemas/export.py`, `app/app/routers/export.py`,
`app/app/main.py`. Frontend: `web/src/api/export.ts`, `web/src/utils/download.ts`,
`web/src/components/layout/AppShell.tsx`. Covered by 12 E2E integration tests
(`e2e-test/tests/test_export.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | High — data loss from a failed Docker volume is unrecoverable; export is also needed for sharing history (spreadsheet analysis, archival) |
| **Technical Complexity** | Low-Medium — `GET /api/export` endpoints returning JSON (full fidelity) and optionally CSV (sessions and scores); a download button in the frontend settings or admin panel |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P1~~ Done |

---

### ~~Gap 7 — Per-Player Profile and Statistics~~ (Done)

**Status.** Implemented. `GET /api/players/{player_id}/stats` endpoint added to
`app/app/routers/players.py` returning a `PlayerProfileStats` response with five sections:
overall stats (sessions played, wins, win rate), favorite game, per-game breakdown (times
played, wins, win rate, avg/best score per game), recent sessions (last 20, ordered by date
desc), and monthly activity (12 months, gap-filled via `fill_month_gaps()`). Schemas in
`app/app/schemas/player_stats.py` reuse `ActivityMonth` from existing stats schemas. Router
registered in `app/app/main.py`. Frontend: new `PlayerProfilePage` at `/players/:id`
(`web/src/pages/PlayerProfilePage.tsx`) with overview cards, Recharts bar chart for game
breakdown, responsive table/card layout for recent sessions, and reused `ActivityChart`
component. Player names are clickable links in `PlayerList.tsx` and `PlayerLeaderboard.tsx`
(via React Router `Link`). `formatScore()` utility added to `web/src/utils/stats.ts`.
Types added to `web/src/types/stats.ts`, API call added to `web/src/api/sessions.ts`.
Covered by 7 backend unit tests (`app/tests/test_player_stats.py`), 3 frontend unit tests
(`web/src/utils/stats.test.ts`), and 15 E2E integration tests
(`e2e-test/tests/test_player_profile.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — individual stats create engagement and friendly competition; groups often care about "who is the best Catan player" as much as aggregate history |
| **Technical Complexity** | Medium — new `PlayerPage` route; `GET /api/players/{id}/stats` endpoint aggregating wins, games played, average scores per game; charts reusing Stats infrastructure |
| **Dependencies / Prerequisites** | Statistics infrastructure (Gap 3) |
| **Suggested Priority** | ~~P2~~ Done |

---

### ~~Gap 8 — Game Ratings and Personal Notes~~ (Done)

**Status.** Implemented. `rating` (INTEGER, nullable, validated 1–10) and `notes` (TEXT, nullable)
columns added to the `games` table via Alembic migration `002_add_game_rating_notes.py`. Backend:
`GameCreate`, `GameUpdate`, and `GameRead` schemas updated with both fields; `field_validator` enforces
rating range; `create_game` and `update_game` router endpoints handle the new fields. A pre-existing
async ORM bug in `update_game` (MissingGreenlet on `updated_at`) was fixed by re-querying after commit.
Frontend: `Game` and `GameCreate` TypeScript types extended; `GameForm` includes a 10-star MUI `<Rating>`
widget and a multiline `<TextField>` for notes between the player count row and scoring spec section;
`GameCard` displays a read-only `<Rating>` on the card face and notes in the expandable section.
`formatRating` utility in `web/src/utils/rating.ts`. Covered by 14 backend unit tests
(`app/tests/test_game_schema.py`), 4 frontend unit tests (`web/src/utils/rating.test.ts`), and 10 E2E
integration tests (`e2e-test/tests/test_game_rating_notes.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | Low-Medium — improves the inventory page from a pure catalogue into a living reference for the group's taste |
| **Technical Complexity** | Low — add a `rating` (numeric 1–10) and `notes` (text) column to the `games` table via an Alembic migration; surface a star/number rating widget and notes field in `GameCard` and `GameForm` |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P2~~ Done |

---

### ~~Gap 9 — Tags and Categories~~ (Done)

**Status.** Implemented. `tags` table (VARCHAR(100) name, case-insensitively unique via functional
index on `lower(name)`) and `game_tags` M:M junction table added via Alembic migration 004.
Backend: `Tag` model and `game_tags` Table in `app/app/models/game.py`, `TagCreate`/`TagRead`
schemas in `app/app/schemas/tag.py`, `GameCreate`/`GameUpdate` extended with `tag_ids` field,
`GameRead` extended with `tags` field. Tags CRUD router (`GET /tags`, `POST /tags`, `DELETE /tags/{id}`)
in `app/app/routers/tags.py`. `GET /api/games` accepts repeatable `tag` query parameter for AND-logic
server-side filtering (case-insensitive). `POST /api/games` and `PUT /api/games/{id}` accept `tag_ids`
for tag assignment with validation (400 if invalid). Frontend: `Tag` type in `web/src/types/game.ts`,
tags API client in `web/src/api/tags.ts`. `GameForm` includes MUI `Autocomplete` (multiple, freeSolo)
for tag selection and inline creation between Notes and Scoring Spec sections. `GameCard` displays tag
chips (outlined) below info chips. `InventoryPage` shows clickable tag filter chips below the search bar
(filled when active, outlined when inactive). `filterGamesByTag()` utility in `web/src/utils/filters.ts`.
Covered by 10 backend unit tests (`app/tests/test_tag_schema.py`), 6 frontend unit tests
(`web/src/utils/filters.test.ts`), and 22 E2E integration tests (`e2e-test/tests/test_tags.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — tags become the primary navigation mechanism once a collection grows beyond casual recall |
| **Technical Complexity** | Medium — new `tags` table; `game_tags` M:M junction; tag management UI in `GameForm`; tag-based filter chips in `InventoryPage` |
| **Dependencies / Prerequisites** | Search and Filtering (Gap 4) for the filter UI pattern |
| **Suggested Priority** | ~~P2~~ Done |

---

### ~~Gap 10 — Game Cover Images~~ (Done)

**Status.** Implemented. `POST /api/games/{game_id}/image` (admin-only, multipart form-data) uploads
a cover image (JPEG, PNG, or WebP, max 5MB) with UUID-based filenames stored at
`{upload_dir}/games/{game_id}/`. `DELETE /api/games/{game_id}/image` (admin-only) removes the image.
Images are served publicly via `/api/uploads/` using FastAPI's `StaticFiles`. The `GameRead` schema
includes a computed `image_url` field. Image files are cleaned up on game deletion or image replacement.
Database: `image_filename` column added to `games` table via Alembic migration 003. Storage: images
are stored in MinIO (S3-compatible) via `aiobotocore`; bucket is auto-created with public-read policy
on app startup (`app/app/services/storage.py`). Frontend: `GameCard` displays cover
images with `CardMedia` (180px height, object-fit cover) or a placeholder icon when no image exists.
Admin users see camera/remove icon overlays for upload and deletion with loading states and snackbar
feedback. Client-side validation mirrors backend (type + size). Files changed: `app/pyproject.toml`,
`app/app/config.py`, `app/alembic/versions/003_add_game_image.py`, `app/app/models/game.py`,
`app/app/schemas/game.py`, `app/app/routers/games.py`, `app/app/main.py`, `Dockerfile`,
`docker-compose.app.yml`, `web/src/types/game.ts`, `web/src/api/games.ts`,
`web/src/components/games/GameCard.tsx`. Covered by 2 backend unit tests
(`app/tests/test_game_schema.py`), and 14 E2E integration tests
(`e2e-test/tests/test_game_image.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — visual identity improves usability and emotional engagement with the app |
| **Technical Complexity** | Medium — file upload endpoint (`POST /api/games/{id}/image`); store images on a mounted Docker volume; serve via a static file route; display in `GameCard` with an `<img>` element and fallback placeholder |
| **Dependencies / Prerequisites** | None; can be implemented independently before BoardGameGeek integration |
| **Suggested Priority** | ~~P2~~ Done |

---

### ~~Gap 11 — BoardGameGeek (BGG) Integration~~ (Done)

**Status.** Implemented. Backend acts as a proxy to the BGG XML API v2 with three new endpoints:
`GET /api/bgg/search` (search by name, capped at 25 results), `GET /api/bgg/details/{bgg_id}`
(detailed game info), and `POST /api/bgg/import-image/{bgg_id}?game_id=...` (download BGG cover
image to S3). Rate limiting (1 req/sec via `asyncio.Lock`) and Bearer token auth for BGG's API
(via `APP_BGG_API_TOKEN` env var). `bgg_id` (INTEGER, nullable, partial unique index) added to
the `games` table via Alembic migration 005. GameCreate/GameUpdate/GameRead schemas extended with
`bgg_id`. The `GameForm` component includes an "Import from BoardGameGeek" collapsible search
panel (create mode only) that auto-fills name, min/max players, and notes from BGG. After game
creation, `InventoryPage` automatically downloads the BGG cover image. Graceful degradation: when
`APP_BGG_API_TOKEN` is not configured, endpoints return 503 with a helpful setup message.
Backend: `app/app/services/bgg.py`, `app/app/routers/bgg.py`, `app/app/schemas/bgg.py`,
`app/app/config.py`, `app/alembic/versions/005_add_bgg_id.py`. Frontend: `web/src/api/bgg.ts`,
`web/src/types/bgg.ts`, `web/src/components/games/GameForm.tsx`, `web/src/pages/InventoryPage.tsx`.
Covered by 23 backend unit tests (`app/tests/test_bgg_service.py`, `app/tests/test_bgg_schema.py`,
`app/tests/test_game_schema.py`), and 17 E2E integration tests
(`e2e-test/tests/test_bgg_integration.py`, 5 skipped without BGG token).

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium-High — manual game setup is the highest-friction part of onboarding; a BGG search-and-import flow would reduce it to a few clicks for supported games |
| **Technical Complexity** | High — BGG XML API integration in the backend; name search + game lookup; mapping BGG fields to internal schema; image download and storage; scoring spec still requires manual configuration (BGG has no machine-readable scoring rules) |
| **Dependencies / Prerequisites** | Game Cover Images (Gap 10) for the image display component |
| **Suggested Priority** | ~~P2~~ Done |

---

### Gap 12 — Multiple Admin Accounts ~~(Will Not Do)~~

**Description.** The current authentication model uses a single shared password for all
admins. Multiple household members who want to manage the collection share one credential,
and there is no audit trail for who created or deleted records. The model does not support
revocation of a single person's access without changing the password for everyone.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — acceptable for a small household with a single admin, but becomes a liability in larger groups or when someone should no longer have write access |
| **Technical Complexity** | High — requires a `users` table, per-user password hashing, per-user JWT subjects, a user management UI, and a migration strategy for existing records (assign them to a default system user) |
| **Dependencies / Prerequisites** | None architecturally, but this is a breaking change to the auth model and should be planned carefully |
| **Suggested Priority** | ~~P3~~ — Will Not Do |

---

### Gap 13 — Progressive Web App (PWA) and Offline Support ~~(Will Not Do)~~

**Description.** Sessions are typically logged at a table where phones and tablets may have
unreliable WiFi. The app requires a live API connection; there is no offline mode, no
service worker, and no local caching. Users who lose connectivity mid-session cannot save
their scores without re-entering them once the connection is restored.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — a high quality-of-life improvement for the typical game-night scenario; removes the dependency on home network reliability |
| **Technical Complexity** | High — Vite PWA plugin for service worker; IndexedDB for local session draft storage; background sync when connection is restored; conflict resolution for cases where the same data is modified online and offline |
| **Dependencies / Prerequisites** | None, but implementation scope is significant |
| **Suggested Priority** | ~~P3~~ — Will Not Do |

---

### Gap 14 — AI Image-Based Scoring

**Description.** Already specified in `specs/future/image-scoring.md`. Users photograph the
physical game board at end-of-game and an AI vision model analyzes the board state to
automatically populate score fields. Users review and adjust before saving. This would
significantly reduce the manual data entry burden for visually rich games like Catan and
Five Tribes.

| Attribute | Detail |
|---|---|
| **Business Impact** | High — eliminates the most tedious part of session logging; a meaningful differentiator that no general-purpose tracker offers |
| **Technical Complexity** | Very High — image upload pipeline; AI vision API integration (OpenAI Vision or similar); game-aware prompt construction from `scoring_spec`; confidence scoring and partial-result handling; review/correction UX |
| **Dependencies / Prerequisites** | Session Editing (Gap 2) — users must be able to correct AI-computed scores before or after saving; Game Cover Images (Gap 10) infra for file handling patterns |
| **Suggested Priority** | P3 — foundational gaps (P0/P1) should be closed first to ensure the data layer is solid |

---

### ~~Gap 15 — No Delete Confirmation Dialogs~~ (Done)

**Status.** Implemented. A reusable `ConfirmDialog` component (`web/src/components/common/ConfirmDialog.tsx`)
is now shown before all destructive operations. Game deletion warns about cascade-deleted expansions and
sessions. Session deletion identifies the game and date. Expansion deletion identifies the expansion and
parent game. The confirm button is red (`color="error"`). Message-building logic is extracted into pure
helper functions (`buildGameDeleteMessage`, `buildSessionDeleteMessage`, `buildExpansionDeleteMessage`)
covered by frontend unit tests (`web/src/components/common/ConfirmDialog.test.ts`). Wired into
`InventoryPage`, `SessionsPage`, and `ExpansionList`. `GameCard`/`GameList` and `SessionList` prop
signatures updated to pass full objects instead of bare IDs.

| Attribute | Detail |
|---|---|
| **Business Impact** | High — accidental deletion of a game wipes its entire session history irreversibly; users learn to distrust the interface |
| **Technical Complexity** | Low — add a standard MUI `<Dialog>` confirmation ("Delete Catan and all 12 sessions?") before calling the API |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P0~~ Done |

---

### ~~Gap 16 — No Loading States or Spinners~~ (Done)

**Status.** Implemented. `InventoryPage` and `SessionsPage` now show a centered `CircularProgress`
spinner while data loads on mount. All form dialogs (`GameForm`, `SessionForm`) accept a `saving`
prop that disables Cancel/Submit buttons and shows a spinner on the submit button during API calls.
`ConfirmDialog` accepts a `loading` prop that disables both buttons and shows a spinner on the
confirm button during delete operations. `ExpansionList` has its own local `saving` state for
add/delete operations. All async handlers use try/finally to ensure loading states are always
cleared. Files changed: `web/src/pages/InventoryPage.tsx`, `web/src/pages/SessionsPage.tsx`,
`web/src/components/games/GameForm.tsx`, `web/src/components/sessions/SessionForm.tsx`,
`web/src/components/common/ConfirmDialog.tsx`, `web/src/components/games/ExpansionList.tsx`.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — users double-click save buttons, assume the app is broken on slow connections, and have no confidence that their action worked |
| **Technical Complexity** | Low — add a `loading` boolean to each page/form; show an MUI `<CircularProgress>` or `<Skeleton>` while loading; disable submit buttons during requests |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P1~~ Done |

---

### ~~Gap 17 — No Success/Error Feedback (Toast Notifications)~~ (Done)

**Status.** Implemented. A `SnackbarProvider` context (`web/src/context/SnackbarContext.tsx`) wraps the
entire application in `App.tsx`, exposing a `useSnackbar()` hook with `showSnackbar(message, severity)`.
All create, update, delete, and seed operations in `InventoryPage`, `SessionsPage`, and `ExpansionList`
now show a success toast on completion and an error toast with a user-friendly message on failure.
Error messages are extracted from Axios responses via `extractErrorMessage()` (`web/src/utils/errors.ts`),
which handles FastAPI string details, validation error arrays, and generic `Error` instances. The snackbar
uses MUI `Alert` (filled variant) with auto-hide after 4 seconds, anchored bottom-center. Covered by
frontend unit tests (`web/src/utils/errors.test.ts`).

| Attribute | Detail |
|---|---|
| **Business Impact** | High — silent failures mean corrupted or lost data goes unnoticed; users cannot distinguish success from failure |
| **Technical Complexity** | Low — add a global MUI `<Snackbar>` provider with success/error variants; fire it after every create/update/delete operation |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P1~~ Done |

---

### ~~Gap 18 — Mobile Navigation Bar Overflow~~ (Done)

**Status.** Implemented. `AppShell.tsx` now uses `useMediaQuery(theme.breakpoints.down("sm"))` to
detect viewports below 600px. On mobile, the inline nav items are replaced with a hamburger
`IconButton` (`MenuIcon`) that opens a right-anchored temporary `Drawer` (width 260px). The drawer
contains: role chip (Admin/Guest) at top, navigation items (Inventory with `SportsEsportsIcon`,
Sessions with `HistoryIcon`), export options (admin only, with `FileDownloadIcon` and loading state),
and Logout (`LogoutIcon`). Clicking any nav item closes the drawer and navigates. The desktop layout
(≥ 600px) is unchanged. All existing functionality (export with loading/snackbar, auth-based
visibility) is preserved. File changed: `web/src/components/layout/AppShell.tsx`.

| Attribute | Detail |
|---|---|
| **Business Impact** | High — game night scoring is a primary mobile use case; the app is effectively broken on phones |
| **Technical Complexity** | Medium — replace the inline link layout with a hamburger menu (`<Drawer>`) on small screens, or use MUI responsive AppBar patterns with `useMediaQuery` |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P1~~ Done |

---

### ~~Gap 19 — Sessions Table Not Responsive~~ (Done)

**Status.** Implemented. `SessionList.tsx` now uses `useMediaQuery(theme.breakpoints.down("sm"))` to
conditionally render a card-based layout on viewports below 600px. A new `SessionCard` component
(`web/src/components/sessions/SessionCard.tsx`) displays each session as an MUI `Card` with
`CardActionArea` (click opens detail modal) showing the game name, date, player chips (winners
highlighted with `color="primary"`), and an explicit winner line. Admin users see a delete
`IconButton` in `CardActions`, naturally isolated from the card click area. On desktop (≥ 600px),
the existing table layout is unchanged. Both layouts share a `Paper` wrapper and `TablePagination`.
Files changed: `web/src/components/sessions/SessionCard.tsx` (new),
`web/src/components/sessions/SessionList.tsx`.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — session history is unreadable on mobile; delete is inaccessible |
| **Technical Complexity** | Medium — either switch to a card-based layout on small screens, add visible horizontal scroll indicators, or use a responsive table pattern that stacks columns vertically |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P1~~ Done |

---

### ~~Gap 20 — No Accessibility (a11y) Support~~ (Done)

**Status.** Implemented. All icon buttons now have `aria-label` attributes and `<Tooltip>` wrappers
for screen reader and hover-text support. A skip-to-content link (visually hidden, visible on focus)
was added to `AppShell.tsx` before the `<AppBar>`, targeting `<Box component="main" id="main-content">`.
Desktop and mobile navigation sections are wrapped in `<nav aria-label="Main navigation">` landmarks.
The MUI theme (`App.tsx`) now includes a global `MuiButtonBase` style override with a 2px primary-colour
`:focus-visible` outline for enhanced keyboard navigation visibility. FABs on `InventoryPage` and
`SessionsPage` have `aria-label` attributes. Files changed: `web/src/App.tsx`,
`web/src/components/layout/AppShell.tsx`, `web/src/components/games/GameCard.tsx`,
`web/src/components/sessions/SessionCard.tsx`, `web/src/components/sessions/SessionList.tsx`,
`web/src/components/players/PlayerList.tsx`, `web/src/components/games/ExpansionList.tsx`,
`web/src/components/games/GameForm.tsx`, `web/src/pages/InventoryPage.tsx`,
`web/src/pages/SessionsPage.tsx`. Covered by 7 E2E regression tests
(`e2e-test/tests/test_accessibility.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — the app is inaccessible to users relying on assistive technology; icon-only buttons are also confusing for sighted users unfamiliar with the icons |
| **Technical Complexity** | Low-Medium — add `aria-label` to all `<IconButton>` components; add `<Tooltip>` wrappers for icon buttons; add a skip-to-content link; verify focus management in dialogs |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P2~~ Done |

---

### ~~Gap 21 — Player Management (Rename / Delete)~~ (Done)

**Status.** Implemented. `PUT /api/players/{player_id}` (rename, 409 on duplicate) and
`DELETE /api/players/{player_id}` (cascade to session_players) endpoints added to
`app/app/routers/sessions.py`. `GET /api/players` now returns `PlayerReadWithCount` with a
`session_count` field via a subquery join. New schemas `PlayerUpdate` and `PlayerReadWithCount`
in `app/app/schemas/session.py`. Frontend: new `/players` route with `PlayersPage`
(`web/src/pages/PlayersPage.tsx`) showing a responsive `PlayerList`
(`web/src/components/players/PlayerList.tsx`) — table on desktop, cards on mobile. Admin users
can inline-rename (click edit → TextField → Enter/Escape) and delete players with a cascade
warning via `ConfirmDialog`. Guest view is read-only. "Players" nav link added to `AppShell`
(desktop toolbar and mobile drawer with `PeopleIcon`). Covered by 10 E2E integration tests
(`e2e-test/tests/test_player_management.py`) and 3 frontend unit tests for
`buildPlayerDeleteMessage` in `web/src/components/common/ConfirmDialog.test.ts`.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — typos accumulate over time; duplicate or stale player names clutter the session form; no way to merge two entries for the same person |
| **Technical Complexity** | Medium — new API endpoints for player CRUD; a player management section (could be inline on a settings page or a dedicated route); cascade/reassign logic for sessions when a player is renamed or deleted |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P1~~ Done |

---

### ~~Gap 22 — Session Detail Modal Lacks Context~~ (Done)

**Status.** Implemented. The `SessionDetail` modal now has three improvements:
(1) **Winner highlighting** — winning player rows have a light primary-colour background,
bold name and score, and an `EmojiEventsIcon` (trophy) replacing the plain "Winner" chip.
Winner column headers in the Score Breakdown table are bold and use primary colour.
(2) **Clickable game name** — the game name in the dialog title is now an `MuiLink` that
closes the modal and navigates to `/inventory?search={gameName}`. `InventoryPage` reads
the `search` URL parameter on mount to seed its search field, enabling cross-navigation.
(3) **Styled notes and expansions** — both sections are wrapped in tinted `Box` containers
(`bgcolor: action.hover`) with icon headers (`NotesIcon`, `ExtensionIcon`) and `subtitle2`
labels. Expansion chips use `variant="outlined"` for a lighter look.
Files changed: `web/src/components/sessions/SessionDetail.tsx`,
`web/src/pages/InventoryPage.tsx`. Covered by 9 E2E integration tests
(`e2e-test/tests/test_session_detail_context.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | Low-Medium — the detail view is functional but feels thin; cross-navigation between games and sessions would make history exploration natural |
| **Technical Complexity** | Low — add clickable game name links, render notes/expansions more prominently, visually highlight winning player rows |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P2~~ Done |

---

### ~~Gap 23 — Game Card Shows No Session History~~ (Done)

**Status.** Implemented. `session_count` (int, default 0) and `last_played_at` (datetime, nullable)
fields added to the `GameRead` schema (`app/app/schemas/game.py`). Both `GET /api/games` and
`GET /api/games/{id}` now return these fields, computed via a lightweight aggregation query
(`COUNT` + `MAX(played_at)`) over `game_sessions` using a shared `_load_session_stats` helper
in `app/app/routers/games.py`. Games with no sessions return `session_count=0` and
`last_played_at=null`. The `GameCard` component (`web/src/components/games/GameCard.tsx`) displays
a body2 text line below the chip stack: "Played N times · Last: date" or "Never played".
Date formatting uses `formatLastPlayed()` from `web/src/utils/stats.ts`. A pre-existing bug in
`delete_session` (missing `.unique()` call) was fixed in `app/app/routers/sessions.py`. Covered
by 3 backend unit tests (`app/tests/test_game_schema.py`), 2 frontend unit tests
(`web/src/utils/stats.test.ts`), and 8 E2E integration tests
(`e2e-test/tests/test_game_session_history.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — "what should we play tonight?" requires switching between pages and scanning; a "Last played: 3 weeks ago" line on each card would answer the question at a glance |
| **Technical Complexity** | Low-Medium — add a `session_count` and `last_played_at` to the game list API response (or a lightweight `/api/games/{id}/summary` endpoint); display on `GameCard` |
| **Dependencies / Prerequisites** | None; lighter-weight than full Statistics (Gap 3) |
| **Suggested Priority** | ~~P2~~ Done |

---

### ~~Gap 24 — Password Field UX / Onboarding~~ (Done)

**Status.** Implemented. The `LoginPage` password field now includes: (1) a show/hide toggle
using `Visibility`/`VisibilityOff` icons in an `InputAdornment` with dynamic `aria-label`,
(2) helper text explaining the shared household password model, (3) `autoComplete="current-password"`
and `name="password"` attributes for browser password manager integration, and (4) a guidance
`Typography` element below the title providing first-time user context about admin vs guest
access. File changed: `web/src/pages/LoginPage.tsx`. Covered by 2 E2E regression tests
(`e2e-test/tests/test_password_field_ux.py`).

| Attribute | Detail |
|---|---|
| **Business Impact** | Low — confusing for first-time setup; no onboarding guidance |
| **Technical Complexity** | Low — add helper text explaining the shared password model; add a show/hide toggle icon; ensure `autocomplete="current-password"` for browser integration |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | ~~P2~~ Done |

---

## Gap Summary

| # | Feature | Priority | Complexity | Depends On |
|---|---|---|---|---|
| 1 | ~~Expansion Scoring Patches~~ | ~~P0~~ Done | Low | — |
| 2 | ~~Session Editing~~ | ~~P0~~ Done | Medium | — |
| 3 | ~~Statistics and Analytics~~ | ~~P1~~ Done | Medium | Gap 2 |
| 4 | ~~Search and Filtering~~ | ~~P1~~ Done | Low | — |
| 5 | ~~Pagination~~ | ~~P1~~ Done | Low | Gap 4 (ideally) |
| 6 | ~~Data Export and Backup~~ | ~~P1~~ Done | Low-Medium | — |
| 7 | ~~Per-Player Profiles~~ | ~~P2~~ Done | Medium | Gap 3 |
| 8 | ~~Game Ratings and Notes~~ | ~~P2~~ Done | Low | — |
| 9 | ~~Tags and Categories~~ | ~~P2~~ Done | Medium | Gap 4 |
| 10 | ~~Game Cover Images~~ | ~~P2~~ Done | Medium | — |
| 11 | ~~BoardGameGeek Integration~~ | ~~P2~~ Done | High | Gap 10 |
| 12 | ~~Multiple Admin Accounts~~ | ~~P3~~ Will Not Do | High | — |
| 13 | ~~PWA and Offline Support~~ | ~~P3~~ Will Not Do | High | — |
| 14 | AI Image-Based Scoring | P3 | Very High | Gaps 2, 10 |
| 15 | ~~Delete Confirmation Dialogs~~ | ~~P0~~ Done | Low | — |
| 16 | ~~Loading States / Spinners~~ | ~~P1~~ Done | Low | — |
| 17 | ~~Success/Error Toast Notifications~~ | ~~P1~~ Done | Low | — |
| 18 | ~~Mobile Navigation Bar Overflow~~ | ~~P1~~ Done | Medium | — |
| 19 | ~~Sessions Table Not Responsive~~ | ~~P1~~ Done | Medium | — |
| 20 | ~~Accessibility (a11y) Support~~ | ~~P2~~ Done | Low-Medium | — |
| 21 | ~~Player Management (Rename/Delete)~~ | ~~P1~~ Done | Medium | — |
| 22 | ~~Session Detail Modal Lacks Context~~ | ~~P2~~ Done | Low | — |
| 23 | ~~Game Card Shows No Session History~~ | ~~P2~~ Done | Low-Medium | — |
| 24 | ~~Password Field UX / Onboarding~~ | ~~P2~~ Done | Low | — |
