# MeeplesShelf — Data Model

Tables are created by Alembic migrations (`001_initial.py`, `002_add_game_rating_notes.py`). The ORM layer uses SQLAlchemy 2 async with PostgreSQL 16.

---

## Entity-Relationship Diagram

```
games ──────────────────────────────────┐
 │                                      │
 │ 1:N (cascade delete)                 │
 ▼                                      │
expansions                              │ N:1
                                        │
game_sessions ──────────────────────────┘
 │                 │
 │ 1:N             │ M:N via session_expansions
 │ (cascade)       ▼
 ▼               expansions
session_players
 │
 │ N:1
 ▼
players
```

---

## Tables

### `games`

Stores board games in the collection.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | auto-increment | — |
| `name` | `VARCHAR(255)` | NOT NULL | — | Game title |
| `min_players` | `INTEGER` | — | `1` | Application default (not server default) |
| `max_players` | `INTEGER` | — | `4` | Application default (not server default) |
| `scoring_spec` | `JSONB` | NULLABLE | `NULL` | See [Scoring System](./scoring-system.md) |
| `rating` | `INTEGER` | NULLABLE | `NULL` | Group rating 1–10; validated by Pydantic, not DB constraint |
| `notes` | `TEXT` | NULLABLE | `NULL` | Free-text personal notes about the game |
| `created_at` | `TIMESTAMPTZ` | — | `now()` (server default) | Record creation time |
| `updated_at` | `TIMESTAMPTZ` | — | `now()` (server default) | Auto-updated on every write via SQLAlchemy `onupdate=func.now()` |

**Relationships:**
- `expansions` → `list[Expansion]`, one-to-many, `cascade="all, delete-orphan"`

---

### `expansions`

Expansions that belong to a game. Each expansion may carry its own `scoring_spec_patch` to modify the base game's scoring rules (patch application is a future feature; stored but not yet used in score calculation).

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | auto-increment | — |
| `game_id` | `INTEGER` | FK → `games.id` ON DELETE CASCADE, NOT NULL | — | Parent game |
| `name` | `VARCHAR(255)` | NOT NULL | — | Expansion name |
| `scoring_spec_patch` | `JSONB` | NULLABLE | `NULL` | Patch to base game scoring spec (future use) |
| `created_at` | `TIMESTAMPTZ` | — | `now()` (server default) | — |

**Relationships:**
- `game` → `Game`, many-to-one

---

### `players`

Global player registry. Player names are unique across the entire system.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | auto-increment | — |
| `name` | `VARCHAR(255)` | NOT NULL, UNIQUE | — | Globally unique player name |
| `created_at` | `TIMESTAMPTZ` | — | `now()` (server default) | — |

---

### `game_sessions`

A single play session of a board game.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | auto-increment | — |
| `game_id` | `INTEGER` | FK → `games.id` ON DELETE CASCADE, NOT NULL | — | Game that was played |
| `played_at` | `TIMESTAMPTZ` | — | `now()` (server default) | When the game was played; can be set explicitly on creation |
| `notes` | `TEXT` | NULLABLE | `NULL` | Free-text notes about the session |
| `created_at` | `TIMESTAMPTZ` | — | `now()` (server default) | Record creation time |

**Relationships:**
- `game` → `Game`, many-to-one, `lazy="joined"` (always eager-loaded)
- `players` → `list[SessionPlayer]`, one-to-many, `cascade="all, delete-orphan"`
- `expansions` → `list[Expansion]`, many-to-many via `session_expansions`, `lazy="joined"`

---

### `session_players`

One row per player per session. Stores raw score data and the computed total.

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | auto-increment | — |
| `session_id` | `INTEGER` | FK → `game_sessions.id` ON DELETE CASCADE, NOT NULL | — | — |
| `player_id` | `INTEGER` | FK → `players.id` ON DELETE CASCADE, NOT NULL | — | — |
| `score_data` | `JSONB` | NOT NULL | `{}` (application default) | Per-field score data; structure mirrors `ScoringSpec.fields` |
| `total_score` | `INTEGER` | NULLABLE | `NULL` | Computed by server on session creation; `NULL` if game has no `scoring_spec` |
| `winner` | `BOOLEAN` | NOT NULL | `False` (application default) | `True` for player(s) with the highest `total_score`; `False` if no scoring spec |

**Table constraint:** `UNIQUE(session_id, player_id)` — a player can appear at most once per session.

**Relationships:**
- `session` → `GameSession`, many-to-one
- `player` → `Player`, many-to-one, `lazy="joined"` (always eager-loaded)

---

### `session_expansions`

Junction table linking sessions to the expansions that were used.

| Column | Type | Constraints |
|---|---|---|
| `session_id` | `INTEGER` | FK → `game_sessions.id` ON DELETE CASCADE, PRIMARY KEY |
| `expansion_id` | `INTEGER` | FK → `expansions.id` ON DELETE CASCADE, PRIMARY KEY |

No ORM model class — defined as a SQLAlchemy `Table` object used as `secondary` in the `GameSession.expansions` relationship.

---

## Cascade Behaviour Summary

| Action | Effect |
|---|---|
| Delete `games` row | Cascades to all its `expansions`, all `game_sessions` for that game, and in turn all `session_players` for those sessions |
| Delete `game_sessions` row | Cascades to all its `session_players` and removes rows from `session_expansions` |
| Delete `players` row | Cascades to all `session_players` rows for that player (sessions themselves are retained) |
| Delete `expansions` row | Removes rows from `session_expansions`; past sessions are not modified |

---

## `score_data` Shape

`score_data` is a free-form JSONB object. Its structure mirrors the game's `scoring_spec.fields`:

| Field type | Key | Value type |
|---|---|---|
| `raw_score` | field `id` | `number` |
| `numeric` | field `id` | `number` |
| `boolean` | field `id` | `boolean` |
| `set_collection` | field `id` | `number` (set size / index) |
| `enum_count` | field `id` | `object` mapping each variant `id` → `number` (count) |

Example for a Catan session player:
```json
{
  "settlements": 3,
  "cities": 2,
  "vp_cards": 1,
  "longest_road": true,
  "largest_army": false
}
```

Example for a Dominion session player:
```json
{
  "vp_cards": {
    "estates": 3,
    "duchies": 1,
    "provinces": 2,
    "curses": 0
  },
  "gardens": 1,
  "vp_tokens": 0
}
```

Missing keys default to `0` / falsy during score calculation.
