// Starts the server. The Elysia app is wired up in app.ts.
import { env } from './config/env';
import './app';

console.info(`api configured for ${env.NODE_ENV} on port ${env.API_PORT}`);
