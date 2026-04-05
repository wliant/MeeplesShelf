# MeeplesShelf — Scoring System

The scoring system translates a game-specific JSON specification stored in `games.scoring_spec` into a computed integer total for each player. It is the most distinctive part of the application's domain model.

---

## `ScoringSpec` Structure

```json
{
  "version": 1,
  "fields": [ ...ScoringField[] ]
}
```

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `version` | `integer` | no | `1` | Schema version; currently always `1` |
| `fields` | `ScoringField[]` | no | `[]` | Ordered list of scoring categories |

The spec is stored as JSONB in `games.scoring_spec` and validated by the `ScoringSpec` Pydantic model (`app/app/schemas/scoring.py`). A game with `scoring_spec = null` is valid; players in those sessions receive `total_score = null` and `winner = false`.

---

## Field Types

All field types share three common properties:

| Property | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | yes | Unique identifier within the spec; used as the key in `score_data` |
| `label` | `string` | yes | Human-readable display name |
| `type` | `string` (literal) | yes | Discriminator — determines which subtype applies |
| `description` | `string \| null` | no | Optional tooltip text shown in the UI |

---

### `raw_score`

Adds the raw numeric value as-is.

```json
{
  "id": "vp_tokens",
  "label": "VP Tokens",
  "type": "raw_score",
  "description": null
}
```

**Score contribution:** `int(score_data[id] or 0)`

**`score_data` value:** `number`

---

### `numeric`

Multiplies the raw numeric value by a fixed multiplier.

```json
{
  "id": "cities",
  "label": "Cities",
  "type": "numeric",
  "multiplier": 2,
  "description": null
}
```

| Extra property | Type | Required | Default |
|---|---|---|---|
| `multiplier` | `integer` | no | `1` |

**Score contribution:** `int(score_data[id] or 0) × multiplier`

**`score_data` value:** `number`

---

### `boolean`

Awards a fixed point value if the raw value is truthy.

```json
{
  "id": "longest_road",
  "label": "Longest Road",
  "type": "boolean",
  "value": 2,
  "description": null
}
```

| Extra property | Type | Required | Notes |
|---|---|---|---|
| `value` | `integer` | yes | Points awarded when truthy |

**Score contribution:** `value` if `score_data[id]` is truthy, else `0`

**`score_data` value:** `boolean` (or any truthy/falsy value)

---

### `enum_count`

Counts instances of several named variants, each worth a different number of points.

```json
{
  "id": "vp_cards",
  "label": "Victory Point Cards",
  "type": "enum_count",
  "variants": [
    {"id": "estates",   "label": "Estates",   "value": 1},
    {"id": "duchies",   "label": "Duchies",   "value": 3},
    {"id": "provinces", "label": "Provinces", "value": 6},
    {"id": "curses",    "label": "Curses",    "value": -1}
  ],
  "description": null
}
```

| Extra property | Type | Required | Notes |
|---|---|---|---|
| `variants` | `EnumVariant[]` | yes | At least one variant |

**`EnumVariant` shape:**

| Property | Type | Notes |
|---|---|---|
| `id` | `string` | Unique within this field's variants |
| `label` | `string` | Display name |
| `value` | `integer` | Points per unit (may be negative) |

**Score contribution:** `Σ (score_data[field_id][variant_id] × variant.value)` for all variants

Missing variant keys default to `0`.

**`score_data` value:** `object` mapping variant `id` → `number` (count)

Example:
```json
{ "vp_cards": { "estates": 3, "duchies": 1, "provinces": 2, "curses": 0 } }
```

---

### `set_collection`

Awards points based on the size of the player's largest complete set, using a lookup table.

```json
{
  "id": "merchandise",
  "label": "Merchandise (sets)",
  "type": "set_collection",
  "set_values": [0, 1, 6, 15, 28, 45, 66, 91, 120],
  "description": "Number of unique goods in largest set"
}
```

| Extra property | Type | Required | Notes |
|---|---|---|---|
| `set_values` | `integer[]` | yes | Index `n` = points for a set of size `n`; index 0 is always the zero-set case |

**Score contribution:**
```
idx = int(score_data[id] or 0)
values = field.set_values
points = values[min(idx, len(values) - 1)]  if values else 0
```

Indices beyond the end of the array clamp to the last element.

**`score_data` value:** `number` (set size / index into `set_values`)

---

## Total Score Calculation

Implemented in `app/app/services/scoring.py :: calculate_total(spec, score_data)`:

```python
def calculate_total(spec: dict, score_data: dict) -> int:
    total = 0
    for field in spec.get("fields", []):
        fid = field["id"]
        raw = score_data.get(fid, 0)
        ftype = field["type"]

        if ftype == "raw_score":
            total += int(raw or 0)
        elif ftype == "numeric":
            total += int(raw or 0) * field.get("multiplier", 1)
        elif ftype == "boolean":
            total += field["value"] if raw else 0
        elif ftype == "set_collection":
            idx = int(raw or 0)
            values = field["set_values"]
            total += values[min(idx, len(values) - 1)] if values else 0
        elif ftype == "enum_count":
            if isinstance(raw, dict):
                for variant in field["variants"]:
                    count = raw.get(variant["id"], 0)
                    total += int(count) * variant["value"]
    return total
```

An identical implementation exists client-side in `web/src/utils/scoring.ts :: calculateTotal()` so that the UI can display live totals while the user fills in scores.

---

## Winner Determination

Computed server-side in `app/app/routers/sessions.py :: create_session()`:

1. Calculate `total_score` for every `SessionPlayer` using `calculate_total`.
2. If the game has no `scoring_spec`, `total_score = None` for all players.
3. Find `max_score = max(total_score for all players where total_score is not None)`.
4. Set `winner = True` for every player whose `total_score == max_score`.
5. Ties are allowed — multiple players can be winners in the same session.
6. If no scoring spec: `total_score = None`, `winner = False` for all players.

---

## Seed Game Specifications

These four games are seeded by `POST /api/seed` and define the canonical use cases for each scoring field type.

---

### Five Tribes (2–4 players)

```json
{
  "version": 1,
  "fields": [
    { "id": "coins",       "label": "Coins",            "type": "raw_score" },
    { "id": "viziers",     "label": "Viziers",          "type": "raw_score",
      "description": "Total vizier VP (10 per vizier + bonus)" },
    { "id": "elders",      "label": "Elders",           "type": "numeric",  "multiplier": 2 },
    { "id": "djinns",      "label": "Djinns",           "type": "raw_score",
      "description": "Sum of VP on owned Djinn cards" },
    { "id": "merchandise", "label": "Merchandise (sets)","type": "set_collection",
      "set_values": [0, 1, 6, 15, 28, 45, 66, 91, 120],
      "description": "Number of unique goods in largest set" },
    { "id": "palaces",     "label": "Palace Tiles",     "type": "numeric",  "multiplier": 5 },
    { "id": "oases",       "label": "Oasis Tiles",      "type": "numeric",  "multiplier": 3 }
  ]
}
```

---

### Dominion (2–4 players)

```json
{
  "version": 1,
  "fields": [
    { "id": "vp_cards", "label": "Victory Point Cards", "type": "enum_count",
      "variants": [
        { "id": "estates",   "label": "Estates",   "value":  1 },
        { "id": "duchies",   "label": "Duchies",   "value":  3 },
        { "id": "provinces", "label": "Provinces", "value":  6 },
        { "id": "curses",    "label": "Curses",    "value": -1 }
      ]
    },
    { "id": "gardens",   "label": "Gardens",    "type": "numeric", "multiplier": 1,
      "description": "Pre-calculated Gardens VP (cards_in_deck / 10 per Garden)" },
    { "id": "vp_tokens", "label": "VP Tokens",  "type": "raw_score" }
  ]
}
```

---

### Catan (3–4 players)

```json
{
  "version": 1,
  "fields": [
    { "id": "settlements", "label": "Settlements",           "type": "numeric", "multiplier": 1 },
    { "id": "cities",      "label": "Cities",                "type": "numeric", "multiplier": 2 },
    { "id": "vp_cards",    "label": "Victory Point Cards",   "type": "raw_score" },
    { "id": "longest_road","label": "Longest Road",          "type": "boolean", "value": 2 },
    { "id": "largest_army","label": "Largest Army",          "type": "boolean", "value": 2 }
  ]
}
```

---

### War Chest (2–4 players)

```json
{
  "version": 1,
  "fields": [
    { "id": "control_points", "label": "Control Points", "type": "raw_score",
      "description": "Number of controlled locations" }
  ]
}
```

---

## Expansion `scoring_spec_patch`

Expansions may carry a `scoring_spec_patch` JSONB field with the same `ScoringSpec` shape. This is intended to add or override scoring fields when an expansion is used in a session.

**Current status:** The patch is stored but not yet applied. Score calculation always uses the base game's `scoring_spec` only. Applying `scoring_spec_patch` from active expansions is planned as future work.
