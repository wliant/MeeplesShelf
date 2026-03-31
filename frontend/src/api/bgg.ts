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
