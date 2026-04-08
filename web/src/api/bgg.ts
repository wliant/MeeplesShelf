import client from "./client";
import type { BGGSearchResponse, BGGGameDetail } from "../types/bgg";

export const searchBGG = (query: string) =>
  client
    .get<BGGSearchResponse>("/bgg/search", { params: { query } })
    .then((r) => r.data);

export const getBGGDetails = (bggId: number) =>
  client
    .get<BGGGameDetail>(`/bgg/details/${bggId}`)
    .then((r) => r.data);

export const importBGGImage = (bggId: number, gameId: number) =>
  client
    .post<{ image_url: string }>(`/bgg/import-image/${bggId}`, null, {
      params: { game_id: gameId },
    })
    .then((r) => r.data);
