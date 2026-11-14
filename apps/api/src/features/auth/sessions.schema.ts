import { index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { timestampConfig, uuidv7 } from "@/db/_shared/columns";
import { users } from "@/features/users/users.schema";

export const sessionRevokeReason = pgEnum("session_revoke_reason", [
  "logout",
  // The same client logged in again; its old session is ended (session rotation).
  "replaced-by-login",
  // A refresh token was used twice: someone else has a copy. See rotateRefreshToken.
  "refresh-token-reuse",
  "password-change",
  "deactivated",
]);

export type SessionRevokeReason = (typeof sessionRevokeReason.enumValues)[number];

// One row per login. Every refresh token issued since that login belongs to it (a "token
// family"), so revoking the session kills the whole chain at once.
export const sessions = pgTable(
  "sessions",
  {
    id: uuidv7,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Absolute limit, SESSION_MAX_AGE_DAYS after login. Refreshing never moves it.
    expiresAt: timestamp("expires_at", timestampConfig).notNull(),
    revokedAt: timestamp("revoked_at", timestampConfig),
    revokeReason: sessionRevokeReason("revoke_reason"),

    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    // Serves "revoke every session of this user" (WHERE user_id = $1).
    index("sessions_user_id_idx").on(table.userId),
  ],
);

// Every refresh token ever issued, kept after use: an old one coming back is how theft is
// noticed. Only the newest row of a session has `rotated_at IS NULL`.
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuidv7,
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),

    // SHA-256 of the token; the raw token is never stored.
    tokenHash: text("token_hash").notNull(),
    // REFRESH_TOKEN_TTL_DAYS after it was issued, but never past the session's expires_at.
    expiresAt: timestamp("expires_at", timestampConfig).notNull(),
    // Set when the token was exchanged for a new one.
    rotatedAt: timestamp("rotated_at", timestampConfig),

    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    // Serves the lookup on every refresh (WHERE token_hash = $1).
    unique("refresh_tokens_token_hash_unique").on(table.tokenHash),
    // Serves the foreign key: deleting a session cascades through this column.
    index("refresh_tokens_session_id_idx").on(table.sessionId),
  ],
);
