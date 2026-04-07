import { describe, it, expect } from "vitest";
import { formatRating } from "./rating";

describe("formatRating", () => {
  it("returns 'Not rated' for null", () => {
    expect(formatRating(null)).toBe("Not rated");
  });

  it("formats rating 1 as '1/10'", () => {
    expect(formatRating(1)).toBe("1/10");
  });

  it("formats rating 10 as '10/10'", () => {
    expect(formatRating(10)).toBe("10/10");
  });

  it("formats rating 7 as '7/10'", () => {
    expect(formatRating(7)).toBe("7/10");
  });
});
