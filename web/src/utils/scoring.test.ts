import { describe, it, expect } from "vitest";
import type { ScoringSpec } from "../types/scoring";
import { mergeScoringSpec, calculateTotal } from "./scoring";

const BASE_SPEC: ScoringSpec = {
  version: 1,
  fields: [
    { id: "coins", label: "Coins", type: "raw_score" },
    { id: "military", label: "Military", type: "numeric", multiplier: 2 },
    { id: "longest_road", label: "Longest Road", type: "boolean", value: 5 },
  ],
};

describe("mergeScoringSpec", () => {
  it("returns base spec when patches array is empty", () => {
    const result = mergeScoringSpec(BASE_SPEC, []);
    expect(result.fields).toEqual(BASE_SPEC.fields);
  });

  it("skips null patches", () => {
    const result = mergeScoringSpec(BASE_SPEC, [null, null]);
    expect(result.fields).toEqual(BASE_SPEC.fields);
  });

  it("skips patches with empty fields", () => {
    const patch: ScoringSpec = { version: 1, fields: [] };
    const result = mergeScoringSpec(BASE_SPEC, [patch]);
    expect(result.fields).toEqual(BASE_SPEC.fields);
  });

  it("appends new fields from patch", () => {
    const patch: ScoringSpec = {
      version: 1,
      fields: [{ id: "harbor", label: "Harbor Bonus", type: "raw_score" }],
    };
    const result = mergeScoringSpec(BASE_SPEC, [patch]);
    expect(result.fields).toHaveLength(4);
    expect(result.fields[3]).toEqual({
      id: "harbor",
      label: "Harbor Bonus",
      type: "raw_score",
    });
  });

  it("overrides existing field by matching id", () => {
    const patch: ScoringSpec = {
      version: 1,
      fields: [
        {
          id: "military",
          label: "Military (Upgraded)",
          type: "numeric",
          multiplier: 3,
        },
      ],
    };
    const result = mergeScoringSpec(BASE_SPEC, [patch]);
    expect(result.fields).toHaveLength(3);
    const military = result.fields.find((f) => f.id === "military");
    expect(military).toBeDefined();
    expect(military!.label).toBe("Military (Upgraded)");
    expect(military!.type).toBe("numeric");
    if (military!.type === "numeric") {
      expect(military!.multiplier).toBe(3);
    }
  });

  it("applies multiple patches sequentially", () => {
    const patch1: ScoringSpec = {
      version: 1,
      fields: [{ id: "harbor", label: "Harbor", type: "raw_score" }],
    };
    const patch2: ScoringSpec = {
      version: 1,
      fields: [
        { id: "harbor", label: "Harbor (v2)", type: "numeric", multiplier: 2 },
      ],
    };
    const result = mergeScoringSpec(BASE_SPEC, [patch1, patch2]);
    expect(result.fields).toHaveLength(4);
    const harbor = result.fields.find((f) => f.id === "harbor");
    expect(harbor!.label).toBe("Harbor (v2)");
    expect(harbor!.type).toBe("numeric");
  });

  it("does not mutate the base spec", () => {
    const frozen: ScoringSpec = {
      version: 1,
      fields: [{ id: "coins", label: "Coins", type: "raw_score" }],
    };
    const originalFields = [...frozen.fields];
    const patch: ScoringSpec = {
      version: 1,
      fields: [
        { id: "coins", label: "Modified", type: "raw_score" },
        { id: "new_field", label: "New", type: "raw_score" },
      ],
    };
    mergeScoringSpec(frozen, [patch]);
    expect(frozen.fields).toEqual(originalFields);
    expect(frozen.fields).toHaveLength(1);
  });

  it("preserves version from base spec", () => {
    const spec: ScoringSpec = {
      version: 42,
      fields: [{ id: "a", label: "A", type: "raw_score" }],
    };
    const patch: ScoringSpec = {
      version: 1,
      fields: [{ id: "b", label: "B", type: "raw_score" }],
    };
    const result = mergeScoringSpec(spec, [patch]);
    expect(result.version).toBe(42);
  });
});

describe("calculateTotal with merged specs", () => {
  it("includes appended expansion field in total", () => {
    const patch: ScoringSpec = {
      version: 1,
      fields: [{ id: "harbor", label: "Harbor", type: "raw_score" }],
    };
    const merged = mergeScoringSpec(BASE_SPEC, [patch]);
    const scoreData = {
      coins: 10,
      military: 3,
      longest_road: true,
      harbor: 7,
    };
    // 10 + (3*2) + 5 + 7 = 28
    expect(calculateTotal(merged, scoreData)).toBe(28);
  });

  it("uses overridden expansion field", () => {
    const patch: ScoringSpec = {
      version: 1,
      fields: [
        { id: "military", label: "Military", type: "numeric", multiplier: 5 },
      ],
    };
    const merged = mergeScoringSpec(BASE_SPEC, [patch]);
    const scoreData = { coins: 10, military: 3, longest_road: false };
    // 10 + (3*5) + 0 = 25
    expect(calculateTotal(merged, scoreData)).toBe(25);
  });

  it("handles missing score data for expansion fields", () => {
    const patch: ScoringSpec = {
      version: 1,
      fields: [{ id: "harbor", label: "Harbor", type: "raw_score" }],
    };
    const merged = mergeScoringSpec(BASE_SPEC, [patch]);
    const scoreData = { coins: 10, military: 3, longest_road: true };
    // 10 + (3*2) + 5 + 0 = 21
    expect(calculateTotal(merged, scoreData)).toBe(21);
  });

  it("ignores extra score data not in spec", () => {
    const scoreData = {
      coins: 10,
      military: 3,
      longest_road: true,
      harbor: 7,
    };
    // 10 + (3*2) + 5 = 21 (harbor ignored)
    expect(calculateTotal(BASE_SPEC, scoreData)).toBe(21);
  });
});
