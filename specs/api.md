# MeeplesShelf — REST API Reference

**Base URL:** `/api`  
**Interactive docs:** `http://localhost:8000/docs` (Swagger UI, OpenAPI 3.1)  
**Auth:** HTTP Bearer token (JWT). Endpoints marked 🔒 require a valid admin token.

All request and response bodies are JSON (`Content-Type: application/json`). All error responses follow FastAPI's default shape: `{"detail": "<message>"}`.

---

## CORS

```
allow_origins:     ["*"]
allow_credentials: true
allow_methods:     ["*"]
allow_headers:     ["*"]
```

---

## Schemas

### `TokenRequest`
```json
{ "password": "string" }
```

### `TokenResponse`
```json
{
  "access_token": "string",
  "token_type":   "bearer"
}
```

---

### `ScoringSpec`
```json
{
  "version": 1,
  "fields": [ ...ScoringField[] ]
}
```
See [scoring-system.md](./scoring-system.md) for full `ScoringField` definitions.

---

### `GameCreate`
```json
{
  "name":         "string",          // required
  "min_players":  1,                 // optional, default 1
  "max_players":  4,                 // optional, default 4
  "scoring_spec": ScoringSpec | null // optional, default null
}
```

### `GameUpdate`
All fields optional (partial update).
```json
{
  "name":         "string | null",
  "min_players":  "integer | null",
  "max_players":  "integer | null",
  "scoring_spec": "ScoringSpec | null"
}
```

### `GameRead`
```json
{
  "id":           "integer",
  "name":         "string",
  "min_players":  "integer",
  "max_players":  "integer",
  "scoring_spec": "ScoringSpec | null",
  "created_at":   "datetime (ISO 8601, UTC)",
  "updated_at":   "datetime (ISO 8601, UTC)",
  "expansions":   "ExpansionRead[]"
}
```

### `ExpansionCreate`
```json
{
  "name":               "string",          // required
  "scoring_spec_patch": "ScoringSpec | null" // optional, default null
}
```

### `ExpansionRead`
```json
{
  "id":                 "integer",
  "game_id":            "integer",
  "name":               "string",
  "scoring_spec_patch": "ScoringSpec | null",
  "created_at":         "datetime (ISO 8601, UTC)"
}
```

---

### `PlayerCreate`
```json
{ "name": "string" }
```

### `PlayerRead`
```json
{
  "id":         "integer",
  "name":       "string",
  "created_at": "datetime (ISO 8601, UTC)"
}
```

---

### `GameSessionCreate`
```json
{
  "game_id":       "integer",                    // required
  "played_at":     "datetime | null",            // optional; defaults to server now()
  "notes":         "string | null",              // optional
  "expansion_ids": "integer[]",                  // optional, default []
  "players":       "SessionPlayerCreate[]"       // optional, default []
}
```

### `SessionPlayerCreate`
```json
{
  "player_id":  "integer",          // required
  "score_data": "object"            // optional, default {}
}
```

### `GameSessionUpdate`
```json
{
  "played_at":     "datetime | null",            // optional; if null, keeps existing value
  "notes":         "string | null",              // optional
  "expansion_ids": "integer[]",                  // optional, default []; full replacement
  "players":       "SessionPlayerCreate[]"       // optional, default []; full replacement
}
```
Note: `game_id` is not included — the game cannot be changed after session creation.

### `GameSessionRead`
```json
{
  "id":         "integer",
  "game_id":    "integer",
  "game":       "GameBrief",
  "played_at":  "datetime (ISO 8601, UTC)",
  "notes":      "string | null",
  "created_at": "datetime (ISO 8601, UTC)",
  "players":    "SessionPlayerRead[]",
  "expansions": "ExpansionBrief[]"
}
```

### `SessionPlayerRead`
```json
{
  "id":          "integer",
  "player_id":   "integer",
  "player":      "PlayerRead",
  "score_data":  "object",
  "total_score": "integer | null",
  "winner":      "boolean"
}
```

### `GameBrief`
```json
{ "id": "integer", "name": "string" }
```

### `ExpansionBrief`
```json
{ "id": "integer", "name": "string" }
```

### `PaginatedResponse[T]`
```json
{
  "items": "T[]",
  "total": "integer",
  "skip":  "integer",
  "limit": "integer"
}
```
Generic wrapper used by paginated list endpoints. `total` is the full count matching any active filters (independent of `skip`/`limit`).

---

## Auth Endpoints

### `POST /api/auth/token`

Obtain a JWT by supplying the admin password.

**Auth required:** No  
**Request body:** `TokenRequest`  
**Response:** `200 OK` → `TokenResponse`

**Errors:**

| Status | `detail` | Condition |
|---|---|---|
| `401` | `"Invalid password"` | Wrong password |

---

## Games Endpoints

### `GET /api/games`

List games, ordered by name ascending. Expansions are eager-loaded. Supports filtering by name and pagination.

**Auth required:** No  
**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `name` | string (optional) | — | Case-insensitive substring match on game name |
| `skip` | integer (optional) | `0` | Number of records to skip (offset). Must be >= 0. |
| `limit` | integer (optional) | `20` | Maximum number of records to return. Must be 1–100. |

**Response:** `200 OK` → `PaginatedResponse[GameRead]`

---

### `POST /api/games` 🔒

Create a new game.

**Auth required:** Yes (admin)  
**Request body:** `GameCreate`  
**Response:** `201 Created` → `GameRead`

**Errors:**

| Status | Condition |
|---|---|
| `401` | Missing or invalid token |
| `403` | Token subject is not `"admin"` |

---

### `GET /api/games/{game_id}`

Get a single game with its expansions.

**Auth required:** No  
**Path parameter:** `game_id: integer`  
**Response:** `200 OK` → `GameRead`

**Errors:**

| Status | `detail` | Condition |
|---|---|---|
| `404` | `"Game not found"` | No game with that ID |

---

### `PUT /api/games/{game_id}` 🔒

Update a game. All body fields are optional — only supplied fields are updated.

**Auth required:** Yes (admin)  
**Path parameter:** `game_id: integer`  
**Request body:** `GameUpdate`  
**Response:** `200 OK` → `GameRead`

**Errors:**

| Status | Condition |
|---|---|
| `401` | Missing or invalid token |
| `403` | Not admin |
| `404` | Game not found |

---

### `DELETE /api/games/{game_id}` 🔒

Delete a game and cascade-delete all its expansions and sessions.

**Auth required:** Yes (admin)  
**Path parameter:** `game_id: integer`  
**Response:** `204 No Content`

**Errors:**

| Status | Condition |
|---|---|
| `401` | Missing or invalid token |
| `403` | Not admin |
| `404` | Game not found |

---

### `POST /api/games/{game_id}/expansions` 🔒

Add an expansion to a game.

**Auth required:** Yes (admin)  
**Path parameter:** `game_id: integer`  
**Request body:** `ExpansionCreate`  
**Response:** `201 Created` → `ExpansionRead`

**Errors:**

| Status | `detail` | Condition |
|---|---|---|
| `401` | — | Missing or invalid token |
| `403` | — | Not admin |
| `404` | `"Game not found"` | Game does not exist |

---

### `DELETE /api/games/{game_id}/expansions/{expansion_id}` 🔒

Remove an expansion from a game.

**Auth required:** Yes (admin)  
**Path parameters:** `game_id: integer`, `expansion_id: integer`  
**Response:** `204 No Content`

**Errors:**

| Status | `detail` | Condition |
|---|---|---|
| `401` | — | Missing or invalid token |
| `403` | — | Not admin |
| `404` | `"Expansion not found"` | No matching expansion (checks both `expansion_id` and `game_id`) |

---

### `POST /api/seed` 🔒

Seed the database with the four pre-configured games (Five Tribes, Dominion, Catan, War Chest). Games that already exist (matched by name) are skipped. Idempotent.

**Auth required:** Yes (admin)  
**Request body:** None  
**Response:** `201 Created`

```json
{ "seeded": ["Five Tribes", "Dominion"] }
```

The `seeded` array lists only the games that were newly created. If all games already exist, `seeded` is `[]`.

**Errors:**

| Status | Condition |
|---|---|
| `401` | Missing or invalid token |
| `403` | Not admin |

---

## Sessions Endpoints

### `GET /api/players`

List all players, ordered by name ascending. Each player includes a `session_count` field indicating how many sessions they have participated in.

**Auth required:** No  
**Response:** `200 OK` → `PlayerReadWithCount[]`

**`PlayerReadWithCount` schema:**

| Field | Type | Description |
|---|---|---|
| `id` | integer | Player ID |
| `name` | string | Player name |
| `created_at` | datetime | Creation timestamp |
| `session_count` | integer | Number of sessions this player appears in |

---

### `POST /api/players` 🔒

Create a new player. Player names are globally unique.

**Auth required:** Yes (admin)  
**Request body:** `PlayerCreate`  
**Response:** `201 Created` → `PlayerRead`

**Errors:**

| Status | `detail` | Condition |
|---|---|---|
| `401` | — | Missing or invalid token |
| `403` | — | Not admin |
| `409` | `"Player already exists"` | A player with that name already exists |

---

### `PUT /api/players/{player_id}` 🔒

Rename a player. The new name must not conflict with an existing player.

**Auth required:** Yes (admin)  
**Path parameters:** `player_id` (integer)  
**Request body:** `PlayerUpdate` (`{ "name": "string" }`)  
**Response:** `200 OK` → `PlayerRead`

**Errors:**

| Status | `detail` | Condition |
|---|---|---|
| `401` | — | Missing or invalid token |
| `403` | — | Not admin |
| `404` | `"Player not found"` | No player with that ID exists |
| `409` | `"A player with that name already exists"` | Name collision with another player |

---

### `DELETE /api/players/{player_id}` 🔒

Delete a player. All `session_players` records referencing this player are cascade-deleted (the sessions themselves survive but lose that player's scores).

**Auth required:** Yes (admin)  
**Path parameters:** `player_id` (integer)  
**Response:** `204 No Content`

**Errors:**

| Status | `detail` | Condition |
|---|---|---|
| `401` | — | Missing or invalid token |
| `403` | — | Not admin |
| `404` | `"Player not found"` | No player with that ID exists |

---

### `GET /api/sessions`

List sessions, ordered by `played_at` descending (most recent first). Game, players, and expansions are eager-loaded. Supports filtering by game, player, date range, and pagination.

**Auth required:** No  
**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `game_id` | integer (optional) | — | Filter sessions for a specific game |
| `player_id` | integer (optional) | — | Filter sessions that include a specific player |
| `date_from` | date (optional, ISO 8601 `YYYY-MM-DD`) | — | Include sessions played on or after this date (start of day UTC) |
| `date_to` | date (optional, ISO 8601 `YYYY-MM-DD`) | — | Include sessions played on or before this date (end of day UTC) |
| `skip` | integer (optional) | `0` | Number of records to skip (offset). Must be >= 0. |
| `limit` | integer (optional) | `20` | Maximum number of records to return. Must be 1–100. |

All filters are combined with AND. Omitted filters are ignored. Pagination is applied after filtering.

**Response:** `200 OK` → `PaginatedResponse[GameSessionRead]`

---

### `POST /api/sessions` 🔒

Log a new game session. The server calculates `total_score` and `winner` for each player using the game's `scoring_spec`.

**Auth required:** Yes (admin)  
**Request body:** `GameSessionCreate`  
**Response:** `201 Created` → `GameSessionRead`

**Server behaviour:**
1. Look up the game; raise 404 if not found.
2. If `played_at` is null, PostgreSQL's `now()` server default is used.
3. Attach expansions from `expansion_ids`; validate they belong to the game (400 if mismatched).
4. For each player in `players`:
   - Compute `total_score = calculate_total(game.scoring_spec, score_data)` if `scoring_spec` is not null; otherwise `total_score = null`.
5. Set `winner = True` for all players whose `total_score` equals the maximum across all players.
6. If no `scoring_spec`, all players have `total_score = null` and `winner = false`.
7. A session can be created with zero players.

**Errors:**

| Status | `detail` | Condition |
|---|---|---|
| `401` | — | Missing or invalid token |
| `403` | — | Not admin |
| `404` | `"Game not found"` | `game_id` does not exist |
| `400` | `"One or more expansion_ids do not belong to this game"` | Expansion mismatch |

---

### `GET /api/sessions/{session_id}`

Get a single session with full details.

**Auth required:** No  
**Path parameter:** `session_id: integer`  
**Response:** `200 OK` → `GameSessionRead`

**Errors:**

| Status | `detail` | Condition |
|---|---|---|
| `404` | `"Session not found"` | No session with that ID |

---

### `PUT /api/sessions/{session_id}` 🔒

Update an existing session. The game cannot be changed (it is immutable once the session is created). Players and expansions are fully replaced — the old set is removed and the new set is inserted.

**Auth required:** Yes (admin)  
**Path parameter:** `session_id: integer`  
**Request body:** `GameSessionUpdate`  
**Response:** `200 OK` → `GameSessionRead`

**Server behaviour:**
1. Look up the session; raise 404 if not found.
2. Update `played_at` (if provided) and `notes`.
3. Replace expansions from `expansion_ids`; validate they belong to the session's game.
4. Delete all existing session players.
5. For each player in `players`:
   - Merge the game's `scoring_spec` with active expansion patches.
   - Compute `total_score = calculate_total(merged_spec, score_data)` if spec is not null.
6. Set `winner = True` for players with the maximum `total_score`.

**Errors:**

| Status | `detail` | Condition |
|---|---|---|
| `401` | — | Missing or invalid token |
| `403` | — | Not admin |
| `404` | `"Session not found"` | No session with that ID |
| `400` | `"One or more expansion_ids do not belong to this game"` | Expansion mismatch |

---

### `DELETE /api/sessions/{session_id}` 🔒

Delete a session and its session players.

**Auth required:** Yes (admin)  
**Path parameter:** `session_id: integer`  
**Response:** `204 No Content`

**Errors:**

| Status | `detail` | Condition |
|---|---|---|
| `401` | — | Missing or invalid token |
| `403` | — | Not admin |
| `404` | `"Session not found"` | No session with that ID |

---

## Export Endpoints

### `ExportMeta`
```json
{
  "exported_at": "datetime (ISO 8601, UTC)",
  "version":     "string"
}
```

### `FullExport`
```json
{
  "meta":     "ExportMeta",
  "games":    "GameRead[]",
  "players":  "PlayerRead[]",
  "sessions": "GameSessionRead[]"
}
```

---

### `GET /api/export` 🔒

Full JSON export of all data (games with expansions, players, sessions with scores). Intended for backup and migration.

**Auth required:** Yes (admin)  
**Response:** `200 OK` → `FullExport`  
**Headers:** `Content-Disposition: attachment; filename="meeplesshelf-export-YYYY-MM-DD.json"`

Games are ordered by name, players by name, sessions by `played_at` descending. All relationships are eagerly loaded (expansions, session players, player details).

**Errors:**

| Status | Condition |
|---|---|
| `401` | Missing or invalid token |
| `403` | Not admin |

---

### `GET /api/export/sessions/csv` 🔒

CSV export of sessions with one row per player-session. Useful for spreadsheet analysis.

**Auth required:** Yes (admin)  
**Response:** `200 OK` → CSV file  
**Content-Type:** `text/csv`  
**Headers:** `Content-Disposition: attachment; filename="meeplesshelf-sessions-YYYY-MM-DD.csv"`

**CSV columns:**

| Column | Description |
|---|---|
| `session_id` | Session ID |
| `game_name` | Name of the game |
| `played_at` | ISO 8601 datetime |
| `notes` | Session notes (may be empty) |
| `expansions` | Semicolon-separated expansion names |
| `player_name` | Player name |
| `total_score` | Calculated total score (may be empty if no scoring spec) |
| `winner` | `True` or `False` |
| `score_data` | JSON-serialized score data object |

Sessions are ordered by `played_at` descending. Each session produces one row per participating player.

**Errors:**

| Status | Condition |
|---|---|
| `401` | Missing or invalid token |
| `403` | Not admin |
