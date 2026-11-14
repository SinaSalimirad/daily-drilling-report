import { describe, expect, it } from "bun:test";

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

const { envSchema } = await import("./env");

const base = { DATABASE_URL: "postgres://test:test@localhost:5432/test" };

describe("CORS_ORIGINS", () => {
  it("defaults to an empty list (no CORS behind nginx)", () => {
    expect(envSchema.parse(base).CORS_ORIGINS).toEqual([]);
  });

  it("treats an explicitly empty value like a missing one", () => {
    expect(envSchema.parse({ ...base, CORS_ORIGINS: "" }).CORS_ORIGINS).toEqual([]);
  });

  it("accepts a comma-separated list and trims each origin", () => {
    const parsed = envSchema.parse({
      ...base,
      CORS_ORIGINS: "http://localhost:3000, https://ddr.example.com ,",
    });
    expect(parsed.CORS_ORIGINS).toEqual(["http://localhost:3000", "https://ddr.example.com"]);
  });

  it("accepts the Tauri webview origins of the desktop app", () => {
    const parsed = envSchema.parse({
      ...base,
      CORS_ORIGINS: "tauri://localhost,http://tauri.localhost",
    });
    expect(parsed.CORS_ORIGINS).toEqual(["tauri://localhost", "http://tauri.localhost"]);
  });

  it("rejects an entry that is not an http(s) or tauri URL", () => {
    expect(() => envSchema.parse({ ...base, CORS_ORIGINS: "localhost:3000" })).toThrow();
    expect(() => envSchema.parse({ ...base, CORS_ORIGINS: "not a url" })).toThrow();
    expect(() => envSchema.parse({ ...base, CORS_ORIGINS: "ftp://example.com" })).toThrow();
  });
});

describe("auth settings", () => {
  it("defaults to a 12 hour idle timeout, 30 day sessions and 5 logins per window", () => {
    const parsed = envSchema.parse(base);
    expect(parsed.SESSION_IDLE_HOURS).toBe(12);
    expect(parsed.SESSION_MAX_AGE_DAYS).toBe(30);
    expect(parsed.RATE_LIMIT_LOGIN_MAX).toBe(5);
  });

  it("rejects a session lifetime of zero", () => {
    expect(() => envSchema.parse({ ...base, SESSION_MAX_AGE_DAYS: "0" })).toThrow();
  });
});
