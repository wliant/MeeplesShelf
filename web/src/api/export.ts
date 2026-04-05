import client from "./client";

export const downloadJsonExport = (): Promise<Blob> =>
  client.get("/export", { responseType: "blob" }).then((r) => r.data);

export const downloadCsvExport = (): Promise<Blob> =>
  client
    .get("/export/sessions/csv", { responseType: "blob" })
    .then((r) => r.data);
