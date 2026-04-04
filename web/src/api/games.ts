import client from "./client";
import type { Game, GameCreate, ExpansionCreate, Expansion } from "../types/game";

export const listGames = () => client.get<Game[]>("/games").then((r) => r.data);

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

export const seedGames = () =>
  client.post<{ seeded: string[] }>("/seed").then((r) => r.data);
