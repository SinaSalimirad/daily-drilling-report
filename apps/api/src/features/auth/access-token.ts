import { errors, jwtVerify, SignJWT } from "jose";
import z from "zod";
import { env } from "@/config/env";
import { Role } from "@/features/users/roles";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ttlSeconds = Math.round(env.ACCESS_TOKEN_TTL_MINUTES * 60);

// Checked on verify, so a token signed with the same secret for another purpose is refused.
const ISSUER = "daily-drilling-report-api";
const AUDIENCE = "daily-drilling-report";

export type AccessTokenClaims = { userId: string; sessionId: string; role: Role };

export type AccessTokenResult =
  | { ok: true; claims: AccessTokenClaims }
  | { ok: false; reason: "expired" | "invalid" };

// The payload is attacker-supplied until the signature is checked, and even then it should
// have the shape we sign; parse it instead of casting.
const payloadSchema = z.object({ sub: z.string(), sid: z.string(), role: z.enum(Role) });

export async function signAccessToken(claims: AccessTokenClaims, now = new Date()) {
  // JWT times are whole seconds.
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAtSeconds = issuedAt + ttlSeconds;

  const token = await new SignJWT({ sid: claims.sessionId, role: claims.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAtSeconds)
    .sign(secret);

  return { token, expiresAt: new Date(expiresAtSeconds * 1000) };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenResult> {
  try {
    // `algorithms` is pinned so a token with `alg: none` or another algorithm is refused.
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, reason: "invalid" };

    const { sub, sid, role } = parsed.data;
    return { ok: true, claims: { userId: sub, sessionId: sid, role } };
  } catch (error) {
    if (error instanceof errors.JWTExpired) return { ok: false, reason: "expired" };

    return { ok: false, reason: "invalid" };
  }
}
