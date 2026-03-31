import client from "./client";
import type { GameSession, GameSessionCreate, PlayerUpdate } from "../types/session";
import type { Player } from "../types/session";
import type { PaginatedResponse } from "../types/game";

export interface SessionFilterParams {
  gameId?: number;
  playerId?: number;
  dateFrom?: string;
  dateTo?: string;
  isIncomplete?: boolean;
  offset?: number;
  limit?: number;
}

export const listSessions = (filters?: SessionFilterParams) => {
  const params: Record<string, string | number | boolean> = {};
  if (filters?.gameId) params.game_id = filters.gameId;
  if (filters?.playerId) params.player_id = filters.playerId;
  if (filters?.dateFrom) params.date_from = filters.dateFrom;
  if (filters?.dateTo) params.date_to = filters.dateTo;
  if (filters?.isIncomplete !== undefined) params.is_incomplete = filters.isIncomplete;
  if (filters?.offset !== undefined) params.offset = filters.offset;
  if (filters?.limit !== undefined) params.limit = filters.limit;
  return client
    .get<PaginatedResponse<GameSession>>("/sessions", { params })
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

export const updatePlayer = (id: number, data: PlayerUpdate) =>
  client.put<Player>(`/players/${id}`, data).then((r) => r.data);

export const addSessionPhoto = (sessionId: number, data: { url: string; caption?: string }) =>
  client.post(`/sessions/${sessionId}/photos`, data).then((r) => r.data);

export const deleteSessionPhoto = (sessionId: number, photoId: number) =>
  client.delete(`/sessions/${sessionId}/photos/${photoId}`);
