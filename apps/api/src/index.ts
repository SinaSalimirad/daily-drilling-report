import { createApp } from './app';
import { env } from './config/env';

// Starts the server.

const production = env.NODE_ENV === 'production';
const app = createApp({ log: { production, level: env.LOG_LEVEL } });

app.listen({ port: env.API_PORT, hostname: '0.0.0.0' }, ({ port }) => {
  const line = { time: new Date().toISOString(), level: 'info', event: 'server.started', port };
  console.info(production ? JSON.stringify(line) : `api listening on port ${port}`);
});
