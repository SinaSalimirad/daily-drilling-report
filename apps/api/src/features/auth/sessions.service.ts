import { and, eq, inArray, isNull } from "drizzle-orm";
import { env } from "@/config/env";
import { type DB, db, type Transaction } from "@/db";
import { users } from "@/features/users/users.schema";
import type { NewSession, RefreshResult } from "./auth.types";
import { generateRefreshToken, hashRefreshToken } from "./refresh-token";
import { refreshTokens, type SessionRevokeReason, sessions } from "./sessions.schema";

const DAY_MS = 24 * 60 * 60 * 1000;
const sessionMaxAgeMs = env.SESSION_MAX_AGE_DAYS * DAY_MS;
const refreshTokenTtlMs = env.REFRESH_TOKEN_TTL_DAYS * DAY_MS;
const reuseGraceMs = env.REFRESH_REUSE_GRACE_SECONDS * 1000;

type Executor = DB | Transaction;

// A refresh token never outlives its session: the 30-day cap wins over the 7-day window.
async function insertRefreshToken(
  sessionId: string,
  sessionExpiresAt: Date,
  executor: Executor,
  now = new Date(),
) {
  const token = generateRefreshToken();
  const expiresAt = new Date(
    Math.min(now.getTime() + refreshTokenTtlMs, sessionExpiresAt.getTime()),
  );

  await executor
    .insert(refreshTokens)
    .values({ sessionId, tokenHash: hashRefreshToken(token), expiresAt });

  return { token, expiresAt };
}

// A new login: one session row and its first refresh token.
export async function createSession(userId: string, executor: Executor = db): Promise<NewSession> {
  const expiresAt = new Date(Date.now() + sessionMaxAgeMs);

  const [session] = await executor
    .insert(sessions)
    .values({ userId, expiresAt })
    .returning({ id: sessions.id });
  if (!session) throw new Error("Session was not created");

  const refresh = await insertRefreshToken(session.id, expiresAt, executor);

  return {
    sessionId: session.id,
    refreshToken: refresh.token,
    refreshExpiresAt: refresh.expiresAt,
  };
}

// Exchanges a refresh token for a new one (rotation) and notices when an already-used token
// comes back (reuse detection). The caller signs the new access token with the returned role.
export function rotateRefreshToken(token: string): Promise<RefreshResult> {
  return db.transaction(async (tx) => {
    const now = new Date();

    // FOR UPDATE: two requests with the same token are serialised here, so only one of them
    // can rotate it; the other sees `rotated_at` set and is handled below.
    const [row] = await tx
      .select({
        tokenId: refreshTokens.id,
        tokenExpiresAt: refreshTokens.expiresAt,
        rotatedAt: refreshTokens.rotatedAt,
        sessionId: sessions.id,
        sessionExpiresAt: sessions.expiresAt,
        sessionRevokedAt: sessions.revokedAt,
        userId: users.id,
        role: users.role,
        isActive: users.isActive,
      })
      .from(refreshTokens)
      .innerJoin(sessions, eq(sessions.id, refreshTokens.sessionId))
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(refreshTokens.tokenHash, hashRefreshToken(token)))
      .for("update", { of: refreshTokens });

    if (!row) return { ok: false, reason: "invalid" };

    if (row.rotatedAt) {
      // Two tabs refreshed at the same moment; the other one already has the new tokens.
      if (now.getTime() - row.rotatedAt.getTime() <= reuseGraceMs) {
        return { ok: false, reason: "race" };
      }

      // Already ended (logout, or an earlier detection): nothing left to protect, and revoking
      // again would let whoever holds the old token log the user out over and over.
      if (row.sessionRevokedAt) return { ok: false, reason: "invalid" };

      // Only the newest token of a chain is ever sent by the real client, so an old one coming
      // back means two parties hold the chain. We can't tell which is the thief: end them all.
      await revokeAllSessionsForUser(row.userId, "refresh-token-reuse", tx);
      return { ok: false, reason: "reuse-detected", userId: row.userId, sessionId: row.sessionId };
    }

    const expired = row.tokenExpiresAt <= now || row.sessionExpiresAt <= now;
    if (row.sessionRevokedAt || expired || !row.isActive) return { ok: false, reason: "invalid" };

    await tx.update(refreshTokens).set({ rotatedAt: now }).where(eq(refreshTokens.id, row.tokenId));
    const refresh = await insertRefreshToken(row.sessionId, row.sessionExpiresAt, tx, now);

    return {
      ok: true,
      userId: row.userId,
      role: row.role,
      sessionId: row.sessionId,
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
    };
  });
}

export async function revokeSession(sessionId: string, reason: SessionRevokeReason) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date(), revokeReason: reason })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

// Ends the session a refresh token belongs to, whichever token of the chain it is.
export async function revokeSessionByRefreshToken(token: string, reason: SessionRevokeReason) {
  const sessionOfToken = db
    .select({ id: refreshTokens.sessionId })
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashRefreshToken(token)));

  await db
    .update(sessions)
    .set({ revokedAt: new Date(), revokeReason: reason })
    .where(and(inArray(sessions.id, sessionOfToken), isNull(sessions.revokedAt)));
}

// Logs a user out everywhere. Takes the caller's transaction so that, for example,
// "deactivate user" and "end their sessions" commit together or not at all.
// Access tokens already issued keep working until they expire (ACCESS_TOKEN_TTL_MINUTES).
export async function revokeAllSessionsForUser(
  userId: string,
  reason: SessionRevokeReason,
  executor: Executor = db,
) {
  await executor
    .update(sessions)
    .set({ revokedAt: new Date(), revokeReason: reason })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
