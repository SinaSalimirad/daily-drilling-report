import { eq } from 'drizzle-orm';
import { createAuth } from '../../auth/auth';
import { env } from '../../config/env';
import { createDb } from '../client';
import { user } from '../schema/auth';

// `bun run db:seed:admin`: creates the first admin from ADMIN_EMAIL and ADMIN_PASSWORD
// (docs/07: sign-up is closed, so the first user cannot come from the application). Idempotent:
// an existing user with that email is kept and promoted to admin, its password is not changed.

const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = env;
if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 10 characters).');
  process.exit(1);
}

const { db, pool } = createDb(env.DATABASE_URL);
try {
  const auth = createAuth(db, {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.APP_URL,
    production: env.NODE_ENV === 'production',
  });
  const context = await auth.$context;
  const [existing] = await db.select().from(user).where(eq(user.email, email.toLowerCase()));
  if (existing) {
    await db.update(user).set({ role: 'admin', banned: false }).where(eq(user.id, existing.id));
    console.info(`admin kept: ${email}`);
  } else {
    const created = await context.internalAdapter.createUser(
      { email: email.toLowerCase(), name: 'Administrator', emailVerified: true, role: 'admin' },
      { method: 'admin' },
    );
    await context.internalAdapter.createAccount({
      userId: created.id,
      providerId: 'credential',
      accountId: created.id,
      password: await context.password.hash(password),
    });
    console.info(`admin created: ${email}`);
  }
} finally {
  await pool.end();
}
