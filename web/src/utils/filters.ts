import type { Game } from "../types/game";
import type { GameSession } from "../types/session";

/** Case-insensitive substring match on game name. */
export function filterGamesByName(games: Game[], query: string): Game[] {
  const q = query.trim().toLowerCase();
  if (!q) return games;
  return games.filter((g) => g.name.toLowerCase().includes(q));
}

/** Case-insensitive substring match on any player name in a session. */
export function filterSessionsByPlayerName(
  sessions: GameSession[],
  query: string,
): GameSession[] {
  const q = query.trim().toLowerCase();
  if (!q) return sessions;
  return sessions.filter((s) =>
    s.players.some((p) => p.player.name.toLowerCase().includes(q)),
  );
}

/** Filter games to those having ALL specified tags (AND logic, case-insensitive). */
export function filterGamesByTag(games: Game[], tagNames: string[]): Game[] {
  if (tagNames.length === 0) return games;
  return games.filter((g) =>
    tagNames.every((t) =>
      g.tags.some((gt) => gt.name.toLowerCase() === t.toLowerCase()),
    ),
  );
}
