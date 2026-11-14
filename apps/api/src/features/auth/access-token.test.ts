import { describe, expect, it } from "bun:test";
import { SignJWT } from "jose";
import { env } from "@/config/env";
import { Role } from "@/features/users/roles";
import { signAccessToken, verifyAccessToken } from "./access-token";

const claims = {
  userId: "0192f0c4-0000-7000-8000-000000000001",
  sessionId: "0192f0c4-0000-7000-8000-000000000002",
  role: Role.Reporter,
};

const MINUTE_MS = 60 * 1000;

// Base64url without padding, the way a JWT encodes its header and payload.
const encodePart = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

describe("access token", () => {
  it("round-trips the user id, session id and role", async () => {
    const { token } = await signAccessToken(claims);

    expect(await verifyAccessToken(token)).toEqual({ ok: true, claims });
  });

  it("expires ACCESS_TOKEN_TTL_MINUTES after it is signed", async () => {
    const now = new Date();
    const { expiresAt } = await signAccessToken(claims, now);

    const expectedMs = now.getTime() + env.ACCESS_TOKEN_TTL_MINUTES * MINUTE_MS;
    expect(Math.abs(expiresAt.getTime() - expectedMs)).toBeLessThan(1000);
  });

  it("reports an expired token as expired, so the client knows to refresh", async () => {
    const longAgo = new Date(Date.now() - (env.ACCESS_TOKEN_TTL_MINUTES + 1) * MINUTE_MS);
    const { token } = await signAccessToken(claims, longAgo);

    expect(await verifyAccessToken(token)).toEqual({ ok: false, reason: "expired" });
  });

  it("refuses a token whose payload was changed after signing (role escalation)", async () => {
    const { token } = await signAccessToken(claims);
    const [header, , signature] = token.split(".");
    const forgedPayload = encodePart({ sub: claims.userId, sid: claims.sessionId, role: "admin" });

    const result = await verifyAccessToken(`${header}.${forgedPayload}.${signature}`);

    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it('refuses an unsigned token (alg: "none")', async () => {
    const header = encodePart({ alg: "none", typ: "JWT" });
    const payload = encodePart({ sub: claims.userId, sid: claims.sessionId, role: "admin" });

    expect(await verifyAccessToken(`${header}.${payload}.`)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("refuses a token signed with another secret", async () => {
    const token = await new SignJWT({ sid: claims.sessionId, role: claims.role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(claims.userId)
      .setIssuer("daily-drilling-report-api")
      .setAudience("daily-drilling-report")
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode("another-secret-that-is-also-long-enough"));

    expect(await verifyAccessToken(token)).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses garbage", async () => {
    expect(await verifyAccessToken("not-a-jwt")).toEqual({ ok: false, reason: "invalid" });
  });
});
