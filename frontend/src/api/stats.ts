import client from "./client";
import type {
  OverviewStats,
  GameStats,
  PlayerStats,
  PlayFrequencyEntry,
  TopGame,
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
