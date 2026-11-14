import z from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url().min(1, "DATABASE_URL is required"),
  // Comma-separated list of allowed browser origins. Empty (the default) means no CORS
  // headers at all, which is right behind nginx where web and api share one origin.
  // The desktop app needs its webview origin here: `tauri://localhost` (macOS, Linux) and
  // `http://tauri.localhost` (Windows).
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url({ protocol: /^(https?|tauri)$/ }))),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WRITE_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  // Login gets its own, much smaller limit per window to slow down password guessing.
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(5),
  // Refreshing happens every ACCESS_TOKEN_TTL_MINUTES per open client, so it needs more room.
  RATE_LIMIT_REFRESH_MAX: z.coerce.number().int().positive().default(30),

  // Signs the access tokens (HS256). No default on purpose: a guessable secret lets anyone
  // forge a token for any user. Generate one with `openssl rand -base64 48`.
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  // Access tokens can't be revoked, so this is also how long a logged-out or deactivated
  // user can keep using one they already have.
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().positive().default(15),
  // Each refresh token lives this long; using it gives a new one, so an active user stays in ...
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().positive().default(7),
  // ... until this many days after login, however active they are.
  SESSION_MAX_AGE_DAYS: z.coerce.number().positive().default(30),
  // An already-used refresh token arriving this soon after its rotation is a race between
  // tabs, not theft (see rotateRefreshToken).
  REFRESH_REUSE_GRACE_SECONDS: z.coerce.number().nonnegative().default(10),
});

export const env = envSchema.parse(process.env);
