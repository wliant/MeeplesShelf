import client from "./client";
import type { Game, GameCreate, ExpansionCreate, Expansion, GameBrief } from "../types/game";

export const listGames = (params?: {
  collection_status?: string;
  search?: string;
}) => client.get<Game[]>("/games", { params }).then((r) => r.data);

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
