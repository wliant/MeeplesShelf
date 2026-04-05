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

### Gap 2 — Session Editing

**Description.** There is no `PUT /api/sessions/{id}` endpoint and no edit path in the
frontend. A user who logs a session with incorrect scores must delete the entire record and
re-create it from scratch, losing any notes and the original timestamp. This is a significant
data-integrity concern for groups maintaining an accurate long-term history.

| Attribute | Detail |
|---|---|
| **Business Impact** | High — entry mistakes are inevitable; forcing delete-and-recreate discourages accurate record-keeping and erodes trust in historical data |
| **Technical Complexity** | Medium — requires a new `PUT` route that recalculates totals and winners, and pre-populating the existing `SessionForm` component for editing |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P0 — foundational data quality issue |

---

### Gap 3 — Statistics and Analytics

**Description.** No aggregated statistics are available anywhere in the application. Users
cannot see win rates per player, most-played games, score trends over time, head-to-head
records, average session duration, or any other derived insight. The raw session data exists
in the database but is never surfaced analytically.

| Attribute | Detail |
|---|---|
| **Business Impact** | High — the primary long-term value of a play tracker is answering "who is actually better at Catan?" and "what do we play most?"; without this, the app is a log with no payoff |
| **Technical Complexity** | Medium — new `/api/stats` endpoints using SQL aggregations (window functions, GROUP BY); chart rendering in the frontend (e.g. Recharts); a dedicated Stats page or dashboard section |
| **Dependencies / Prerequisites** | Sufficient accumulated session history for stats to be meaningful; Session Editing (Gap 2) to ensure data is accurate before surfacing it |
| **Suggested Priority** | P1 |

---

### Gap 4 — Search and Filtering

**Description.** All list views (inventory, sessions) return the full unfiltered dataset.
There is no search box in the game inventory, no way to filter sessions by game or player,
and no way to sort by any column other than the server-side default. Discoverability
degrades linearly as the collection grows.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — a collection of 30+ games or 100+ sessions becomes unwieldy to navigate without filtering |
| **Technical Complexity** | Low — add optional query parameters (`name`, `game_id`, `player_id`, date range) to `GET /api/games` and `GET /api/sessions`; add a filter/search bar to `InventoryPage` and `SessionsPage` |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P1 |

---

### Gap 5 — Pagination

**Description.** All list endpoints fetch every row from the database in a single query.
With a large session history (hundreds of records), this causes slow initial page loads and
unnecessarily large API payloads. Sessions include eager-loaded relationships (game, players,
expansions), amplifying the cost.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — performance degrades noticeably at scale; the problem grows silently over time |
| **Technical Complexity** | Low — SQLAlchemy `offset`/`limit` on list queries; return `total` count alongside results; implement page controls or infinite scroll in the frontend |
| **Dependencies / Prerequisites** | Search and Filtering (Gap 4) should be implemented together or after, as pagination and filtering are typically designed as a unit |
| **Suggested Priority** | P1 |

---

### Gap 6 — Data Export and Backup

**Description.** There is no mechanism to export data from the application. Users running a
self-hosted instance have no way to take a portable backup of their game library and session
history other than directly accessing the PostgreSQL container. This creates a single point
of failure and makes migration to a new server difficult.

| Attribute | Detail |
|---|---|
| **Business Impact** | High — data loss from a failed Docker volume is unrecoverable; export is also needed for sharing history (spreadsheet analysis, archival) |
| **Technical Complexity** | Low-Medium — `GET /api/export` endpoints returning JSON (full fidelity) and optionally CSV (sessions and scores); a download button in the frontend settings or admin panel |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P1 |

---

### Gap 7 — Per-Player Profile and Statistics

**Description.** Players exist only as names in a global registry. There is no player
profile page, no view of a specific player's game history, win rate across different games,
score progression over time, or head-to-head record against other players.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — individual stats create engagement and friendly competition; groups often care about "who is the best Catan player" as much as aggregate history |
| **Technical Complexity** | Medium — new `PlayerPage` route; `GET /api/players/{id}/stats` endpoint aggregating wins, games played, average scores per game; charts reusing Stats infrastructure |
| **Dependencies / Prerequisites** | Statistics infrastructure (Gap 3) |
| **Suggested Priority** | P2 |

---

### Gap 8 — Game Ratings and Personal Notes

**Description.** Games in the inventory have no qualitative metadata beyond the scoring
spec. There is no way to record how much the group enjoys a game, leave impressions after
play, or tag a game as "we should play this again soon." This limits the usefulness of the
inventory as a decision-support tool when choosing what to play next.

| Attribute | Detail |
|---|---|
| **Business Impact** | Low-Medium — improves the inventory page from a pure catalogue into a living reference for the group's taste |
| **Technical Complexity** | Low — add a `rating` (numeric 1–10) and `notes` (text) column to the `games` table via an Alembic migration; surface a star/number rating widget and notes field in `GameCard` and `GameForm` |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P2 |

---

### Gap 9 — Tags and Categories

**Description.** There is no way to classify games by genre, weight, theme, estimated play
time, or any other attribute. The inventory is a flat, unsorted list. Browsing a diverse
collection for a quick game, a heavyweight euro, or a specific theme is impossible without
external references.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — tags become the primary navigation mechanism once a collection grows beyond casual recall |
| **Technical Complexity** | Medium — new `tags` table; `game_tags` M:M junction; tag management UI in `GameForm`; tag-based filter chips in `InventoryPage` |
| **Dependencies / Prerequisites** | Search and Filtering (Gap 4) for the filter UI pattern |
| **Suggested Priority** | P2 |

---

### Gap 10 — Game Cover Images

**Description.** Game cards display only text (name, player count, scoring field count).
There are no thumbnails or cover art. For households with large collections, visual
recognition of game box art significantly speeds up browsing and makes the inventory feel
like a real shelf rather than a database table.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — visual identity improves usability and emotional engagement with the app |
| **Technical Complexity** | Medium — file upload endpoint (`POST /api/games/{id}/image`); store images on a mounted Docker volume; serve via a static file route; display in `GameCard` with an `<img>` element and fallback placeholder |
| **Dependencies / Prerequisites** | None; can be implemented independently before BoardGameGeek integration |
| **Suggested Priority** | P2 |

---

### Gap 11 — BoardGameGeek (BGG) Integration

**Description.** All game metadata (name, player counts, scoring spec) must be entered
manually. BoardGameGeek's public XML API (BGGAPI2) provides rich game data including
canonical names, player counts, descriptions, and cover art for virtually every published
board game. Integrating with BGG would dramatically reduce setup time for new games.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium-High — manual game setup is the highest-friction part of onboarding; a BGG search-and-import flow would reduce it to a few clicks for supported games |
| **Technical Complexity** | High — BGG XML API integration in the backend; name search + game lookup; mapping BGG fields to internal schema; image download and storage; scoring spec still requires manual configuration (BGG has no machine-readable scoring rules) |
| **Dependencies / Prerequisites** | Game Cover Images (Gap 10) for the image display component |
| **Suggested Priority** | P2 |

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

### Gap 16 — No Loading States or Spinners

**Description.** When navigating to the Inventory or Sessions page, data is fetched on mount
with no visual feedback. The page renders empty and then pops in content once the API
responds. Form submissions (create game, log session) also have no loading indicator — the
user cannot tell whether a save is in progress, succeeded, or failed.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — users double-click save buttons, assume the app is broken on slow connections, and have no confidence that their action worked |
| **Technical Complexity** | Low — add a `loading` boolean to each page/form; show an MUI `<CircularProgress>` or `<Skeleton>` while loading; disable submit buttons during requests |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P1 |

---

### Gap 17 — No Success/Error Feedback (Toast Notifications)

**Description.** There are no toast or snackbar notifications anywhere in the application.
When a game is created, a session is saved, or a deletion succeeds, the dialog simply closes
and the list refreshes. There is no visible confirmation of success. API errors fail silently
— if a session save returns a 500, the user sees nothing; the dialog stays open with no
message.

| Attribute | Detail |
|---|---|
| **Business Impact** | High — silent failures mean corrupted or lost data goes unnoticed; users cannot distinguish success from failure |
| **Technical Complexity** | Low — add a global MUI `<Snackbar>` provider with success/error variants; fire it after every create/update/delete operation |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P1 |

---

### Gap 18 — Mobile Navigation Bar Overflow

**Description.** On viewports narrower than ~500px (typical phone), the AppBar items
("MeeplesShelf", "INVENTORY", "SESSIONS", "Admin", "LOGOUT") overflow horizontally. Text
overlaps and the "LOGOUT" button is clipped off-screen. The navigation is unusable on mobile
without horizontal scrolling.

| Attribute | Detail |
|---|---|
| **Business Impact** | High — game night scoring is a primary mobile use case; the app is effectively broken on phones |
| **Technical Complexity** | Medium — replace the inline link layout with a hamburger menu (`<Drawer>`) on small screens, or use MUI responsive AppBar patterns with `useMediaQuery` |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P1 |

---

### Gap 19 — Sessions Table Not Responsive

**Description.** The sessions list uses a `<Table>` layout that does not adapt to narrow
screens. On mobile, the "Winner" and "Actions" columns are clipped off the right edge with
no horizontal scroll affordance. Users cannot see who won or delete sessions on their phone.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — session history is unreadable on mobile; delete is inaccessible |
| **Technical Complexity** | Medium — either switch to a card-based layout on small screens, add visible horizontal scroll indicators, or use a responsive table pattern that stacks columns vertically |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P1 |

---

### Gap 20 — No Accessibility (a11y) Support

**Description.** Icon buttons (edit, delete, expand) have no `aria-label` attributes — screen
readers announce them as unlabelled buttons. There is no skip-to-content link, no landmark
roles beyond basic semantic HTML, no visible focus indicators beyond browser defaults, and
no keyboard navigation shortcuts. The delete and edit icons are visually ambiguous without
hover tooltips.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — the app is inaccessible to users relying on assistive technology; icon-only buttons are also confusing for sighted users unfamiliar with the icons |
| **Technical Complexity** | Low-Medium — add `aria-label` to all `<IconButton>` components; add `<Tooltip>` wrappers for icon buttons; add a skip-to-content link; verify focus management in dialogs |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P2 |

---

### Gap 21 — Player Management (Rename / Delete)

**Description.** Players can be created on-the-fly during session entry, but there is no UI
or API to rename or delete a player. A misspelled name (e.g., "Alic" instead of "Alice")
stays forever and pollutes the autocomplete. There is no `GET /api/players/{id}`,
`PUT /api/players/{id}`, or `DELETE /api/players/{id}` endpoint, and no player management
page in the frontend.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — typos accumulate over time; duplicate or stale player names clutter the session form; no way to merge two entries for the same person |
| **Technical Complexity** | Medium — new API endpoints for player CRUD; a player management section (could be inline on a settings page or a dedicated route); cascade/reassign logic for sessions when a player is renamed or deleted |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P1 |

---

### Gap 22 — Session Detail Modal Lacks Context

**Description.** The session detail modal shows only a summary table and score breakdown, but
is missing several useful details: which expansions were used (chips exist in code but only
render if present), the session notes (same), and no visual distinction for the winner beyond
a small "Winner" chip. There is also no way to navigate from a session detail to the
associated game's inventory card, or vice versa.

| Attribute | Detail |
|---|---|
| **Business Impact** | Low-Medium — the detail view is functional but feels thin; cross-navigation between games and sessions would make history exploration natural |
| **Technical Complexity** | Low — add clickable game name links, render notes/expansions more prominently, visually highlight winning player rows |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P2 |

---

### Gap 23 — Game Card Shows No Session History

**Description.** A game card in the inventory shows only its name, player range, and scoring
field count. There is no indication of how many times it has been played, when it was last
played, or who usually wins. The inventory and sessions pages are entirely disconnected — you
must mentally cross-reference them.

| Attribute | Detail |
|---|---|
| **Business Impact** | Medium — "what should we play tonight?" requires switching between pages and scanning; a "Last played: 3 weeks ago" line on each card would answer the question at a glance |
| **Technical Complexity** | Low-Medium — add a `session_count` and `last_played_at` to the game list API response (or a lightweight `/api/games/{id}/summary` endpoint); display on `GameCard` |
| **Dependencies / Prerequisites** | None; lighter-weight than full Statistics (Gap 3) |
| **Suggested Priority** | P2 |

---

### Gap 24 — Password Field Not Masked Properly

**Description.** The admin password input on the login page uses a standard `<TextField>`
with no `type="password"` — or if it does, there is no show/hide toggle. The field label
says "Admin Password" but there is no indication of what the password is for (e.g., "Enter
the shared household password"). First-time users have no guidance on what credential to
enter or how to obtain it.

| Attribute | Detail |
|---|---|
| **Business Impact** | Low — confusing for first-time setup; no onboarding guidance |
| **Technical Complexity** | Low — add helper text explaining the shared password model; add a show/hide toggle icon; ensure `autocomplete="current-password"` for browser integration |
| **Dependencies / Prerequisites** | None |
| **Suggested Priority** | P2 |

---

## Gap Summary

| # | Feature | Priority | Complexity | Depends On |
|---|---|---|---|---|
| 1 | ~~Expansion Scoring Patches~~ | ~~P0~~ Done | Low | — |
| 2 | Session Editing | P0 | Medium | — |
| 3 | Statistics and Analytics | P1 | Medium | Gap 2 |
| 4 | Search and Filtering | P1 | Low | — |
| 5 | Pagination | P1 | Low | Gap 4 (ideally) |
| 6 | Data Export and Backup | P1 | Low-Medium | — |
| 7 | Per-Player Profiles | P2 | Medium | Gap 3 |
| 8 | Game Ratings and Notes | P2 | Low | — |
| 9 | Tags and Categories | P2 | Medium | Gap 4 |
| 10 | Game Cover Images | P2 | Medium | — |
| 11 | BoardGameGeek Integration | P2 | High | Gap 10 |
| 12 | ~~Multiple Admin Accounts~~ | ~~P3~~ Will Not Do | High | — |
| 13 | ~~PWA and Offline Support~~ | ~~P3~~ Will Not Do | High | — |
| 14 | AI Image-Based Scoring | P3 | Very High | Gaps 2, 10 |
| 15 | ~~Delete Confirmation Dialogs~~ | ~~P0~~ Done | Low | — |
| 16 | Loading States / Spinners | P1 | Low | — |
| 17 | Success/Error Toast Notifications | P1 | Low | — |
| 18 | Mobile Navigation Bar Overflow | P1 | Medium | — |
| 19 | Sessions Table Not Responsive | P1 | Medium | — |
| 20 | Accessibility (a11y) Support | P2 | Low-Medium | — |
| 21 | Player Management (Rename/Delete) | P1 | Medium | — |
| 22 | Session Detail Modal Lacks Context | P2 | Low | — |
| 23 | Game Card Shows No Session History | P2 | Low-Medium | — |
| 24 | Password Field UX / Onboarding | P2 | Low | — |
