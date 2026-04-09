import client from "./client";
import type { GameSession, GameSessionCreate, GameSessionUpdate, Player, PlayerWithCount, SessionImage } from "../types/session";
import type { PaginatedResponse } from "../types/pagination";
import type { PlayerProfileStats } from "../types/stats";

export interface SessionFilters {
  game_id?: number;
  player_id?: number;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}

export const listSessions = (filters?: SessionFilters) =>
  client
    .get<PaginatedResponse<GameSession>>("/sessions", {
      params: filters,
    })
    .then((r) => r.data);

export const getSession = (id: number) =>
  client.get<GameSession>(`/sessions/${id}`).then((r) => r.data);

export const createSession = (data: GameSessionCreate) =>
  client.post<GameSession>("/sessions", data).then((r) => r.data);

export const updateSession = (id: number, data: GameSessionUpdate) =>
  client.put<GameSession>(`/sessions/${id}`, data).then((r) => r.data);

export const deleteSession = (id: number) =>
  client.delete(`/sessions/${id}`);

export const listPlayers = () =>
  client.get<PlayerWithCount[]>("/players").then((r) => r.data);

export const createPlayer = (name: string) =>
  client.post<Player>("/players", { name }).then((r) => r.data);

export const renamePlayer = (id: number, name: string) =>
  client.put<Player>(`/players/${id}`, { name }).then((r) => r.data);

export const deletePlayer = (id: number) =>
  client.delete(`/players/${id}`);

export const getPlayerProfileStats = (playerId: number) =>
  client.get<PlayerProfileStats>(`/players/${playerId}/stats`).then((r) => r.data);

export const toggleSealSession = (id: number) =>
  client.put<GameSession>(`/sessions/${id}/seal`).then((r) => r.data);

export const uploadSessionImage = (sessionId: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return client
    .post<SessionImage>(`/sessions/${sessionId}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const deleteSessionImage = (sessionId: number, imageId: number) =>
  client.delete(`/sessions/${sessionId}/images/${imageId}`);

export const setReaction = (sessionId: number, sessionPlayerId: number, reaction: string) =>
  client.put(`/sessions/${sessionId}/players/${sessionPlayerId}/reaction`, { reaction }).then((r) => r.data);
