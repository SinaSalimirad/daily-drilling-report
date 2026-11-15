import { createApp } from './app';
import { env } from './config/env';
import { createDb } from './db/client';

// Starts the server.

const production = env.NODE_ENV === 'production';

const log = (event: string, fields: Record<string, unknown> = {}, level = 'info') => {
  const line = { time: new Date().toISOString(), level, event, ...fields };
  console.info(production ? JSON.stringify(line) : `${level} ${event} ${JSON.stringify(fields)}`);
};

const { db, pool } = createDb(env.DATABASE_URL, {
  onIdleError: (error) => log('database.connection_lost', { error: error.message }, 'error'),
});
const app = createApp({
  log: { production, level: env.LOG_LEVEL },
  db,
  auth: { secret: env.BETTER_AUTH_SECRET, baseURL: env.APP_URL, production },
});

app.listen({ port: env.API_PORT, hostname: '0.0.0.0' }, ({ port }) => {
  log('server.started', { port });
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    log('server.stopping', { signal });
    await app.stop();
    await pool.end();
    process.exit(0);
  });
}
