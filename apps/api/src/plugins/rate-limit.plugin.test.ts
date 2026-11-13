import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

const { rateLimitConfig } = await import("./rate-limit.plugin");

const createApp = () =>
  new Elysia().use(rateLimit({ ...rateLimitConfig, max: 2 })).get("/ping", () => "pong");

const call = (app: ReturnType<typeof createApp>, ip: string) =>
  app.handle(new Request("http://localhost/ping", { headers: { "x-forwarded-for": ip } }));

describe("rate limit plugin", () => {
  test("returns 429 with a message once the limit is exceeded", async () => {
    const app = createApp();

    expect((await call(app, "1.1.1.1")).status).toBe(200);
    expect((await call(app, "1.1.1.1")).status).toBe(200);

    const blocked = await call(app, "1.1.1.1");
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ message: "Too many requests, please try again later." });
  });

  test("tracks each client ip separately", async () => {
    const app = createApp();

    await call(app, "1.1.1.1");
    await call(app, "1.1.1.1");

    expect((await call(app, "2.2.2.2")).status).toBe(200);
  });
});
