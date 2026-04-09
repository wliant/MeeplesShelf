import client from "./client";

export const downloadJsonExport = (): Promise<Blob> =>
  client.get("/export", { responseType: "blob" }).then((r) => r.data);

export const downloadCsvExport = (): Promise<Blob> =>
  client
    .get("/export/sessions/csv", { responseType: "blob" })
    .then((r) => r.data);

export interface ImportResult {
  games_created: number;
  expansions_created: number;
  players_created: number;
  players_reused: number;
  tags_created: number;
  tags_reused: number;
  sessions_created: number;
}

export const uploadJsonImport = (file: File): Promise<ImportResult> =>
  file
    .text()
    .then((text) => JSON.parse(text))
    .then((json) => client.post<ImportResult>("/import", json))
    .then((r) => r.data);
