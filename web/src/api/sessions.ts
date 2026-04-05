import client from "./client";
import type { GameSession, GameSessionCreate, GameSessionUpdate, Player } from "../types/session";

export const listSessions = (gameId?: number) =>
  client
    .get<GameSession[]>("/sessions", {
      params: gameId ? { game_id: gameId } : undefined,
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
  client.get<Player[]>("/players").then((r) => r.data);

export const createPlayer = (name: string) =>
  client.post<Player>("/players", { name }).then((r) => r.data);
