import client from "./client";

export interface SessionImportRow {
  game_name: string;
  date: string;
  players: string[];
  winner: string | null;
  scores: Record<string, number>;
  duration_minutes: number | null;
  location: string | null;
  notes: string | null;
}

export interface ImportPreviewResponse {
  rows: SessionImportRow[];
  total: number;
  errors: string[];
}

export interface ImportResultResponse {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function previewImport(
  file: File,
  format: "csv" | "bgstats"
): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await client.post("/import/preview", formData, {
    params: { format },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function importSessions(
  file: File,
  format: "csv" | "bgstats"
): Promise<ImportResultResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await client.post("/import/sessions", formData, {
    params: { format },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
