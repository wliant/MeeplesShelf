import client from "./client";
import type { GameSession, GameSessionCreate } from "../types/session";
import type { Player } from "../types/session";

export interface SessionFilterParams {
  gameId?: number;
  playerId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const listSessions = (filters?: SessionFilterParams) => {
  const params: Record<string, string | number> = {};
  if (filters?.gameId) params.game_id = filters.gameId;
  if (filters?.playerId) params.player_id = filters.playerId;
  if (filters?.dateFrom) params.date_from = filters.dateFrom;
  if (filters?.dateTo) params.date_to = filters.dateTo;
  return client
    .get<GameSession[]>("/sessions", { params })
    .then((r) => r.data);
};

export const getSession = (id: number) =>
  client.get<GameSession>(`/sessions/${id}`).then((r) => r.data);

export const createSession = (data: GameSessionCreate) =>
  client.post<GameSession>("/sessions", data).then((r) => r.data);

export const updateSession = (id: number, data: GameSessionCreate) =>
  client.put<GameSession>(`/sessions/${id}`, data).then((r) => r.data);

export const deleteSession = (id: number) =>
  client.delete(`/sessions/${id}`);

export const listPlayers = () =>
  client.get<Player[]>("/players").then((r) => r.data);

export const createPlayer = (name: string) =>
  client.post<Player>("/players", { name }).then((r) => r.data);
