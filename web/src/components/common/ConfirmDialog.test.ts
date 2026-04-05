import { describe, it, expect } from "vitest";
import {
  buildGameDeleteMessage,
  buildSessionDeleteMessage,
  buildExpansionDeleteMessage,
} from "./ConfirmDialog";

describe("buildGameDeleteMessage", () => {
  it("mentions expansion count when game has expansions", () => {
    const msg = buildGameDeleteMessage("Catan", 3);
    expect(msg).toContain('"Catan"');
    expect(msg).toContain("3 expansions");
    expect(msg).toContain("all associated sessions");
    expect(msg).toContain("cannot be undone");
  });

  it("uses singular for one expansion", () => {
    const msg = buildGameDeleteMessage("Dominion", 1);
    expect(msg).toContain("1 expansion");
    expect(msg).not.toContain("1 expansions");
  });

  it("omits expansion count when game has no expansions", () => {
    const msg = buildGameDeleteMessage("War Chest", 0);
    expect(msg).toContain('"War Chest"');
    expect(msg).not.toContain("expansion");
    expect(msg).toContain("All associated sessions");
    expect(msg).toContain("cannot be undone");
  });
});

describe("buildSessionDeleteMessage", () => {
  it("includes game name and formatted date", () => {
    const msg = buildSessionDeleteMessage("Five Tribes", "2025-06-15T18:30:00Z");
    expect(msg).toContain("Five Tribes");
    expect(msg).toContain("cannot be undone");
    // Date formatting is locale-dependent, just verify it's not the raw ISO string
    expect(msg).not.toContain("T18:30:00Z");
  });
});

describe("buildExpansionDeleteMessage", () => {
  it("includes expansion name and game name", () => {
    const msg = buildExpansionDeleteMessage("Seafarers", "Catan");
    expect(msg).toContain('"Seafarers"');
    expect(msg).toContain("Catan");
    expect(msg).toContain("cannot be undone");
  });
});
