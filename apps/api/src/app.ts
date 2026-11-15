import { Elysia } from 'elysia';
import type { Db } from './db/client';
import { healthRoutes } from './modules/health/routes';
import { lookupsRoutes } from './modules/lookups/routes';
import { pitsRoutes } from './modules/pits/routes';
import { productsRoutes } from './modules/products/routes';
import { projectsRoutes } from './modules/projects/routes';
import { pumpsRoutes } from './modules/pumps/routes';
import { reportsRoutes } from './modules/reports/routes';
import { sceRoutes } from './modules/sce/routes';
import { sectionsRoutes } from './modules/sections/routes';
import { wellsRoutes } from './modules/wells/routes';
import { errorHandler } from './plugins/error-handler';
import { guard } from './plugins/guard';
import { type LoggerOptions, logger } from './plugins/logger';
import { requestId } from './plugins/request-id';

// Builds the Elysia app. Configuration and the database are passed in, so tests can
// build an app without reading the environment.
// Routes: /api/health (unversioned) and /api/v1/* (docs/04-api-conventions.md).

export type AppConfig = {
  log: LoggerOptions;
  db: Db;
};

export const createApp = ({ log, db }: AppConfig) =>
  new Elysia({ prefix: '/api' })
    .use(requestId)
    .use(logger(log))
    .use(errorHandler)
    .use(guard)
    .use(healthRoutes(db))
    .group('/v1', (v1) =>
      v1
        .use(lookupsRoutes(db))
        .use(projectsRoutes(db))
        .use(wellsRoutes(db))
        .use(sectionsRoutes(db))
        .use(reportsRoutes(db))
        .use(pitsRoutes(db))
        .use(pumpsRoutes(db))
        .use(sceRoutes(db))
        .use(productsRoutes(db)),
    );

/** The web app builds its Eden Treaty client from this type: `import type { App } from '@ddr/api'`. */
export type App = ReturnType<typeof createApp>;
