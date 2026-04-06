import client from "./client";
import type {
  OverviewStats,
  PlayerStats,
  GameStats,
  ActivityMonth,
} from "../types/stats";

export const getOverviewStats = () =>
  client.get<OverviewStats>("/stats/overview").then((r) => r.data);

export const getPlayerStats = () =>
  client.get<PlayerStats[]>("/stats/players").then((r) => r.data);

export const getGameStats = () =>
  client.get<GameStats[]>("/stats/games").then((r) => r.data);

export const getActivityStats = (months?: number) =>
  client
    .get<ActivityMonth[]>("/stats/activity", {
      params: months ? { months } : {},
    })
    .then((r) => r.data);
