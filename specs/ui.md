# MeeplesShelf — Frontend UI Specification

---

## Theme

| Token | Value |
|---|---|
| Primary colour | `#5c6bc0` (MUI indigo 400) |
| Secondary colour | `#ff7043` (MUI deep orange 400) |
| CSS baseline | Enabled (MUI `CssBaseline`) |

---

## Routing

| Path | Component | Auth guard | Notes |
|---|---|---|---|
| `/login` | `LoginPage` | Public | Redirect destination after logout |
| `/inventory` | `InventoryPage` inside `AppShell` | `RequireAuth` | Default landing page |
| `/sessions` | `SessionsPage` inside `AppShell` | `RequireAuth` | — |
| `/players` | `PlayersPage` inside `AppShell` | `RequireAuth` | — |
| `/statistics` | `StatisticsPage` inside `AppShell` | `RequireAuth` | — |
| `*` (any other) | — | `RequireAuth` | Redirects to `/inventory` |

`RequireAuth` redirects to `/login` when `role === null`. Both `admin` and `guest` pass through.

---

## Provider Tree

```
<ThemeProvider>
  <CssBaseline />
  <SnackbarProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/sessions"  element={<SessionsPage />} />
              <Route path="/players"   element={<PlayersPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="*"          element={<Navigate to="/inventory" />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </SnackbarProvider>
</ThemeProvider>
```

---

## AppShell

Persistent layout component rendered for all authenticated routes. Responsive: uses `useMediaQuery(theme.breakpoints.down("sm"))` to switch between desktop (inline nav) and mobile (hamburger + Drawer) layouts at the 600px breakpoint.

**Desktop layout (≥ 600px):**
- `AppBar` (position: static, primary colour)
  - App name: "MeeplesShelf" (h6 Typography)
  - Nav button: "Inventory" → `/inventory`
  - Nav button: "Sessions" → `/sessions`
  - Nav button: "Players" → `/players`
  - Nav button: "Statistics" → `/statistics`
  - Export button (admin only): `FileDownload` icon button → opens a `Menu` dropdown with:
    - "Export JSON (Full Backup)" → downloads `GET /api/export` as blob, saves as `meeplesshelf-export-YYYY-MM-DD.json`
    - "Export Sessions CSV" → downloads `GET /api/export/sessions/csv` as blob, saves as `meeplesshelf-sessions-YYYY-MM-DD.csv`
    - Shows `CircularProgress` spinner on the icon while downloading. Success/error snackbar on completion.
  - Role chip: "Admin" or "Guest" (small, semi-transparent white background)
  - "Logout" button → calls `auth.logout()` + `navigate("/login")`
- `Box` main content area (`flexGrow: 1, p: 3`) renders `<Outlet />`

**Mobile layout (< 600px):**
- `AppBar` contains only app name and a hamburger `IconButton` (`MenuIcon`, `aria-label="Open navigation menu"`)
- Right-anchored temporary `Drawer` (width 260px) containing:
  - Role chip ("Admin" / "Guest") centered at top (outlined, primary colour)
  - Divider
  - Navigation list: "Inventory" (`SportsEsportsIcon`), "Sessions" (`HistoryIcon`), "Players" (`PeopleIcon`), and "Statistics" (`BarChartIcon`) — clicking navigates and closes drawer
  - Divider
  - Export list (admin only): "Export JSON (Full Backup)" and "Export Sessions CSV" (`FileDownloadIcon`) — disabled with `CircularProgress` during export
  - Divider
  - "Logout" (`LogoutIcon`) — closes drawer and logs out

---

## LoginPage

Centered card (width 360px) on a grey background (`grey.100`).

**Elements (top to bottom):**
1. Title: "MeeplesShelf" (h5 Typography, centered)
2. "Continue as Guest" button (outlined, full-width) → `auth.enterAsGuest()` + navigate to `/inventory`
3. Divider with "or" label
4. "Admin Password" text field (type=password, full-width, small size)
5. Error alert (severity=error) — visible only on wrong password; message: "Incorrect password"
6. "Login as Admin" button (contained, full-width) — **disabled** when password field is empty or request is in-flight

**Interactions:**
- Enter key in password field triggers login.
- On successful login: store JWT + set admin role + navigate to `/inventory`.
- On 401: show error alert, stay on login page.

---

## InventoryPage

**URL:** `/inventory` (accepts optional `?search=` query parameter for cross-navigation)

**Data fetched on mount:** `GET /api/games` → `PaginatedResponse[Game]` (page 1 of 20)

### Search bar

A `TextField` (small, full-width) with a search icon appears below the heading when not loading. Placeholder: "Search games...". Filters the game list server-side via the `name` query parameter with a 300ms debounce. Changing the search text resets pagination to page 1. When the search matches no games, a "No games match your search" message is shown instead of the grid.

**URL parameter seeding:** On mount, the `search` URL query parameter (if present) is used to seed the search field. This enables cross-navigation from `SessionDetail` (clicking a game name navigates to `/inventory?search={gameName}`). The URL parameter is cleared after consumption via `setSearchParams({}, { replace: true })` to keep the URL clean while the search remains active.

### Pagination

An MUI `Pagination` component appears below the game grid when the total number of games exceeds the page size (20). Page changes trigger a server re-fetch with the appropriate `skip` offset.

### Admin view

- Heading: "Game Inventory" (h4)
- **Seed button** (outlined): visible only when `isAdmin && total === 0 && !searching`. Calls `POST /api/seed`.
- Search bar (see above)
- `GameList` grid of `GameCard` components
- Pagination controls (see above)
- Floating Action Button (FAB, primary, fixed bottom-right, `+` icon): opens `GameForm` in "add" mode

### Guest view

- Heading: "Game Inventory" (h4)
- Search bar (see above)
- `GameList` grid (read-only — no edit/delete controls, no FAB, no seed button)
- Pagination controls (see above)

---

## GameList

`Grid` container, responsive breakpoints:

| Breakpoint | Columns per card |
|---|---|
| xs (mobile) | 12 (full width) |
| sm (tablet) | 6 (2 per row) |
| md+ (desktop) | 4 (3 per row) |

Renders one `GameCard` per game.

---

## GameCard

**Props:** `game`, `onEdit`, `onDelete`, `onRefresh`, `isAdmin`

**Layout (always visible):**
- Game name (h6 Typography)
- Rating display: MUI `<Rating>` component (`value={game.rating}`, `max={10}`, `readOnly`, `size="small"`) — only shown when `game.rating` is not null
- Player count chip: e.g. "3-4 players" (outlined)
- Scoring fields chip: e.g. "5 scoring fields" (primary colour, filled) — only if `scoring_spec` exists and has fields
- Admin-only row:
  - Edit icon button (pencil) → opens `GameForm` in "edit" mode with game pre-populated
  - Delete icon button (trash) → opens a `ConfirmDialog` ("Delete Game") with cascade warning; on confirm calls `DELETE /api/games/{id}`
- Expand/collapse chevron button (always visible)

**Collapsible section:**
- Toggled by clicking the chevron button
- Notes (if `game.notes` is not null): "Notes" subtitle2 heading + body2 text in secondary colour
- `<ExpansionList game={game} onRefresh={onRefresh} isAdmin={isAdmin} />`

---

## ExpansionList

**Props:** `game`, `onRefresh`, `isAdmin`

**Guest view:**
- Section heading: "Expansions" (secondary colour Typography)
- List of expansion names
- "No expansions" text if empty

**Admin view (adds):**
- Delete icon button (small) next to each expansion name → opens a `ConfirmDialog` ("Delete Expansion"); on confirm calls `DELETE /api/games/{id}/expansions/{eid}`
- Below the list:
  - **Default state:** "Add Expansion" button (small, with `+` icon) → toggles to add form
  - **Add form state:** text field "Expansion name" + "Add" button + "Cancel" button
  - Enter key in text field triggers add
  - On save: calls `POST /api/games/{id}/expansions` then `onRefresh()`

---

## GameForm (dialog)

**Props:** `open`, `game` (null = create mode), `onClose`, `onSave`, `saving?`

**Title:** "Add Game" (create) or "Edit Game" (edit)

**Fields:**

| Field | Type | Default | Validation |
|---|---|---|---|
| Game Name | text | "" | Required; Create/Update button disabled if empty |
| Min Players | number | 1 | — |
| Max Players | number | 4 | — |
| Rating | MUI `<Rating>` (10 stars) | null (no rating) | 1–10 when set; click current value to clear |
| Notes | multiline text | "" | Optional; empty string saved as null |

**Rating and Notes section (between player counts and scoring spec):**
- Rating: MUI `<Rating max={10}>` with "Rating" subtitle. Clicking a star sets the rating; clicking the current value clears it (returns null).
- Notes: `<TextField multiline minRows={2} maxRows={4}>` with placeholder "Personal notes about this game..."

**Scoring Specification section:**
- Section heading: "Scoring Specification"
- "+ ADD SCORING FIELD" button: appends a new field row with defaults `{ id: "", label: "", type: "raw_score", description: "" }`

**Each scoring field row:**
- "Field ID" text input
- "Label" text input
- "Type" select dropdown with options:
  - Raw Score (`raw_score`)
  - Numeric (`numeric`)
  - Boolean (`boolean`)
  - Enum Count (`enum_count`)
  - Set Collection (`set_collection`)
- Delete icon button (removes this field row)
- "Description (optional)" text input (below the first row)

**Type-specific extra inputs** (appear inline when type is selected):
- `numeric`: "Multiplier" number input
- `boolean`: "Points (when true)" number input
- `enum_count`: "Variants" sub-section with add/remove rows (each variant: ID, Label, Points)
- `set_collection`: "Set Values (comma-separated)" text input

**Actions:**
- "Cancel" button → closes dialog, discards changes
- "Create" / "Update" button (disabled if Game Name is empty) → calls API then `onSave()`

---

## SessionsPage

**URL:** `/sessions`

**Data fetched on mount:**
- `GET /api/sessions` → `PaginatedResponse[GameSession]` (page 1 of 20)
- `GET /api/games?limit=100` → `PaginatedResponse[Game]` (for session form dropdown and game filter)

### Filter bar

A responsive `Stack` (column on mobile, row on desktop) below the heading with:
1. **Game filter** — `Autocomplete` (small) populated from loaded games. Filters sessions server-side via `game_id` query param.
2. **From date** — `TextField` (type=date, label "From"). Filters sessions server-side via `date_from` query param.
3. **To date** �� `TextField` (type=date, label "To"). Filters sessions server-side via `date_to` query param.
4. **Player search** — `TextField` (small) with search icon, placeholder "Search by player...". Filters sessions client-side by case-insensitive substring match on player names using `filterSessionsByPlayerName()` from `utils/filters.ts`.
5. **Clear Filters** button — visible only when any filter is active. Resets all filters to defaults.

Server-side filters (game, dates) trigger an API re-fetch and reset pagination to page 1. Player search is instant (client-side, within current page only). When filters match no sessions, "No sessions match your filters." is shown.

### Pagination

`SessionList` includes an MUI `TablePagination` component below the table rows when the total exceeds the page size (20). Page changes trigger a server re-fetch with the appropriate `skip` offset.

### Admin view

- Heading: "Game Sessions" (h4)
- Filter bar (see above)
- `SessionList` table with Actions column and pagination (showing filtered results)
- FAB (primary, fixed bottom-right, `+` icon): opens `SessionForm`

### Guest view

- Heading: "Game Sessions" (h4)
- Filter bar (see above)
- `SessionList` table with pagination — no Actions column, no FAB

---

## SessionList

**Props:** `sessions`, `onDelete`, `onSelect`, `isAdmin`, `total`, `page`, `rowsPerPage`, `onPageChange`

**Empty state:** Typography "No sessions logged yet." (secondary colour)

**Responsive layout:** Uses `useMediaQuery(theme.breakpoints.down("sm"))` to switch between desktop table and mobile card layouts at the 600px breakpoint. Both layouts are wrapped in a shared `Paper variant="outlined"` with shared `TablePagination` below.

### Desktop layout (≥ 600px) — Table

**Table columns:**

| Column | Guest | Admin |
|---|---|---|
| Date | ✓ | ✓ |
| Game | ✓ | ✓ |
| Players | ✓ | ✓ |
| Winner | ✓ | ✓ |
| Actions | — | ✓ |

**Date column:** `toLocaleDateString()` of `played_at`

**Game column:** game name

**Players column:** one chip per player, text = "Name (total_score)" e.g. "Alice (14)"

**Winner column:** comma-separated names of winner(s), or "—" if none

**Actions column (admin only):** delete icon button per row — opens a `ConfirmDialog` ("Delete Session") identifying the game name and date; on confirm calls `DELETE /api/sessions/{id}`

**Row click:** calls `onSelect(session)` to open `SessionDetail` modal. Clicking the delete button stops propagation so it doesn't also open the detail modal.

### Mobile layout (< 600px) — SessionCard

On viewports below 600px, the table is replaced with a vertical `Stack` of `SessionCard` components separated by `Divider`s.

**SessionCard** (`web/src/components/sessions/SessionCard.tsx`):

**Props:** `session`, `onDelete`, `onSelect`, `isAdmin`

Each card uses `CardActionArea` (click → `onSelect`) containing:
- **Header row:** Game name (`subtitle1`, bold) on the left, date (`body2`, secondary) on the right
- **Player chips:** Wrapping `Stack` of `Chip` components — same rendering as the table's Players column (winner chips use `color="primary"`)
- **Winner line:** `Typography` (`body2`) showing "Winner: {names}" in primary colour, or "Winner: -" in secondary colour

Admin cards include a `CardActions` section with a delete `IconButton`. Because `CardActions` is a sibling of `CardActionArea` (not nested), the delete click is naturally isolated without `stopPropagation`.

---

## SessionDetail (modal dialog)

Read-only detail view. Opens when a row is clicked in `SessionList`.

**Props:** `session`, `onClose`, `onEdit?`, `isAdmin?`

**Title:** Game name rendered as a clickable `MuiLink` (underline on hover) that navigates to `/inventory?search={gameName}` and closes the modal. Followed by an em-dash and the session date (`toLocaleDateString()`).

**Contents (top to bottom):**
1. **Notes section** (if `session.notes` is not null): Wrapped in a tinted `Box` (`bgcolor: action.hover`, rounded corners) with a `NotesIcon` + "Notes" subtitle2 heading, followed by body2 text in secondary colour.
2. **Expansions section** (if any): Wrapped in a matching tinted `Box` with an `ExtensionIcon` + "Expansions" subtitle2 heading, followed by outlined `Chip` components with expansion names (flex-wrapped).
3. **Summary table:**
   - Columns: Player | Total Score | Winner
   - Winner rows are highlighted with a light primary-colour background (`~8% alpha`), bold player name and total score, and an `EmojiEventsIcon` (trophy) in the Winner column instead of a text chip.
   - Non-winner rows have normal weight text and an empty Winner cell.
4. **"Score Breakdown" heading** (subtitle2, if `players[0].score_data` has entries)
5. **Score Breakdown table:**
   - Columns: Category | one column per player
   - Winner player column headers are bold and use `primary.main` colour
   - Rows: one per key in `score_data` (displayed as-is)
   - Cell values formatted: booleans → "Yes"/"No", objects → JSON string, numbers → number
6. **Actions:** "Edit" button (admin only, calls `onEdit(session)`) + "Close" button

**Cross-navigation:** Clicking the game name link closes the detail modal and navigates to `/inventory?search={encodedGameName}`. The `InventoryPage` reads the `search` URL parameter on mount to seed its search field, automatically filtering the game list to show the linked game. The URL parameter is cleared after consumption to keep the URL clean.

---

## PlayersPage

**URL:** `/players`

**Data fetched on mount:** `GET /api/players` → `PlayerReadWithCount[]`

### Search bar

A `TextField` (small) with a search icon appears below the heading when not loading. Placeholder: "Search players...". Filters the player list client-side by case-insensitive name substring match.

### Admin view

- Heading: "Players" (h4)
- Search bar (see above)
- `PlayerList` (responsive table/cards with inline rename and delete)

### Guest view

- Heading: "Players" (h4)
- Search bar (see above)
- `PlayerList` (read-only — no edit/delete controls)

---

## PlayerList

**Props:** `players`, `onRename`, `onDelete`, `isAdmin`

**Empty state:** Typography "No players yet. Players are created when you log a game session." (secondary colour)

**Responsive layout:** Uses `useMediaQuery(theme.breakpoints.down("sm"))` to switch between desktop table and mobile card layouts at the 600px breakpoint.

### Desktop layout (≥ 600px) — Table

| Column | Guest | Admin |
|---|---|---|
| Name | ✓ | ✓ (inline-editable) |
| Sessions | ✓ | ✓ |
| Created | ✓ | ✓ |
| Actions | — | ✓ |

**Inline rename (admin only):** Clicking the edit icon replaces the name cell with a TextField (auto-focused, text selected). Enter or blur saves the change; Escape cancels. If the name is unchanged, no API call is made. A 409 error shows an error snackbar.

**Actions column (admin only):** Edit (pencil) and Delete (trash) icon buttons. Delete opens a `ConfirmDialog` ("Delete Player") with a cascade warning built by `buildPlayerDeleteMessage()`.

### Mobile layout (< 600px) — Cards

Each card shows player name, session count, and creation date. Admin cards include edit and delete icon buttons in the header row.

---

## StatisticsPage

**URL:** `/statistics`

**Data fetched on mount:** All four stats endpoints in parallel via `Promise.all`:
- `GET /api/stats/overview` → `OverviewStats`
- `GET /api/stats/players` → `PlayerStats[]`
- `GET /api/stats/games` → `GameStats[]`
- `GET /api/stats/activity` → `ActivityMonth[]`

**Loading state:** Centered `CircularProgress` while fetching.

**Empty state:** When `total_sessions === 0`, displays a `BarChartIcon` (64px, secondary colour), heading "No statistics yet", and text "Log some game sessions to see statistics here."

**Layout (when data is available):**

1. **Heading:** "Statistics" (h4)
2. **OverviewCards** — responsive `Grid` (xs=6, sm=3) of 4 MUI `Card` components:
   - Total Games (`SportsEsportsIcon`)
   - Total Sessions (`HistoryIcon`)
   - Total Players (`PeopleIcon`)
   - Last 30 Days (`TrendingUpIcon`)
   Each card shows the metric as a large h4 number with a label below.
3. **Two-column grid** (xs=12, md=6) in `Paper` containers:
   - **PlayerLeaderboard** — Recharts `BarChart` of top 10 win rates (hidden on mobile < 600px), plus an MUI `Table` with columns: #, Player, Played, Wins, Win Rate (%). Full player list in the table, chart limited to top 10.
   - **MostPlayedGames** — Recharts horizontal `BarChart` of top 10 games by session count (hidden on mobile), plus an MUI `Table` with columns: Game, Sessions, Players, Last Played.
4. **Full-width row** in `Paper`:
   - **ActivityChart** — Recharts `AreaChart` showing sessions per month over the last 12 months. Uses a gradient fill and `ResponsiveContainer` for responsive sizing. Month labels formatted as "Jan 2025".

---

## SessionForm (modal dialog, admin only)

**Props:** `open`, `games`, `onClose`, `onSave`, `editSession?`, `saving?`

Supports two modes:
- **Create mode** (`editSession` is null/undefined): fresh form, title "Log Game Session", button "Save Session"
- **Edit mode** (`editSession` provided): pre-populated from the existing session, title "Edit Game Session", button "Update Session". The game selector is disabled (game is immutable).

**Fields (top to bottom):**

1. **Select Game** — Autocomplete dropdown from `games[]`. Required. Disabled in edit mode.
2. **Played At** — `datetime-local` input, defaults to current local time (create) or session's `played_at` (edit).
3. **Expansions** — Checkboxes for each expansion of the selected game. Pre-checked from session in edit mode.
4. **Add Player** row:
   - Autocomplete (free-solo) over existing players from `GET /api/players`
   - "Add" button: if typed name matches an existing player → use that player; if not → call `POST /api/players` to create, then add
   - Added players shown as removable chips below the input
   - In edit mode, pre-populated with the session's players
5. **ScoreSheet** — appears only when a game is selected AND at least one player has been added (see below). In edit mode, pre-populated with existing score data.
6. **Notes (optional)** — multiline text field

**Actions:**
- "Cancel" → closes dialog, resets form
- "Save Session" / "Update Session" — **disabled** until a game is selected and at least one player added

**On save:** In create mode calls `POST /api/sessions`. In edit mode calls `PUT /api/sessions/{id}` (without `game_id`). Then calls `onSave()`.

---

## ScoreSheet

Renders inside `SessionForm` when a game with a `scoring_spec` is selected and players are present.

**Props:** `spec: ScoringSpec`, `players: Player[]`, `scoreData: Record<playerId, scoreDataObj>`, `onChange`

**Structure:** table
- Header row: "Category" | player name columns
- One data row per scoring field: field label | one `ScoreFieldRenderer` per player
- Footer "Total" row: "Total" | calculated total per player (live, uses `calculateTotal` from `utils/scoring.ts`)

---

## ScoreFieldRenderer

Renders the appropriate input widget for a single player's value for one scoring field.

**Props:** `field: ScoringField`, `value: unknown`, `onChange: (newValue) => void`

| Field type | Widget | Notes |
|---|---|---|
| `raw_score` | Number `TextField` (small) | Helper text: none |
| `numeric` | Number `TextField` (small) | Helper text: "×{multiplier}" |
| `boolean` | `Checkbox` | Label: "(+{value} pts)" |
| `set_collection` | Number `TextField` (small) | Helper text: "max set: {set_values.length - 1}" |
| `enum_count` | Vertical stack of number `TextField`s, one per variant | Each labelled "{variant.label} (+{variant.value} each)" |

If `field.description` is set, the entire widget is wrapped in a MUI `Tooltip` showing the description.

---

## ConfirmDialog (shared component)

**File:** `web/src/components/common/ConfirmDialog.tsx`

**Props:** `open`, `title`, `message`, `confirmLabel` (default "Delete"), `cancelLabel` (default "Cancel"), `loading` (default false), `onConfirm`, `onCancel`

Reusable confirmation dialog used before all destructive operations. Uses `maxWidth="sm"`, `DialogContentText` for the body, and a red confirm button (`variant="contained" color="error"`).

**Message helpers** (exported from the same file):
- `buildGameDeleteMessage(name, expansionCount)` — warns about cascade to expansions and sessions
- `buildSessionDeleteMessage(gameName, playedAt)` — identifies the session by game and date
- `buildExpansionDeleteMessage(expansionName, gameName)` — identifies the expansion and its parent game
- `buildPlayerDeleteMessage(name, sessionCount)` — warns about cascade to session scores when count > 0

---

## Role-Gating Summary

| UI Element | Admin | Guest |
|---|---|---|
| "Seed Default Games" button | Visible (when list empty) | Hidden |
| Edit icon on GameCard | Visible | Hidden |
| Delete icon on GameCard | Visible | Hidden |
| Add Expansion form + delete | Visible | Hidden |
| FAB on InventoryPage | Visible | Hidden |
| GameForm dialog | Accessible | Not accessible |
| "Actions" column in SessionList | Visible | Hidden |
| Edit button in SessionDetail | Visible | Hidden |
| Delete icon on session row | Visible | Hidden |
| Edit/Delete icons in PlayerList | Visible | Hidden |
| Inline rename in PlayerList | Accessible | Not accessible |
| FAB on SessionsPage | Visible | Hidden |
| SessionForm dialog | Accessible | Not accessible |
| Export button in AppShell | Visible | Hidden |
| Role chip in AppShell | "Admin" | "Guest" |

Reading data (games, expansions, sessions, session details) is available to both roles.

---

## Key UX Behaviours

- **Loading spinners:** `InventoryPage` and `SessionsPage` show a centered `CircularProgress` while fetching data. Content replaces the spinner once loaded.
- **Saving indicators:** Form dialogs (`GameForm`, `SessionForm`) and `ConfirmDialog` accept a `saving`/`loading` prop. When active, submit/confirm buttons show an inline `CircularProgress` and all dialog buttons are disabled. The backdrop close is also suppressed. `ExpansionList` manages its own local `saving` state for add/delete operations.
- **Delete confirmation dialogs:** All deletes (games, expansions, sessions) show a `ConfirmDialog` before executing. The game-delete dialog warns about cascade-deleted expansions and sessions. The confirm button is red (`color="error"`).
- **Inline expansion add:** The add-expansion form is toggled within the expanded GameCard — no modal.
- **Live score totals:** `calculateTotal` runs on every score input change; totals update in real time.
- **Free-solo player creation:** Typing a new name in the player autocomplete and clicking "Add" creates the player via API before adding to the session.
- **Toast notifications:** All create, update, delete, and seed operations show a success toast (green filled `Alert`) on completion and an error toast (red filled `Alert`) on failure. Toasts auto-dismiss after 4 seconds and are anchored bottom-center. Error messages are extracted from Axios response `detail` fields (string or validation array) with a fallback to `Error.message`. The `SnackbarProvider` context wraps the entire app; components access it via `useSnackbar()`.
- **Auth persists across reloads:** Role and token are read from `localStorage` on every page load.
- **SPA routing:** All paths not handled by the API fall through to `index.html`; React Router handles the rest.
- **Vite dev proxy:** In development, `vite.config.ts` proxies `/api` requests to `http://localhost:8000`.
