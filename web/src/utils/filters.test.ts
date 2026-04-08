import { describe, it, expect } from "vitest";
import { filterGamesByName, filterSessionsByPlayerName, filterGamesByTag } from "./filters";
import type { Game, Tag } from "../types/game";
import type { GameSession } from "../types/session";

const makeTag = (id: number, name: string): Tag => ({
  id,
  name,
  created_at: "2025-01-01T00:00:00Z",
});

const makeGame = (id: number, name: string, tags: Tag[] = []): Game => ({
  id,
  name,
  min_players: 2,
  max_players: 4,
  scoring_spec: null,
  rating: null,
  notes: null,
  image_url: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  expansions: [],
  tags,
  session_count: 0,
  last_played_at: null,
});

const makeSession = (id: number, playerNames: string[]): GameSession => ({
  id,
  game_id: 1,
  game: { id: 1, name: "TestGame" },
  played_at: "2025-01-01T00:00:00Z",
  notes: null,
  created_at: "2025-01-01T00:00:00Z",
  players: playerNames.map((name, i) => ({
    id: i + 1,
    player_id: i + 1,
    player: { id: i + 1, name, created_at: "2025-01-01T00:00:00Z" },
    score_data: {},
    total_score: null,
    winner: false,
  })),
  expansions: [],
});

describe("filterGamesByName", () => {
  const games = [makeGame(1, "Catan"), makeGame(2, "Dominion"), makeGame(3, "Five Tribes")];

  it("returns all games when query is empty", () => {
    expect(filterGamesByName(games, "")).toEqual(games);
  });

  it("returns all games when query is whitespace", () => {
    expect(filterGamesByName(games, "   ")).toEqual(games);
  });

  it("matches case-insensitively", () => {
    expect(filterGamesByName(games, "catan")).toEqual([games[0]]);
    expect(filterGamesByName(games, "CATAN")).toEqual([games[0]]);
  });

  it("matches substring", () => {
    expect(filterGamesByName(games, "omi")).toEqual([games[1]]);
  });

  it("returns empty array when no match", () => {
    expect(filterGamesByName(games, "xyz")).toEqual([]);
  });

  it("handles empty games array", () => {
    expect(filterGamesByName([], "test")).toEqual([]);
  });
});

describe("filterSessionsByPlayerName", () => {
  const sessions = [
    makeSession(1, ["Alice", "Bob"]),
    makeSession(2, ["Charlie", "Diana"]),
    makeSession(3, ["Alice", "Charlie"]),
  ];

  it("returns all sessions when query is empty", () => {
    expect(filterSessionsByPlayerName(sessions, "")).toEqual(sessions);
  });

  it("matches any player in the session", () => {
    const result = filterSessionsByPlayerName(sessions, "Alice");
    expect(result).toEqual([sessions[0], sessions[2]]);
  });

  it("matches case-insensitively", () => {
    const result = filterSessionsByPlayerName(sessions, "bob");
    expect(result).toEqual([sessions[0]]);
  });

  it("returns empty when no player matches", () => {
    expect(filterSessionsByPlayerName(sessions, "Zara")).toEqual([]);
  });
});

describe("filterGamesByTag", () => {
  const strategy = makeTag(1, "Strategy");
  const euro = makeTag(2, "Euro");
  const party = makeTag(3, "Party");

  const games = [
    makeGame(1, "Catan", [strategy]),
    makeGame(2, "Dominion", [strategy, euro]),
    makeGame(3, "Codenames", [party]),
  ];

  it("returns all games when no tags selected", () => {
    expect(filterGamesByTag(games, [])).toEqual(games);
  });

  it("filters to games with matching tag", () => {
    expect(filterGamesByTag(games, ["Strategy"])).toEqual([games[0], games[1]]);
  });

  it("requires ALL tags (AND logic)", () => {
    expect(filterGamesByTag(games, ["Strategy", "Euro"])).toEqual([games[1]]);
  });

  it("is case insensitive", () => {
    expect(filterGamesByTag(games, ["strategy"])).toEqual([games[0], games[1]]);
    expect(filterGamesByTag(games, ["PARTY"])).toEqual([games[2]]);
  });

  it("returns empty when no games match", () => {
    expect(filterGamesByTag(games, ["Cooperative"])).toEqual([]);
  });

  it("handles games with no tags", () => {
    const noTagGames = [makeGame(1, "Test")];
    expect(filterGamesByTag(noTagGames, ["Strategy"])).toEqual([]);
  });
});
