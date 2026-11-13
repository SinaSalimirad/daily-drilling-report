import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

const { rateLimitConfig, writeRateLimitConfig } = await import("./rate-limit.plugin");

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

  test("the write limit only applies to the routes that use it", async () => {
    const writes = new Elysia()
      .use(rateLimit({ ...writeRateLimitConfig, max: 1 }))
      .post("/items", () => "created");
    const app = new Elysia().get("/items", () => "list").use(writes);
    const ip = { "x-forwarded-for": "3.3.3.3" };
    const post = () =>
      app.handle(new Request("http://localhost/items", { method: "POST", headers: ip }));
    const get = () => app.handle(new Request("http://localhost/items", { headers: ip }));

    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(429);
    expect((await get()).status).toBe(200);
    expect((await get()).status).toBe(200);
  });
});
