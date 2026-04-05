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

Persistent layout component rendered for all authenticated routes.

**Structure:**
- `AppBar` (position: static, primary colour)
  - App name: "MeeplesShelf" (h6 Typography)
  - Nav button: "Inventory" → `/inventory`
  - Nav button: "Sessions" → `/sessions`
  - Role chip: "Admin" or "Guest" (small, semi-transparent white background)
  - "Logout" button → calls `auth.logout()` + `navigate("/login")`
- `Box` main content area (`flexGrow: 1, p: 3`) renders `<Outlet />`

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

**URL:** `/inventory`

**Data fetched on mount:** `GET /api/games` → `Game[]`

### Search bar

A `TextField` (small, full-width) with a search icon appears below the heading when not loading. Placeholder: "Search games...". Filters the game list client-side by case-insensitive substring match on game name using `filterGamesByName()` from `utils/filters.ts`. When the search matches no games but games exist, a "No games match your search" message is shown instead of the grid.

### Admin view

- Heading: "Game Inventory" (h4)
- **Seed button** (outlined): visible only when `isAdmin && games.length === 0`. Calls `POST /api/seed`.
- Search bar (see above)
- `GameList` grid of `GameCard` components (filtered by search)
- Floating Action Button (FAB, primary, fixed bottom-right, `+` icon): opens `GameForm` in "add" mode

### Guest view

- Heading: "Game Inventory" (h4)
- Search bar (see above)
- `GameList` grid (read-only — no edit/delete controls, no FAB, no seed button)

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
- Player count chip: e.g. "3-4 players" (outlined)
- Scoring fields chip: e.g. "5 scoring fields" (primary colour, filled) — only if `scoring_spec` exists and has fields
- Admin-only row:
  - Edit icon button (pencil) → opens `GameForm` in "edit" mode with game pre-populated
  - Delete icon button (trash) → opens a `ConfirmDialog` ("Delete Game") with cascade warning; on confirm calls `DELETE /api/games/{id}`
- Expand/collapse chevron button (always visible)

**Collapsible section (expansion list):**
- Toggled by clicking the chevron button
- Renders `<ExpansionList game={game} onRefresh={onRefresh} isAdmin={isAdmin} />`

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
- `GET /api/sessions` → `GameSession[]`
- `GET /api/games` → `Game[]` (for session form dropdown)

### Filter bar

A responsive `Stack` (column on mobile, row on desktop) below the heading with:
1. **Game filter** — `Autocomplete` (small) populated from loaded games. Filters sessions server-side via `game_id` query param.
2. **From date** — `TextField` (type=date, label "From"). Filters sessions server-side via `date_from` query param.
3. **To date** �� `TextField` (type=date, label "To"). Filters sessions server-side via `date_to` query param.
4. **Player search** — `TextField` (small) with search icon, placeholder "Search by player...". Filters sessions client-side by case-insensitive substring match on player names using `filterSessionsByPlayerName()` from `utils/filters.ts`.
5. **Clear Filters** button — visible only when any filter is active. Resets all filters to defaults.

Server-side filters (game, dates) trigger an API re-fetch. Player search is instant (client-side). When filters match no sessions, "No sessions match your filters." is shown.

### Admin view

- Heading: "Game Sessions" (h4)
- Filter bar (see above)
- `SessionList` table with Actions column (showing filtered results)
- FAB (primary, fixed bottom-right, `+` icon): opens `SessionForm`

### Guest view

- Heading: "Game Sessions" (h4)
- Filter bar (see above)
- `SessionList` table — no Actions column, no FAB

---

## SessionList

**Props:** `sessions`, `onDelete`, `onSelect`, `isAdmin`

**Empty state:** Typography "No sessions logged yet." (secondary colour)

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

---

## SessionDetail (modal dialog)

Read-only detail view. Opens when a row is clicked in `SessionList`.

**Props:** `session`, `onClose`, `onEdit?`, `isAdmin?`

**Title:** "{game.name} — {played_at toLocaleDateString()}"

**Contents (top to bottom):**
1. Notes (if `session.notes` is not null): displayed as body text
2. Expansions used (if any): chips with expansion names
3. Summary table:
   - Columns: Player | Total Score | Winner
   - "Winner" cell shows a filled primary-colour chip labelled "Winner" for winning players
4. "Score Breakdown" heading (if `players[0].score_data` has entries)
5. Score Breakdown table:
   - Columns: Category | one column per player
   - Rows: one per key in `score_data` (displayed as-is)
   - Cell values formatted: booleans → "Yes"/"No", objects → JSON string, numbers → number
6. Actions: "Edit" button (admin only, calls `onEdit(session)`) + "Close" button

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
| FAB on SessionsPage | Visible | Hidden |
| SessionForm dialog | Accessible | Not accessible |
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
