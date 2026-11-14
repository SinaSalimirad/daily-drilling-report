import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { eq } from "drizzle-orm";
import { app } from "@/app";
import { env } from "@/config/env";
import { db } from "@/db";
import { Role } from "@/features/users/roles";
import { users } from "@/features/users/users.schema";
import {
  cookiePair,
  findSession,
  refreshWithBody,
  refreshWithCookie,
  setCookiesOf,
  updateRefreshToken,
} from "../../../test/auth-helpers";
import { callApi, hasTestDatabase, resetDatabase, signInAs } from "../../../test/helpers";
import { hashRefreshToken } from "./refresh-token";
import { refreshTokens, sessions } from "./sessions.schema";
import { createSession } from "./sessions.service";

const SECOND_MS = 1000;
const DAY_MS = 24 * 60 * 60 * SECOND_MS;

// Makes a token look as if it was rotated long enough ago that a second use is not a tab race.
const pastGraceWindow = () =>
  new Date(Date.now() - (env.REFRESH_REUSE_GRACE_SECONDS + 5) * SECOND_MS);

describe.skipIf(!hasTestDatabase)("POST /auth/refresh", () => {
  let warn: ReturnType<typeof spyOn>;

  beforeEach(async () => {
    await resetDatabase();
    warn = spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  // The request logger also uses console.warn (for 4xx lines); keep only the theft warnings.
  const reuseWarnings = () =>
    warn.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .filter((line: string) => line.includes('"event":"refresh-token-reuse"'));

  describe("rotation", () => {
    it("gives the browser a new token pair as cookies and marks the old refresh token as used", async () => {
      const { refreshToken, refreshCookie } = await signInAs(Role.Viewer);

      const response = await refreshWithCookie(refreshCookie);

      expect(response.status).toBe(200);
      expect(await response.json()).not.toHaveProperty("refreshToken");
      const cookies = setCookiesOf(response);
      const newRefreshCookie = cookiePair(cookies.get("refresh_token"));
      expect(newRefreshCookie).not.toBe(refreshCookie);

      const accessCookie = cookiePair(cookies.get("access_token"));
      expect((await callApi("GET", "/auth/me", { cookie: accessCookie })).status).toBe(200);

      const [old] = await db
        .select({ rotatedAt: refreshTokens.rotatedAt })
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, hashRefreshToken(refreshToken)));
      expect(old?.rotatedAt).not.toBeNull();
    });

    it("gives the desktop app the new pair in the body and sets no cookie", async () => {
      const { refreshToken } = await signInAs(Role.Viewer);

      const response = await refreshWithBody(refreshToken);

      expect(response.status).toBe(200);
      expect(response.headers.getSetCookie()).toEqual([]);
      const body = (await response.json()) as { accessToken: string; refreshToken: string };
      expect(body.refreshToken).not.toBe(refreshToken);
      expect((await callApi("GET", "/auth/me", { token: body.accessToken })).status).toBe(200);
    });

    it("lets the chain continue: each new refresh token can be used once", async () => {
      const { refreshToken } = await signInAs(Role.Viewer);

      const first = (await (await refreshWithBody(refreshToken)).json()) as {
        refreshToken: string;
      };
      const second = await refreshWithBody(first.refreshToken);

      expect(second.status).toBe(200);
    });

    it("signs the new access token with the role from the database (a promotion shows up)", async () => {
      const { user, refreshToken } = await signInAs(Role.Viewer);
      await db.update(users).set({ role: Role.Admin }).where(eq(users.id, user.id));

      const body = (await (await refreshWithBody(refreshToken)).json()) as { accessToken: string };

      expect((await callApi("GET", "/users", { token: body.accessToken })).status).toBe(200);
    });

    it("never moves the 30-day session limit: the new token expires with the session", async () => {
      const { sessionId, refreshToken } = await signInAs(Role.Viewer);
      const sessionEnd = new Date(Date.now() + 2 * DAY_MS);
      await db.update(sessions).set({ expiresAt: sessionEnd }).where(eq(sessions.id, sessionId));

      const body = (await (await refreshWithBody(refreshToken)).json()) as {
        refreshExpiresAt: string;
      };

      expect(new Date(body.refreshExpiresAt).getTime()).toBe(sessionEnd.getTime());
    });
  });

  describe("reuse detection", () => {
    it("treats a second use within the grace window as a tab race: 409 and nothing is revoked", async () => {
      const { sessionId, refreshToken } = await signInAs(Role.Viewer);
      await refreshWithBody(refreshToken);

      const response = await refreshWithBody(refreshToken);

      expect(response.status).toBe(409);
      expect((await findSession(sessionId))?.revokedAt).toBeNull();
    });

    it("lets only one of two simultaneous refreshes with the same token rotate it", async () => {
      const { refreshToken } = await signInAs(Role.Viewer);

      const statuses = (
        await Promise.all([refreshWithBody(refreshToken), refreshWithBody(refreshToken)])
      ).map((response) => response.status);

      expect(statuses.sort()).toEqual([200, 409]);
    });

    it("ends every session of the user when a used token comes back after the grace window", async () => {
      const victim = await signInAs(Role.Viewer);
      // The same user is also logged in on a second device.
      const { sessionId: otherDeviceSessionId } = await createSession(victim.user.id);
      await refreshWithBody(victim.refreshToken);
      await updateRefreshToken(victim.refreshToken, { rotatedAt: pastGraceWindow() });

      const response = await refreshWithCookie(victim.refreshCookie);

      expect(response.status).toBe(401);
      expect(setCookiesOf(response).get("refresh_token")).toContain("Expires=Thu, 01 Jan 1970");
      expect((await findSession(victim.sessionId))?.revokeReason).toBe("refresh-token-reuse");
      expect((await findSession(otherDeviceSessionId))?.revokeReason).toBe("refresh-token-reuse");
      expect(reuseWarnings()).toHaveLength(1);
      expect(reuseWarnings()[0]).toContain(victim.user.id);
      expect(reuseWarnings()[0]).not.toContain(victim.refreshToken);
    });

    it("also ends the newest token of the chain, so the thief's (or the user's) copy stops working", async () => {
      const { refreshToken } = await signInAs(Role.Viewer);
      const rotated = (await (await refreshWithBody(refreshToken)).json()) as {
        refreshToken: string;
      };
      await updateRefreshToken(refreshToken, { rotatedAt: pastGraceWindow() });

      await refreshWithBody(refreshToken);

      expect((await refreshWithBody(rotated.refreshToken)).status).toBe(401);
    });

    it("does not end the user's later sessions when the same old token is replayed again", async () => {
      const { user, refreshToken } = await signInAs(Role.Viewer);
      await refreshWithBody(refreshToken);
      await updateRefreshToken(refreshToken, { rotatedAt: pastGraceWindow() });
      await refreshWithBody(refreshToken); // detected: everything ended
      const newLogin = await createSession(user.id);

      const replay = await refreshWithBody(refreshToken);

      expect(replay.status).toBe(401);
      expect((await findSession(newLogin.sessionId))?.revokedAt).toBeNull();
      expect(reuseWarnings()).toHaveLength(1);
    });
  });

  describe("refused", () => {
    it("without a refresh token", async () => {
      expect((await refreshWithCookie(undefined)).status).toBe(401);
    });

    it("for an unknown refresh token", async () => {
      expect((await refreshWithBody("made-up")).status).toBe(401);
    });

    it("when the body is not JSON", async () => {
      const { refreshCookie } = await signInAs(Role.Viewer);

      const response = await app.handle(
        new Request("http://localhost/api/v1/auth/refresh", {
          method: "POST",
          headers: { cookie: refreshCookie, "content-type": "text/plain" },
          body: "",
        }),
      );

      expect(response.status).toBe(415);
    });

    it("once the refresh token is past its 7 days", async () => {
      const { refreshToken } = await signInAs(Role.Viewer);
      await updateRefreshToken(refreshToken, { expiresAt: new Date(Date.now() - SECOND_MS) });

      expect((await refreshWithBody(refreshToken)).status).toBe(401);
    });

    it("once the session is past its absolute limit", async () => {
      const { sessionId, refreshToken } = await signInAs(Role.Viewer);
      await db
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() - SECOND_MS) })
        .where(eq(sessions.id, sessionId));

      expect((await refreshWithBody(refreshToken)).status).toBe(401);
    });

    it("for a deactivated user", async () => {
      const { user, refreshToken } = await signInAs(Role.Viewer);
      await db.update(users).set({ isActive: false }).where(eq(users.id, user.id));

      expect((await refreshWithBody(refreshToken)).status).toBe(401);
    });
  });
});
