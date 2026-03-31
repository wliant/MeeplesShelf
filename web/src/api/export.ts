import client from "./client";

const triggerDownload = (data: Blob, filename: string) => {
  const url = window.URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const exportCollection = async (format: "csv" | "json" = "csv") => {
  const resp = await client.get(`/export/collection`, {
    params: { format },
    responseType: "blob",
  });
  triggerDownload(resp.data, `collection.${format}`);
};

export const exportSessions = async (format: "csv" | "json" = "csv") => {
  const resp = await client.get(`/export/sessions`, {
    params: { format },
    responseType: "blob",
  });
  triggerDownload(resp.data, `sessions.${format}`);
};
