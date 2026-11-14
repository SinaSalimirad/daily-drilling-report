import { describe, expect, it } from "bun:test";
import { generateSessionToken, hashSessionToken } from "./session-token";

describe("session token", () => {
  it("is 32 random bytes as base64url (43 cookie-safe characters)", () => {
    expect(generateSessionToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("is different every time", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateSessionToken));
    expect(tokens.size).toBe(100);
  });

  it("hashes the same token to the same value, and never to the token itself", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(token);
    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });
});
