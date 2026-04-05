import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { extractErrorMessage } from "./errors";

function makeAxiosError(data: unknown, status = 400): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    data,
    status,
    statusText: "Bad Request",
    headers,
    config: { headers },
  });
}

describe("extractErrorMessage", () => {
  it("extracts string detail from axios error", () => {
    const err = makeAxiosError({ detail: "Game not found" }, 404);
    expect(extractErrorMessage(err)).toBe("Game not found");
  });

  it("extracts array detail from axios validation error", () => {
    const err = makeAxiosError({
      detail: [
        { msg: "field required", loc: ["body", "name"] },
        { msg: "value too short", loc: ["body", "name"] },
      ],
    }, 422);
    expect(extractErrorMessage(err)).toBe("field required; value too short");
  });

  it("falls back to Error.message for non-axios errors", () => {
    const err = new Error("Network failure");
    expect(extractErrorMessage(err)).toBe("Network failure");
  });

  it("returns default message for unknown error types", () => {
    expect(extractErrorMessage("something")).toBe("An unexpected error occurred");
    expect(extractErrorMessage(null)).toBe("An unexpected error occurred");
    expect(extractErrorMessage(42)).toBe("An unexpected error occurred");
  });

  it("falls back to Error.message when axios error has no detail", () => {
    const err = makeAxiosError({});
    expect(extractErrorMessage(err)).toBe("Request failed");
  });
});
