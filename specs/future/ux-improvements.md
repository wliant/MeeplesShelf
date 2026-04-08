# MeeplesShelf — UX Improvement Recommendations

## Methodology

These recommendations are based on a hands-on walkthrough of every page in the application
(Login, Inventory, Sessions, Players, Player Profile, Statistics) under both Admin and Guest
roles, on desktop (1280x900) and mobile (375x812) viewports.

---

## High Priority

### 1. Empty State Messaging

**Where:** All list/grid pages when no data exists  
**Problem:** Pages with no data render as blank white space with empty tables or grids.
New users see no guidance on what to do next, and the app feels broken rather than new.  
**Suggestion:** Add contextual empty states with an illustration or icon and a call-to-action
button:

| Page | Message | CTA |
|------|---------|-----|
| Inventory | "Your shelf is empty." | "Add your first game" (opens Add Game form) |
| Sessions | "No sessions logged yet." | "Log a game session" (opens Log Session form) |
| Players | "No players yet. Players are created when you log sessions." | "Go to Sessions" |
| Statistics | "Play some games to see your stats here!" | "Log a session" |

**Impact:** High — first impression for new users.  
**Effort:** Low — static content with existing action handlers.

---

### 2. Show Tags on Game Cards + Tag Filter

**Where:** Inventory page game cards  
**Problem:** Games support tags (Strategy, Family, Party, etc.) but the cards do not display
them. Users assign tags in the game form but cannot see or use them at a glance. There is
no filter-by-tag UI on the inventory page.  
**Suggestion:**
- Display tag chips on each game card, below the player-count and scoring-field chips.
- Add a horizontal tag filter bar above the game grid (clickable chips for each tag in use).
  Clicking a tag filters the grid to only matching games. Multiple tags should use OR logic.

**Impact:** High — tags become a usable feature instead of write-only metadata.  
**Effort:** Medium — frontend only; tag data is already returned by the API.

---

### 3. Friendly No-Image Placeholder

**Where:** Inventory page game cards  
**Problem:** Games without a cover image display a browser-default broken-image icon (grey
rectangle with a torn-corner graphic). This appears on the majority of games and makes the
entire inventory look broken rather than incomplete.  
**Suggestion:** Replace with a styled placeholder that includes:
- A soft-colored background (derived from the game name hash for variety).
- A generic board game icon (meeple, dice, or game controller) in a lighter shade.
- Alternatively, display the first letter of the game name in large text.

**Impact:** High — most game cards are affected; visual polish is immediate.  
**Effort:** Low — CSS/component change, no backend work.

---

### 4. Richer Session Detail Dialog

**Where:** Session detail modal (click any session row)  
**Problem:** The dialog shows a "Score Breakdown" section with column headers but empty rows
when no per-category scores were entered. The dialog feels sparse and doesn't justify the
click to open it.  
**Suggestion:**
- Always show all scoring field rows (display 0 or "-" for unfilled fields).
- Show the game's cover image thumbnail in the dialog header next to the game name.
- Display session notes if present (currently hidden in the detail view).
- Add relative time ("12 days ago") next to the absolute date.
- Show expansion names as chips if the session used any expansions.

**Impact:** High — the session detail is the deepest view of a play session; it should reward
the click.  
**Effort:** Medium — data is available; layout and rendering changes only.

---

### 5. Sortable Data Tables

**Where:** Sessions list, Players list, Statistics leaderboard and games tables  
**Problem:** No table in the app supports column sorting. Users cannot reorder sessions by
date or game name, players by session count, or statistics by win rate.  
**Suggestion:** Add clickable column headers with ascending/descending sort indicators.
Sensible defaults:
- Sessions: date descending (most recent first — already the case, but make it toggleable)
- Players: name ascending
- Stats leaderboard: win rate descending
- Stats games: session count descending

**Impact:** Medium — standard table UX that users expect.  
**Effort:** Medium — client-side sort for small datasets; server-side for paginated ones.

---

## Medium Priority

### 6. Show Game Rating on Cards

**Where:** Inventory page game cards  
**Problem:** Games have a 0-10 star rating field, but it is only visible inside the edit form.
Users cannot see their own ratings when browsing the collection.  
**Suggestion:** Display a compact star icon with the numeric rating (e.g., a star icon followed
by "7/10") on the game card, near the game title or in the metadata chips row.

**Impact:** Medium — helps users identify favorites at a glance.  
**Effort:** Low — data is already in the game response.

---

### 7. Player Autocomplete in Session Form

**Where:** "Log Game Session" dialog, "Add Player" text field  
**Problem:** The player input is a plain text field with an ADD button. Users must remember
and type exact player names. Typos create duplicate player entries (e.g., "Lian" vs "Linn"
may be the same person).  
**Suggestion:** Convert the text input to an autocomplete combobox that:
- Suggests matching existing players as the user types.
- Shows a "Create new player: [typed name]" option at the bottom when no match exists.
- Prevents adding the same player twice to one session.

**Impact:** Medium — prevents data quality issues and speeds up the most frequent workflow.  
**Effort:** Medium — requires fetching the player list and MUI Autocomplete integration.

---

### 8. Player Count Guidance in Session Form

**Where:** "Log Game Session" dialog, after selecting a game  
**Problem:** After selecting a game, there is no indication of how many players are supported
(min/max). Users may add too few or too many players without realizing.  
**Suggestion:** Show helper text below the game selector: "Catan supports 3-4 players."
Optionally display a warning chip if the current player count is outside the game's range.

**Impact:** Medium — prevents logging invalid sessions.  
**Effort:** Low — game data already includes min/max player counts.

---

### 9. "Last Played" Column on Players Page

**Where:** Players table  
**Problem:** The table shows a "Created" column with the date each player was first added to
the system. This is rarely useful. Users care more about recency: who has been active
recently and who hasn't played in a while.  
**Suggestion:** Replace the "Created" column with "Last Played" showing the date of the
player's most recent session. Players with no sessions show "Never". Optionally keep
"Created" as a secondary detail visible on the player profile page.

**Impact:** Medium — surfaces actionable information.  
**Effort:** Medium — requires a query change or join to fetch last session date per player.

---

### 10. Filter Zero-Activity Entries in Statistics

**Where:** Player Leaderboard table, Most Played Games table on Statistics page  
**Problem:** The leaderboard lists all 14 players including those with 0 sessions, 0 wins,
and 0.0% win rate. The games table shows all 9 games including those never played. This
dilutes meaningful data and makes the page feel cluttered.  
**Suggestion:**
- Default to showing only entries with >= 1 session.
- Add a "Show all" toggle or link to include zero-activity entries.
- Or collapse them into a footer: "and 11 more players with no sessions."

**Impact:** Medium — statistics become more meaningful.  
**Effort:** Low — client-side filter on existing data.

---

## Lower Priority (Nice-to-Haves)

### 11. App Logo / Branding

**Where:** Login page, app header bar  
**Problem:** The login page shows only the text "MeeplesShelf" with no visual identity. The
header is a plain purple bar. The app has no personality for a board game hobby tracker.  
**Suggestion:** Add a small meeple or board game icon as a logo next to the app name in the
header and as a larger centered element on the login page.

---

### 12. Inventory Sort and View Options

**Where:** Inventory page, above game grid  
**Problem:** Games display in a fixed order with no user control. There is no way to sort by
name, rating, last played, or player count. There is also no game count indicator.  
**Suggestion:** Add a toolbar row with:
- Sort dropdown: Name A-Z, Recently Played, Highest Rated, Player Count
- View toggle: Card grid (current) vs. compact list
- Total count: "9 games"

---

### 13. Quick-Log Session from Game Card

**Where:** Inventory page, each game card  
**Problem:** To log a session, users navigate to Sessions, click "+", then select the game
from a dropdown. This is 3+ steps for the most common action.  
**Suggestion:** Add a "Log Session" icon button on each game card. Clicking it opens the
session form with that game pre-selected, saving two steps.

---

### 14. Clearer Player Score Chips in Session List

**Where:** Sessions table, Players column  
**Problem:** Player chips display as "Alice (0)" where "(0)" is the player's total score. This
is not self-evident — it could be misread as a count, ranking, or error.  
**Suggestion:** Either:
- Remove inline scores from the session list (keep them for the detail dialog).
- Use a clearer format: "Alice - 0 pts".
- Highlight the winner's chip with a trophy icon or distinct color instead.

---

### 15. Dark Mode

**Where:** Entire application  
**Problem:** No dark mode option. Board game sessions often happen in the evening under low
lighting.  
**Suggestion:** Add a theme toggle (sun/moon icon) in the header. MUI supports theming
natively via `createTheme` with a dark palette. Persist preference in localStorage.

---

### 16. Game Card Expand: Show Scoring Spec Summary

**Where:** Inventory page, expanded game card details  
**Problem:** Expanding a game card only shows the Expansions section. The scoring specification
(which is the app's key differentiator) is invisible unless you open the edit form.  
**Suggestion:** Show a read-only summary of scoring fields in the expanded area:
a compact list like "Victory Points (numeric), Longest Road (boolean), ..." so users can
see what will be tracked when they log a session.

---

## Summary

| # | Enhancement | Impact | Effort | Status |
|---|-------------|--------|--------|--------|
| 1 | Empty states with CTAs | High | Low | Done |
| 2 | Tags on cards + tag filter | High | Medium | Done |
| 3 | Friendly no-image placeholder | High | Low | Done |
| 4 | Richer session detail dialog | High | Medium | Done |
| 5 | Sortable tables | Medium | Medium | Done |
| 6 | Show rating on game cards | Medium | Low | Done |
| 7 | Player autocomplete in session form | Medium | Medium | Done |
| 8 | Player count guidance in session form | Medium | Low | Done |
| 9 | "Last Played" on players table | Medium | Medium | Done |
| 10 | Filter zero-activity in statistics | Medium | Low | Done |
| 11 | App logo / branding | Low | Low | Done |
| 12 | Inventory sort and view options | Low | Medium | Done |
| 13 | Quick-log session from game card | Low | Medium | Done |
| 14 | Clearer player score chips | Low | Low | Done |
| 15 | Dark mode | Low | Medium | Done |
| 16 | Scoring spec in expanded card | Low | Low | Done |
