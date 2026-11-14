import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { app } from "@/app";
import { db } from "@/db";
import { Role } from "@/features/users/roles";
import { users } from "@/features/users/users.schema";
import {
  cookiePair,
  findSession,
  refreshWithBody,
  refreshWithCookie,
  setCookiesOf,
} from "../../../test/auth-helpers";
import {
  callApi,
  createTestUser,
  hasTestDatabase,
  resetDatabase,
  signInAs,
  TEST_PASSWORD,
} from "../../../test/helpers";
import { signAccessToken } from "./access-token";

const MINUTE_MS = 60 * 1000;

const login = (email: string, password: string, cookie?: string) =>
  callApi("POST", "/auth/login", { body: { email, password }, cookie });

const postForm = (path: string, fields: Record<string, string>) =>
  app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields),
    }),
  );

describe.skipIf(!hasTestDatabase)("auth routes", () => {
  beforeEach(resetDatabase);

  describe("POST /auth/login", () => {
    it("rejects a login that is not sent as JSON, so a cross-site form cannot log a browser in", async () => {
      const user = await createTestUser(Role.Reporter);

      const response = await postForm("/auth/login", {
        email: user.email,
        password: TEST_PASSWORD,
      });

      expect(response.status).toBe(415);
      expect(response.headers.getSetCookie()).toEqual([]);
    });

    it("returns the user and sets both tokens as HttpOnly, SameSite=Lax cookies", async () => {
      const user = await createTestUser(Role.Reporter);

      const response = await login(user.email, TEST_PASSWORD);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({ id: user.id, email: user.email, role: Role.Reporter });
      expect(body).not.toHaveProperty("passwordHash");
      expect(body).not.toHaveProperty("accessToken");

      const cookies = setCookiesOf(response);
      for (const name of ["access_token", "refresh_token"]) {
        expect(cookies.get(name)).toContain("HttpOnly");
        expect(cookies.get(name)).toContain("SameSite=Lax");
      }
      expect(cookies.get("access_token")).toContain("Path=/api;");
      // Sent only to /auth/refresh and /auth/logout, never with ordinary requests.
      expect(cookies.get("refresh_token")).toContain("Path=/api/v1/auth");
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
      const { user, sessionId, refreshCookie } = await signInAs(Role.Viewer);

      const response = await login(user.email, TEST_PASSWORD, refreshCookie);

      expect(response.status).toBe(200);
      expect((await findSession(sessionId))?.revokeReason).toBe("replaced-by-login");
      expect((await refreshWithCookie(refreshCookie)).status).toBe(401);
    });
  });

  describe("POST /auth/token (desktop app)", () => {
    const requestToken = (email: string, password: string, token?: string) =>
      callApi("POST", "/auth/token", { body: { email, password }, token });

    it("returns both tokens in the body and sets no cookie", async () => {
      const user = await createTestUser(Role.Reporter);

      const response = await requestToken(user.email, TEST_PASSWORD);

      expect(response.status).toBe(200);
      expect(response.headers.getSetCookie()).toEqual([]);
      const body = (await response.json()) as Record<string, unknown> & { accessToken: string };
      expect(body.user).toMatchObject({ id: user.id, role: Role.Reporter });
      expect(body.user).not.toHaveProperty("passwordHash");
      expect(typeof body.refreshToken).toBe("string");
      expect(new Date(String(body.accessExpiresAt)).getTime()).toBeGreaterThan(Date.now());
      expect(new Date(String(body.refreshExpiresAt)).getTime()).toBeGreaterThan(Date.now());

      expect((await callApi("GET", "/auth/me", { token: body.accessToken })).status).toBe(200);
    });

    it("gives the same 401 as the cookie login for a wrong password", async () => {
      const user = await createTestUser(Role.Viewer);

      const response = await requestToken(user.email, "wrong-password");

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ message: "Invalid email or password." });
    });

    it("rejects a body that is not JSON", async () => {
      const user = await createTestUser(Role.Viewer);

      const response = await postForm("/auth/token", {
        email: user.email,
        password: TEST_PASSWORD,
      });

      expect(response.status).toBe(415);
    });

    it("ends the session of the access token the app sent along (rotation)", async () => {
      const { user, sessionId, token, refreshToken } = await signInAs(Role.Viewer);

      const response = await requestToken(user.email, TEST_PASSWORD, token);

      expect(response.status).toBe(200);
      expect((await findSession(sessionId))?.revokeReason).toBe("replaced-by-login");
      expect((await refreshWithBody(refreshToken)).status).toBe(401);
    });
  });

  describe("access token on protected routes", () => {
    it("is accepted as Authorization: Bearer", async () => {
      const { token } = await signInAs(Role.Viewer);

      expect((await callApi("GET", "/projects", { token })).status).toBe(200);
    });

    it("is accepted as the access_token cookie", async () => {
      const { cookie } = await signInAs(Role.Viewer);

      expect((await callApi("GET", "/projects", { cookie })).status).toBe(200);
    });

    it("prefers the header over the cookie when both are sent", async () => {
      const { cookie } = await signInAs(Role.Viewer);

      expect((await callApi("GET", "/auth/me", { cookie, token: "made-up" })).status).toBe(401);
    });

    it("is not accepted in place of an access token when it is a refresh token", async () => {
      const { refreshToken } = await signInAs(Role.Viewer);

      expect((await callApi("GET", "/projects", { token: refreshToken })).status).toBe(401);
    });

    it("returns 401 for a malformed header", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/v1/auth/me", { headers: { authorization: "Bearer" } }),
      );

      expect(response.status).toBe(401);
    });

    it('returns 401 with code "token-expired" once it has expired, so the client refreshes', async () => {
      const { user, sessionId } = await signInAs(Role.Viewer);
      const longAgo = new Date(Date.now() - 60 * MINUTE_MS);
      const { token } = await signAccessToken(
        { userId: user.id, sessionId, role: user.role },
        longAgo,
      );

      const response = await callApi("GET", "/projects", { token });

      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ code: "token-expired" });
    });
  });

  describe("GET /auth/me", () => {
    it("returns 401 without a token", async () => {
      expect((await callApi("GET", "/auth/me")).status).toBe(401);
    });

    it("returns the current user", async () => {
      const { user, cookie } = await signInAs(Role.Manager);

      const response = await callApi("GET", "/auth/me", { cookie });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ id: user.id, role: Role.Manager });
    });

    it("returns 401 for a deactivated user even while their access token is still valid", async () => {
      const { user, cookie } = await signInAs(Role.Viewer);
      await db.update(users).set({ isActive: false }).where(eq(users.id, user.id));

      expect((await callApi("GET", "/auth/me", { cookie })).status).toBe(401);
    });
  });

  describe("POST /auth/logout", () => {
    it("ends the browser's session and clears both cookies", async () => {
      const { sessionId, cookie, refreshCookie } = await signInAs(Role.Viewer);

      const response = await callApi("POST", "/auth/logout", {
        cookie: `${cookie}; ${refreshCookie}`,
      });

      expect(response.status).toBe(200);
      const cleared = setCookiesOf(response);
      expect(cleared.get("access_token")).toContain("Expires=Thu, 01 Jan 1970");
      expect(cleared.get("refresh_token")).toContain("Expires=Thu, 01 Jan 1970");
      expect((await findSession(sessionId))?.revokeReason).toBe("logout");
      expect((await refreshWithCookie(refreshCookie)).status).toBe(401);
    });

    it("ends the desktop app's session from the refresh token in the body", async () => {
      const { sessionId, refreshToken } = await signInAs(Role.Viewer);

      const response = await callApi("POST", "/auth/logout", { body: { refreshToken } });

      expect(response.status).toBe(200);
      expect((await findSession(sessionId))?.revokedAt).not.toBeNull();
    });

    it("ends the session of a valid access token when no refresh token is sent", async () => {
      const { sessionId, token } = await signInAs(Role.Viewer);

      expect((await callApi("POST", "/auth/logout", { token })).status).toBe(200);
      expect((await findSession(sessionId))?.revokedAt).not.toBeNull();
    });

    it("succeeds without a session", async () => {
      expect((await callApi("POST", "/auth/logout")).status).toBe(200);
    });
  });

  it("lets a fresh login's cookies be used for the next request", async () => {
    const user = await createTestUser(Role.Viewer);

    const response = await login(user.email, TEST_PASSWORD);
    const accessCookie = cookiePair(setCookiesOf(response).get("access_token"));

    expect((await callApi("GET", "/auth/me", { cookie: accessCookie })).status).toBe(200);
  });
});
