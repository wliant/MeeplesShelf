import { describe, it, expect, beforeAll } from "vitest";
import {
  formatDateTime,
  formatDate,
  formatTime,
  formatLastPlayed,
  toLocalDateTimeInput,
  fromLocalDateTimeInput,
} from "./datetime";

beforeAll(() => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz !== "America/New_York") {
    throw new Error(
      `Tests require TZ=America/New_York, got ${tz}. ` +
        `Run via the npm test scripts which pin TZ.`,
    );
  }
});

describe("formatDateTime", () => {
  it("formats a UTC ISO string in local time", () => {
    // 20:30 UTC on 2026-05-04 is 16:30 EDT. Day/month order varies by locale.
    const result = formatDateTime("2026-05-04T20:30:00Z");
    expect(result).toMatch(/(?:5\/4|4\/5)\/26/);
    expect(result).toMatch(/4:30/);
  });

  it("returns the fallback for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });

  it("returns the fallback for undefined", () => {
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("returns the fallback for an invalid date string", () => {
    expect(formatDateTime("not-a-date")).toBe("—");
  });

  it("respects a custom fallback", () => {
    expect(formatDateTime(null, "n/a")).toBe("n/a");
  });
});

describe("formatDate", () => {
  it("formats a UTC ISO string as a localized date", () => {
    const result = formatDate("2026-05-04T20:30:00Z");
    expect(result).toMatch(/(?:5\/4|4\/5)\/26/);
  });

  it("returns the fallback for null", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("formatTime", () => {
  it("formats a UTC ISO string as a localized time", () => {
    const result = formatTime("2026-05-04T20:30:00Z");
    expect(result).toMatch(/4:30/);
  });
});

describe("formatLastPlayed", () => {
  it("formats an ISO date string as a date", () => {
    const result = formatLastPlayed("2025-03-15T12:00:00Z");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("Never");
  });

  it("returns Never for null", () => {
    expect(formatLastPlayed(null)).toBe("Never");
  });

  it("returns Never for undefined", () => {
    expect(formatLastPlayed(undefined)).toBe("Never");
  });
});

describe("toLocalDateTimeInput", () => {
  it("converts UTC to local wall time for datetime-local input", () => {
    // 20:30 UTC → 16:30 EDT.
    expect(toLocalDateTimeInput("2026-05-04T20:30:00Z")).toBe(
      "2026-05-04T16:30",
    );
  });

  it("crosses a date boundary backwards", () => {
    // 03:00 UTC on May 4 → 23:00 EDT on May 3.
    expect(toLocalDateTimeInput("2026-05-04T03:00:00Z")).toBe(
      "2026-05-03T23:00",
    );
  });

  it("zero-pads single-digit components", () => {
    // 14:05 UTC on Jan 5 → 09:05 EST.
    expect(toLocalDateTimeInput("2026-01-05T14:05:00Z")).toBe(
      "2026-01-05T09:05",
    );
  });
});

describe("fromLocalDateTimeInput", () => {
  it("converts local wall time to a UTC ISO string", () => {
    // 16:30 EDT → 20:30 UTC.
    expect(fromLocalDateTimeInput("2026-05-04T16:30")).toBe(
      "2026-05-04T20:30:00.000Z",
    );
  });

  it("round-trips with toLocalDateTimeInput", () => {
    const iso = "2026-06-15T12:00:00.000Z";
    expect(fromLocalDateTimeInput(toLocalDateTimeInput(iso))).toBe(iso);
  });

  it("round-trips across DST spring-forward", () => {
    // 2026-03-08 02:00 EST → 03:00 EDT. 07:00 UTC is post-transition.
    const iso = "2026-03-08T07:00:00.000Z";
    expect(fromLocalDateTimeInput(toLocalDateTimeInput(iso))).toBe(iso);
  });
});
