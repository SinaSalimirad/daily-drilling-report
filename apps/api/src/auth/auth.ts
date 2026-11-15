import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import type { Db } from '../db/client';
import { account, session, user, verification } from '../db/schema/auth';

// better-auth (docs/07): email and password, sign-up closed (an admin creates users), session
// in the database with an httpOnly cookie, the admin plugin for roles, ban and password reset.

const DAY = 60 * 60 * 24;

export type AuthOptions = {
  secret: string;
  baseURL: string;
  production: boolean;
  /** Rate limiting is on unless a test turns it off (many sign-ins from one address). */
  rateLimit?: boolean;
};

export function createAuth(db: Db, { secret, baseURL, production, rateLimit = true }: AuthOptions) {
  return betterAuth({
    secret,
    baseURL,
    basePath: '/api/auth',
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    // Seven days, renewed once a day on activity.
    session: { expiresIn: 7 * DAY, updateAge: DAY },
    // Only the application's own origin may send state-changing requests.
    trustedOrigins: [baseURL],
    advanced: {
      // UUIDs, so `created_by` / `updated_by` of the other tables can reference `user.id`.
      database: { generateId: () => crypto.randomUUID() },
      useSecureCookies: production,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
    },
    // Rate limit on sign-in (docs/07 checklist): five attempts a minute.
    rateLimit: {
      enabled: rateLimit,
      window: 60,
      max: 200,
      customRules: { '/sign-in/email': { window: 60, max: 5 } },
    },
    plugins: [admin({ adminRoles: ['admin'], defaultRole: 'engineer' })],
  });
}

export type Auth = ReturnType<typeof createAuth>;
