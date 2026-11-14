import { and, eq, gt, isNull } from "drizzle-orm";
import { env } from "@/config/env";
import { type DB, db, type Transaction } from "@/db";
import { publicUserColumns, users } from "@/features/users/users.schema";
import { generateSessionToken, hashSessionToken } from "./session-token";
import { sessions } from "./sessions.schema";

const HOUR_MS = 60 * 60 * 1000;
const sessionIdleMs = env.SESSION_IDLE_HOURS * HOUR_MS;
const sessionMaxAgeMs = env.SESSION_MAX_AGE_DAYS * 24 * HOUR_MS;

// `last_seen_at` is refreshed at most this often, so a busy user does not cause a write
// on every request. The idle timeout is therefore accurate to about 5 minutes.
const LAST_SEEN_REFRESH_MS = 5 * 60 * 1000;

export type SessionUser = NonNullable<Awaited<ReturnType<typeof findUserBySessionToken>>>;

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + sessionMaxAgeMs);

  await db.insert(sessions).values({ userId, tokenHash: hashSessionToken(token), expiresAt });

  return { token, expiresAt };
}

// The user behind a cookie token, or undefined when the session is unknown, revoked, past its
// absolute limit, idle for too long, or belongs to a deactivated user. All checks are in SQL.
export async function findUserBySessionToken(token: string) {
  const now = new Date();

  const [row] = await db
    .select({ sessionId: sessions.id, lastSeenAt: sessions.lastSeenAt, user: publicUserColumns })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        gt(sessions.lastSeenAt, new Date(now.getTime() - sessionIdleMs)),
        eq(users.isActive, true),
      ),
    );

  if (!row) return undefined;

  if (now.getTime() - row.lastSeenAt.getTime() > LAST_SEEN_REFRESH_MS) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.sessionId));
  }

  return row.user;
}

export async function revokeSession(token: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), isNull(sessions.revokedAt)));
}

// Logs a user out everywhere. Takes the caller's transaction so that, for example,
// "deactivate user" and "end their sessions" commit together or not at all.
export async function revokeAllSessionsForUser(userId: string, executor: DB | Transaction = db) {
  await executor
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
