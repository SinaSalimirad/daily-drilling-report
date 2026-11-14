import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { timestampConfig, uuidv7 } from "@/db/_shared/columns";
import { users } from "@/features/users/users.schema";

export const sessions = pgTable(
  "sessions",
  {
    id: uuidv7,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // SHA-256 of the token in the cookie. The raw token is never stored, so a leaked
    // database dump can't be used to log in.
    tokenHash: text("token_hash").notNull(),

    // Absolute limit, set once at login.
    expiresAt: timestamp("expires_at", timestampConfig).notNull(),
    // Last request seen; a session idle for longer than SESSION_IDLE_HOURS is dead.
    lastSeenAt: timestamp("last_seen_at", timestampConfig).defaultNow().notNull(),
    // Set on logout, or when the user is deactivated or gets a new password.
    revokedAt: timestamp("revoked_at", timestampConfig),

    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    // Serves the lookup on every authenticated request (WHERE token_hash = $1).
    unique("sessions_token_hash_unique").on(table.tokenHash),
    // Serves "revoke every session of this user" (WHERE user_id = $1).
    index("sessions_user_id_idx").on(table.userId),
  ],
);
