import z from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url().min(1, "DATABASE_URL is required"),
  // Comma-separated list of allowed browser origins. Empty (the default) means no CORS
  // headers at all, which is right behind nginx where web and api share one origin.
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url({ protocol: /^https?$/ }))),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WRITE_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  // Login gets its own, much smaller limit per window to slow down password guessing.
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(5),
  // A session ends after this many hours without a request (inactivity) ...
  SESSION_IDLE_HOURS: z.coerce.number().positive().default(12),
  // ... and at the latest this many days after login, however active it is.
  SESSION_MAX_AGE_DAYS: z.coerce.number().positive().default(30),
});

export const env = envSchema.parse(process.env);
