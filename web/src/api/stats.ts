import client from "./client";
import type {
  OverviewStats,
  GameStats,
  PlayerStats,
  PlayFrequencyEntry,
  TopGame,
  HIndexResponse,
  WinStreakResponse,
  PlayerWinRate,
  ScoreDistributionEntry,
  PlayerScoreTrend,
} from "../types/stats";

export const getOverviewStats = () =>
  client.get<OverviewStats>("/stats/overview").then((r) => r.data);

export const getGameStats = (gameId: number) =>
  client.get<GameStats>(`/stats/games/${gameId}`).then((r) => r.data);

export const getPlayerStats = (playerId: number) =>
  client.get<PlayerStats>(`/stats/players/${playerId}`).then((r) => r.data);

export const getPlayFrequency = (period = "month", months = 12) =>
  client
    .get<PlayFrequencyEntry[]>("/stats/play-frequency", {
      params: { period, months },
    })
    .then((r) => r.data);

export const getTopGames = (limit = 10) =>
  client
    .get<TopGame[]>("/stats/top-games", { params: { limit } })
    .then((r) => r.data);

export const getHIndex = () =>
  client.get<HIndexResponse>("/stats/h-index").then((r) => r.data);

export const getWinStreaks = (playerId: number) =>
  client
    .get<WinStreakResponse>(`/stats/players/${playerId}/win-streaks`)
    .then((r) => r.data);

export const getPlayerScoreTrends = (playerId: number) =>
  client
    .get<PlayerScoreTrend[]>(`/stats/players/${playerId}/score-trends`)
    .then((r) => r.data);

export const getPlayerWinRates = () =>
  client.get<PlayerWinRate[]>("/stats/player-win-rates").then((r) => r.data);

export const getScoreDistribution = (gameId: number) =>
  client
    .get<ScoreDistributionEntry[]>(`/stats/games/${gameId}/score-distribution`)
    .then((r) => r.data);
