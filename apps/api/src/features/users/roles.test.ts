import { describe, expect, it } from "bun:test";
import { hasRole, Role } from "./roles";

describe("hasRole", () => {
  it("accepts the exact role", () => {
    expect(hasRole(Role.Manager, Role.Manager)).toBe(true);
  });

  it("accepts a higher role (checks are 'at least')", () => {
    expect(hasRole(Role.Admin, Role.Manager)).toBe(true);
    expect(hasRole(Role.Reporter, Role.Viewer)).toBe(true);
  });

  it("rejects a lower role", () => {
    expect(hasRole(Role.Reporter, Role.Manager)).toBe(false);
    expect(hasRole(Role.Viewer, Role.Reporter)).toBe(false);
    expect(hasRole(Role.Manager, Role.Admin)).toBe(false);
  });
});
