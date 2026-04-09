# Scoring Configuration Feature Gaps

Limitations discovered while modeling 30 board games in MeeplesShelf's scoring system.

## 1. No Fractional or Division Multipliers

The `numeric` field type only supports integer `multiplier`. Games where scoring involves division (e.g., 7 Wonders Duel: 1 VP per 3 coins, Flamecraft: 1 VP per 3 remaining coins) require the player to pre-calculate the value and enter it as `raw_score`.

**Affected games:** 7 Wonders Duel, Flamecraft, Champions of Midgard (gold/5), Tzolk'in (resources/4)

## 2. No Formula / Derived Fields

Many games have scoring rules that depend on other game state: Dominion Gardens (1 VP per 10 cards in deck per Garden card), Concordia (VP = cards x matching houses), Tzolk'in temple tracks (position-based lookup across 3 tracks). These cannot be expressed as field types and must be pre-calculated by the player before entry.

**Affected games:** Dominion (Gardens), Concordia Venus (all god categories), Tzolk'in (temples), Wingspan (some bonus cards)

## 3. No Alternative Win Conditions

The system always determines the winner by highest `total_score`. Games with non-score win conditions cannot be properly represented:
- **King of Tokyo**: Win by elimination (last monster standing) OR first to 20 VP
- **Innovation**: Win by accumulating achievements or domination, not a numeric score
- **7 Wonders Duel**: Instant win via science supremacy (6 unique symbols) or military supremacy (reaching opponent's capital)
- **Spirit Island**: Cooperative win/loss with no individual scoring

**Workaround:** Enter a high score for the winner of alternative conditions, or use session notes.

## 4. No Cooperative Game Support

Spirit Island is purely cooperative -- all players win or lose together. There is no concept of individual competitive scores. The workaround is giving all players the same score so they all tie as "winners," but this cannot represent a loss (you'd have to skip creating the session or give everyone 0).

**Affected games:** Spirit Island (and any future cooperative games)

## 5. No Tiebreaker Rules

Many games have tiebreaker rules (most remaining money, fewest resources, etc.). The system allows ties but cannot resolve them according to game-specific tiebreaker logic.

**Affected games:** Nearly all -- Catan (none), Brass Birmingham (income), Terraforming Mars (M€), Wingspan (food), etc.

## 6. No Per-Round or Per-Epoch Scoring

Games like Ra score at the end of each of 3 epochs with some tiles carrying over and others being discarded. La Granja scores per round. The system only captures final totals per category -- there is no way to record the scoring progression across rounds.

**Affected games:** Ra (3 epochs), La Granja (6 rounds), Tzolk'in (food days)

## 7. No Inter-Field Dependencies

Some scoring categories depend on other categories or board state relationships. Terraforming Mars city VP depends on adjacent greenery tiles. Concordia god scoring multiplies cards by matching board presence. Each field is calculated independently with no cross-reference capability.

**Affected games:** Terraforming Mars (city adjacency), Concordia Venus (card x board state multiplication)

## 8. No Boolean Exclusivity Enforcement

For fields like "Longest Road" in Catan or "Longest Continuous Route" in Ticket to Ride, only one player should have the bonus. The system does not validate that only one player has `True` -- multiple players could incorrectly be marked. This is a data entry validation gap.

**Affected games:** Catan (Longest Road, Largest Army), Ticket to Ride (Longest Route), Catan: C&K (Merchant)

## 9. No Field Removal in Expansion Patches

Expansion `scoring_spec_patch` can replace (same ID) or append (new ID) fields, but cannot remove a base game field. If an expansion makes a base field irrelevant, the only workaround is to override it with a field of the same ID and instruct users to enter 0.

**Potential impact:** Expansions that fundamentally change scoring categories (rare but possible)

## 10. No Dedicated Negative / Penalty Field Type

Penalties work via negative `multiplier` on `numeric` fields (e.g., Patchwork: empty spaces x -2, Champions of Midgard: blame x -1) or negative `value` on `enum_count` variants (Dominion: Curses x -1). However, the UI does not visually distinguish penalty fields from positive fields. Users must rely on field labels to understand what's being penalized.

**Affected games:** Patchwork, Champions of Midgard, Dominion (curses), Azul: Summer Pavilion (leftover tiles), Ra (negative pharaoh/civilization)

## 11. No Variable Scoring Per Player (Asymmetric Games)

The scoring spec is game-wide -- all players use the same fields. Games with asymmetric player powers that score differently per role cannot have per-player field sets.

**Affected games:** Spirit Island (each spirit has unique innate powers), Puerto Rico 1897 (large building bonuses are player-specific), any game with asymmetric factions

## 12. No Matrix / Multi-Dimensional Set Collection

The `set_collection` type maps a single integer index to a value via a 1D lookup array. Games with multi-dimensional collection scoring (e.g., Ra monuments score both for duplicates of the same type AND for sets of different types independently) require pre-calculation.

**Affected games:** Ra (monuments: both sets and duplicates), 7 Wonders Duel (science: both pair bonuses and set completion)

---

## Summary

| Gap | Severity | Games Affected |
|-----|----------|----------------|
| No fractional multipliers | Medium | 4+ games |
| No formula fields | High | 5+ games |
| No alternative win conditions | High | 4 games |
| No cooperative support | High | 1+ games |
| No tiebreaker rules | Low | Nearly all |
| No per-round scoring | Low | 3+ games |
| No inter-field dependencies | Medium | 2+ games |
| No boolean exclusivity | Low | 3+ games |
| No field removal in patches | Low | Rare |
| No penalty field distinction | Low | 5+ games |
| No asymmetric scoring | Medium | 2+ games |
| No multi-dimensional sets | Medium | 2+ games |

**High severity** = fundamentally cannot represent the game's scoring without significant user workarounds.
**Medium severity** = works but requires pre-calculation or loses detail.
**Low severity** = minor UX or validation issue.
