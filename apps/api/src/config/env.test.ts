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

  it("rejects an entry that is not an http(s) URL", () => {
    expect(() => envSchema.parse({ ...base, CORS_ORIGINS: "localhost:3000" })).toThrow();
    expect(() => envSchema.parse({ ...base, CORS_ORIGINS: "not a url" })).toThrow();
  });
});
