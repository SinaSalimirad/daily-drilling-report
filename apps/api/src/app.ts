import { Elysia } from 'elysia';
import { type LoggerOptions, logger } from './plugins/logger';
import { requestId } from './plugins/request-id';

// Builds the Elysia app. Configuration is passed in, so tests can build an app
// without reading the environment.

export type AppConfig = {
  log: LoggerOptions;
};

export const createApp = (config: AppConfig) => new Elysia().use(requestId).use(logger(config.log));
