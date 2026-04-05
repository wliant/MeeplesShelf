import { AxiosError } from "axios";

export function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError && error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: { msg?: string }) => d.msg || String(d))
        .join("; ");
    }
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
