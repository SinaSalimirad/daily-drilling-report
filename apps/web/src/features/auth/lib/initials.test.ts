/// <reference types="bun-types" />
import { describe, expect, it } from "bun:test";
import { initialsOf } from "./initials";

describe("initialsOf", () => {
  it("takes the first letter of the first and last word", () => {
    expect(initialsOf("Sina Salimirad")).toBe("SS");
    expect(initialsOf("Ali Reza Karimi")).toBe("AK");
  });

  it("takes the first two letters of a single word", () => {
    expect(initialsOf("admin")).toBe("AD");
  });

  it("ignores extra spaces", () => {
    expect(initialsOf("  Sina   Salimirad  ")).toBe("SS");
  });

  it("works for a one-letter name and for non-Latin names", () => {
    expect(initialsOf("X")).toBe("X");
    expect(initialsOf("سینا سلیمی")).toBe("سس");
  });

  it("returns a placeholder for an empty name", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });
});
