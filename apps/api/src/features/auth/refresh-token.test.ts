import { describe, expect, it } from "bun:test";
import { generateRefreshToken, hashRefreshToken } from "./refresh-token";

describe("refresh token", () => {
  it("is 32 random bytes as base64url (43 cookie-safe characters)", () => {
    expect(generateRefreshToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("is different every time", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateRefreshToken));
    expect(tokens.size).toBe(100);
  });

  it("hashes the same token to the same value, and never to the token itself", () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).not.toBe(token);
    expect(hashRefreshToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });
});
