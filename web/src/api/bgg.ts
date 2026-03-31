import client from "./client";
import type { BGGSearchResult } from "../types/bgg";
import type { Game } from "../types/game";

export const searchBGG = (query: string) =>
  client
    .get<BGGSearchResult[]>("/integrations/bgg/search", { params: { query } })
    .then((r) => r.data);

export const importFromBGG = (bgg_id: number) =>
  client
    .post<Game>("/integrations/bgg/import", { bgg_id })
    .then((r) => r.data);

export interface CollectionImportResult {
  imported: number;
  skipped: number;
  updated: number;
  total: number;
}

export const importCollection = (bggUsername: string) =>
  client
    .post<CollectionImportResult>("/integrations/bgg/import-collection", null, {
      params: { bgg_username: bggUsername },
    })
    .then((r) => r.data);
