import client from "./client";
import type { Game, GameCreate, ExpansionCreate, Expansion } from "../types/game";
import type { PaginatedResponse } from "../types/pagination";

export interface GameListParams {
  name?: string;
  skip?: number;
  limit?: number;
}

export const listGames = (params?: GameListParams) =>
  client.get<PaginatedResponse<Game>>("/games", { params }).then((r) => r.data);

export const getGame = (id: number) =>
  client.get<Game>(`/games/${id}`).then((r) => r.data);

export const createGame = (data: GameCreate) =>
  client.post<Game>("/games", data).then((r) => r.data);

export const updateGame = (id: number, data: Partial<GameCreate>) =>
  client.put<Game>(`/games/${id}`, data).then((r) => r.data);

export const deleteGame = (id: number) => client.delete(`/games/${id}`);

export const addExpansion = (gameId: number, data: ExpansionCreate) =>
  client
    .post<Expansion>(`/games/${gameId}/expansions`, data)
    .then((r) => r.data);

export const deleteExpansion = (gameId: number, expansionId: number) =>
  client.delete(`/games/${gameId}/expansions/${expansionId}`);

export const uploadGameImage = (gameId: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return client
    .post<Game>(`/games/${gameId}/image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const deleteGameImage = (gameId: number) =>
  client.delete(`/games/${gameId}/image`);

export const seedGames = () =>
  client.post<{ seeded: string[] }>("/seed").then((r) => r.data);
