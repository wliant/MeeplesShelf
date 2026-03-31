import client from "./client";
import type { Game, GameCreate, ExpansionCreate, Expansion, GameBrief, GameTag, PaginatedResponse } from "../types/game";

export const listGames = (params?: {
  collection_status?: string;
  search?: string;
  tag_id?: number;
  sort_by?: string;
  sort_dir?: string;
  offset?: number;
  limit?: number;
}) => client.get<PaginatedResponse<Game>>("/games", { params }).then((r) => r.data);

export const listGameOptions = () =>
  client.get<GameBrief[]>("/games/options").then((r) => r.data);

export const getGame = (id: number) =>
  client.get<Game>(`/games/${id}`).then((r) => r.data);

export const createGame = (data: GameCreate) =>
  client.post<Game>("/games", data).then((r) => r.data);

export const updateGame = (id: number, data: Partial<GameCreate>) =>
  client.put<Game>(`/games/${id}`, data).then((r) => r.data);

export const deleteGame = (id: number) => client.delete(`/games/${id}`);

export const toggleFavorite = (id: number) =>
  client.patch<Game>(`/games/${id}/favorite`).then((r) => r.data);

export const addExpansion = (gameId: number, data: ExpansionCreate) =>
  client
    .post<Expansion>(`/games/${gameId}/expansions`, data)
    .then((r) => r.data);

export const deleteExpansion = (gameId: number, expansionId: number) =>
  client.delete(`/games/${gameId}/expansions/${expansionId}`);

export const seedGames = () =>
  client.post<{ seeded: string[] }>("/seed").then((r) => r.data);

// --- Tags ---

export const listTags = () =>
  client.get<GameTag[]>("/tags").then((r) => r.data);

export const createTag = (name: string, color: string = "#666666") =>
  client.post<GameTag>("/tags", { name, color }).then((r) => r.data);

export const deleteTag = (id: number) => client.delete(`/tags/${id}`);

export const assignTag = (gameId: number, tagId: number) =>
  client.post(`/games/${gameId}/tags/${tagId}`);

export const removeTag = (gameId: number, tagId: number) =>
  client.delete(`/games/${gameId}/tags/${tagId}`);
