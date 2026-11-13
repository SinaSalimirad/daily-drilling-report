import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { dbErrorsPlugin } from "./db-errors.plugin";

// Same shape drizzle produces: a wrapper error whose `cause` is the node-postgres error.
const dbError = (code: string) => new Error("query failed", { cause: { code } });

const app = new Elysia()
  .use(dbErrorsPlugin)
  .post("/fk", () => {
    throw dbError("23503");
  })
  .patch("/fk", () => {
    throw dbError("23503");
  })
  .delete("/fk", () => {
    throw dbError("23503");
  })
  .post("/unique", () => {
    throw dbError("23505");
  })
  .post("/check", () => {
    throw dbError("23514");
  })
  .post("/other", () => {
    throw new Error("boom");
  });

const call = (method: string, path: string) =>
  app.handle(new Request(`http://localhost${path}`, { method }));

const messageOf = async (res: Response) => ((await res.json()) as { message: string }).message;

describe("db errors plugin", () => {
  test("a foreign key violation on DELETE means the row is still referenced (409)", async () => {
    const res = await call("DELETE", "/fk");
    expect(res.status).toBe(409);
    expect(await messageOf(res)).toContain("can't be deleted");
  });

  test.each([
    "POST",
    "PATCH",
  ])("a foreign key violation on %s is a missing reference (422)", async (method) => {
    const res = await call(method, "/fk");
    expect(res.status).toBe(422);
    expect(await messageOf(res)).toContain("does not exist");
  });

  test("a unique violation is a duplicate (409)", async () => {
    const res = await call("POST", "/unique");
    expect(res.status).toBe(409);
    expect(await messageOf(res)).toContain("already exists");
  });

  test("a check violation is an invalid value (422)", async () => {
    expect((await call("POST", "/check")).status).toBe(422);
  });

  test("other errors are left to Elysia (500)", async () => {
    expect((await call("POST", "/other")).status).toBe(500);
  });
});
