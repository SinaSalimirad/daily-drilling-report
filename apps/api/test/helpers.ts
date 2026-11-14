import { sql } from "drizzle-orm";
import { app } from "@/app";
import { db } from "@/db";
import { createSession } from "@/features/auth/sessions.service";
import type { Role } from "@/features/users/roles";
import { userService } from "@/features/users/users.service";

// Database tests use `describe.skipIf(!hasTestDatabase)`; see test/preload.ts.
export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

export const TEST_PASSWORD = "correct-horse-battery";

// Empties every table (the migrations journal lives in the "drizzle" schema and is kept).
export async function resetDatabase() {
  const result = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const tables = result.rows.map((row) => `"${row.tablename}"`).join(", ");

  if (tables) await db.execute(sql.raw(`TRUNCATE ${tables} CASCADE`));
}

let userCount = 0;

export async function createTestUser(role: Role) {
  userCount += 1;

  const user = await userService().create({
    email: `${role}-${userCount}@example.com`,
    password: TEST_PASSWORD,
    displayName: `Test ${role}`,
    role,
  });
  if (!user) throw new Error("Test user was not created");

  return user;
}

// A user of the given role with a live session, without going through /auth/login.
export async function signInAs(role: Role) {
  const user = await createTestUser(role);
  const { token } = await createSession(user.id);

  return { user, token, cookie: `session=${token}` };
}

// `token` is sent as `Authorization: Bearer`, the way the desktop app authenticates.
type RequestOptions = { cookie?: string; token?: string; body?: unknown };

export const callApi = (
  method: string,
  path: string,
  { cookie, token, body }: RequestOptions = {},
) => {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (body !== undefined) headers.set("content-type", "application/json");

  return app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
};
