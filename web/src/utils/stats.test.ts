import { describe, it, expect } from "vitest";
import { formatWinRate, formatMonth, formatLastPlayed } from "./stats";

describe("formatWinRate", () => {
  it("formats zero", () => {
    expect(formatWinRate(0)).toBe("0.0%");
  });

  it("formats 100%", () => {
    expect(formatWinRate(1)).toBe("100.0%");
  });

  it("formats a fractional rate", () => {
    expect(formatWinRate(0.6667)).toBe("66.7%");
  });

  it("formats a small rate", () => {
    expect(formatWinRate(0.1)).toBe("10.0%");
  });
});

describe("formatMonth", () => {
  it("formats January", () => {
    expect(formatMonth("2025-01")).toBe("Jan 2025");
  });

  it("formats December", () => {
    expect(formatMonth("2024-12")).toBe("Dec 2024");
  });

  it("formats a mid-year month", () => {
    expect(formatMonth("2025-07")).toBe("Jul 2025");
  });
});

describe("formatLastPlayed", () => {
  it("formats an ISO date string", () => {
    const result = formatLastPlayed("2025-03-15T12:00:00Z");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("Never");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns Never for null", () => {
    expect(formatLastPlayed(null)).toBe("Never");
  });
});
