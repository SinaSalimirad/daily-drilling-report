import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    /** Signs sessions (better-auth). Required in production; the development default is public. */
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, 'at least 32 characters')
      .default('development-only-secret-do-not-use-in-production'),
    /** The public origin of the application; the only origin trusted for state-changing requests. */
    APP_ORIGIN: z.url().default('http://localhost'),
    /** Base URL of better-auth; the application origin when not set. */
    BETTER_AUTH_URL: z.url().optional(),
    /** First admin, created by `db:seed:admin`. */
    ADMIN_EMAIL: z.email().optional(),
    ADMIN_PASSWORD: z.string().min(10).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.NODE_ENV === 'production' &&
      value.BETTER_AUTH_SECRET === 'development-only-secret-do-not-use-in-production'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['BETTER_AUTH_SECRET'],
        message: 'must be set in production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Validates a set of variables; throws an Error that names every bad variable. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;
  const lines = result.error.issues.map((issue) => {
    const name = issue.path.join('.');
    return source[name] === undefined ? `  ${name}: missing` : `  ${name}: ${issue.message}`;
  });
  throw new Error(`Invalid environment:\n${lines.join('\n')}`);
}
