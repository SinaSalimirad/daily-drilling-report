import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { app } from "@/app";
import { db } from "@/db";
import { Role } from "@/features/users/roles";
import { users } from "@/features/users/users.schema";
import {
  callApi,
  createTestUser,
  hasTestDatabase,
  resetDatabase,
  signInAs,
  TEST_PASSWORD,
} from "../../../test/helpers";
import { hashSessionToken } from "./session-token";
import { sessions } from "./sessions.schema";

const HOUR_MS = 60 * 60 * 1000;

const login = (email: string, password: string, cookie?: string) =>
  callApi("POST", "/auth/login", { body: { email, password }, cookie });

// "session=<token>; Path=/; ..." -> "session=<token>"
const sessionCookieFrom = (response: Response) => response.headers.get("set-cookie")?.split(";")[0];

const setSessionTimes = (token: string, times: { expiresAt?: Date; lastSeenAt?: Date }) =>
  db
    .update(sessions)
    .set(times)
    .where(eq(sessions.tokenHash, hashSessionToken(token)));

describe.skipIf(!hasTestDatabase)("auth routes", () => {
  beforeEach(resetDatabase);

  describe("POST /auth/login", () => {
    it("rejects a login that is not sent as JSON, so a cross-site form cannot log a browser in", async () => {
      const user = await createTestUser(Role.Reporter);

      const response = await app.handle(
        new Request("http://localhost/api/v1/auth/login", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ email: user.email, password: TEST_PASSWORD }),
        }),
      );

      expect(response.status).toBe(415);
      expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("returns the user without the password hash and sets an HttpOnly, SameSite=Lax cookie", async () => {
      const user = await createTestUser(Role.Reporter);

      const response = await login(user.email, TEST_PASSWORD);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({ id: user.id, email: user.email, role: Role.Reporter });
      expect(body).not.toHaveProperty("passwordHash");

      const setCookie = response.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("SameSite=Lax");
      expect(setCookie).toContain("Path=/");
    });

    it("treats the email case-insensitively", async () => {
      const user = await createTestUser(Role.Viewer);

      expect((await login(user.email.toUpperCase(), TEST_PASSWORD)).status).toBe(200);
    });

    it("gives the same 401 for a wrong password, an unknown email and a deactivated user", async () => {
      const user = await createTestUser(Role.Viewer);
      const inactive = await createTestUser(Role.Viewer);
      await db.update(users).set({ isActive: false }).where(eq(users.id, inactive.id));

      const responses = await Promise.all([
        login(user.email, "wrong-password"),
        login("nobody@example.com", TEST_PASSWORD),
        login(inactive.email, TEST_PASSWORD),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ message: "Invalid email or password." });
      }
    });

    it("refuses a user whose email is not verified (enforced from v1.1.0)", async () => {
      const user = await createTestUser(Role.Viewer);
      await db.update(users).set({ emailVerifiedAt: null }).where(eq(users.id, user.id));

      expect((await login(user.email, TEST_PASSWORD)).status).toBe(403);
    });

    it("ends the session the browser held before (session rotation)", async () => {
      const { user, cookie: oldCookie } = await signInAs(Role.Viewer);

      const response = await login(user.email, TEST_PASSWORD, oldCookie);

      expect(response.status).toBe(200);
      expect((await callApi("GET", "/auth/me", { cookie: oldCookie })).status).toBe(401);
      const newCookie = sessionCookieFrom(response);
      expect((await callApi("GET", "/auth/me", { cookie: newCookie })).status).toBe(200);
    });
  });

  describe("GET /auth/me", () => {
    it("returns 401 without a cookie", async () => {
      expect((await callApi("GET", "/auth/me")).status).toBe(401);
    });

    it("returns 401 for an unknown token", async () => {
      expect((await callApi("GET", "/auth/me", { cookie: "session=made-up" })).status).toBe(401);
    });

    it("returns the current user for a valid session", async () => {
      const { user, cookie } = await signInAs(Role.Manager);

      const response = await callApi("GET", "/auth/me", { cookie });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ id: user.id, role: Role.Manager });
    });

    it("returns 401 once the session is past its absolute limit", async () => {
      const { token, cookie } = await signInAs(Role.Viewer);
      await setSessionTimes(token, { expiresAt: new Date(Date.now() - 1000) });

      expect((await callApi("GET", "/auth/me", { cookie })).status).toBe(401);
    });

    it("returns 401 once the session was idle longer than the idle timeout", async () => {
      const { token, cookie } = await signInAs(Role.Viewer);
      await setSessionTimes(token, { lastSeenAt: new Date(Date.now() - 13 * HOUR_MS) });

      expect((await callApi("GET", "/auth/me", { cookie })).status).toBe(401);
    });

    it("refreshes last_seen_at, so an active session does not go idle", async () => {
      const { token, cookie } = await signInAs(Role.Viewer);
      await setSessionTimes(token, { lastSeenAt: new Date(Date.now() - 6 * HOUR_MS) });

      await callApi("GET", "/auth/me", { cookie });

      const [session] = await db
        .select({ lastSeenAt: sessions.lastSeenAt })
        .from(sessions)
        .where(eq(sessions.tokenHash, hashSessionToken(token)));
      expect(Date.now() - (session?.lastSeenAt.getTime() ?? 0)).toBeLessThan(60_000);
    });
  });

  describe("POST /auth/logout", () => {
    it("ends the session and clears the cookie", async () => {
      const { cookie } = await signInAs(Role.Viewer);

      const response = await callApi("POST", "/auth/logout", { cookie });

      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie")).toContain("Expires=Thu, 01 Jan 1970");
      expect((await callApi("GET", "/auth/me", { cookie })).status).toBe(401);
    });

    it("succeeds without a session", async () => {
      expect((await callApi("POST", "/auth/logout")).status).toBe(200);
    });
  });
});
