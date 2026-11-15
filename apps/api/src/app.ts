import { Elysia } from 'elysia';
import { createAuth } from './auth/auth';
import { beginRequest, setAuthor } from './auth/context';
import { scopeCheckFor } from './auth/scope';
import { resolveWith, type SessionResolver } from './auth/session';
import type { Db } from './db/client';
import { accessRoutes } from './modules/access/routes';
import { bhaRunsRoutes } from './modules/bha-runs/routes';
import { healthRoutes } from './modules/health/routes';
import { holeSectionsRoutes } from './modules/hole-sections/routes';
import { hydraulicsRoutes } from './modules/hydraulics/routes';
import { inventoryRoutes } from './modules/inventory/routes';
import { lookupsRoutes } from './modules/lookups/routes';
import { pitReadingsRoutes } from './modules/pit-readings/routes';
import { pitsRoutes } from './modules/pits/routes';
import { productsRoutes } from './modules/products/routes';
import { projectsRoutes } from './modules/projects/routes';
import { pumpsRoutes } from './modules/pumps/routes';
import { recapRoutes } from './modules/recap/routes';
import { reportActivitiesRoutes } from './modules/report-activities/routes';
import { reportsRoutes } from './modules/reports/routes';
import { resultsRefresh } from './modules/results/refresh';
import { resultsRoutes } from './modules/results/routes';
import { samplesRoutes } from './modules/samples/routes';
import { sceRoutes } from './modules/sce/routes';
import { sectionsRoutes } from './modules/sections/routes';
import { surveyRoutes } from './modules/survey/routes';
import { volumesRoutes } from './modules/volumes/routes';
import { wellsRoutes } from './modules/wells/routes';
import { errorHandler } from './plugins/error-handler';
import { guard } from './plugins/guard';
import { type LoggerOptions, logger } from './plugins/logger';
import { originCheck } from './plugins/origin-check';
import { requestId } from './plugins/request-id';

// Builds the Elysia app. Configuration and the database are passed in, so tests can
// build an app without reading the environment.
// Routes: /api/health (unversioned) and /api/v1/* (docs/04-api-conventions.md).

export type AppConfig = {
  log: LoggerOptions;
  db: Db;
  /**
   * better-auth settings. Required unless `session` replaces the sign-in (tests that are not
   * about authentication).
   */
  auth?: { secret: string; baseURL: string; production: boolean; rateLimit?: boolean };
  /** Replaces the session lookup; the user then writes no `created_by` (no user row exists). */
  session?: SessionResolver;
};

export const createApp = ({ log, db, auth: authConfig, session }: AppConfig) => {
  const auth = session ? undefined : createAuth(db, authConfig ?? missingAuth());
  // User management writes through better-auth's own adapter, with or without a stub session.
  const userAuth = auth ?? createAuth(db, STUB_AUTH);
  const resolve = session ?? (auth ? resolveWith(auth) : missingAuth());
  const origin = new URL(authConfig?.baseURL ?? 'http://localhost').origin;
  return (
    new Elysia({ prefix: '/api' })
      .onRequest(() => beginRequest())
      .use(requestId)
      .use(logger(log))
      .use(errorHandler)
      .use(originCheck(origin))
      // The user of the request, resolved once; the guard checks the role per route.
      .derive({ as: 'global' }, async ({ request }) => {
        const authUser = await resolve(request);
        if (authUser && auth) setAuthor(authUser.id);
        return { authUser, scopeCheck: scopeCheckFor(db, authUser) };
      })
      .use(guard)
      .all('/auth/*', ({ request }) =>
        auth ? auth.handler(request) : new Response(null, { status: 404 }),
      )
      .use(healthRoutes(db))
      .group('/v1', (v1) =>
        v1
          .use(resultsRefresh(db))
          .use(accessRoutes(db, userAuth))
          .use(lookupsRoutes(db))
          .use(projectsRoutes(db))
          .use(wellsRoutes(db))
          .use(sectionsRoutes(db))
          .use(reportsRoutes(db))
          .use(reportActivitiesRoutes(db))
          .use(pitReadingsRoutes(db))
          .use(bhaRunsRoutes(db))
          .use(holeSectionsRoutes(db))
          .use(inventoryRoutes(db))
          .use(resultsRoutes(db))
          .use(recapRoutes(db))
          .use(surveyRoutes(db))
          .use(hydraulicsRoutes(db))
          .use(samplesRoutes(db))
          .use(volumesRoutes(db))
          .use(pitsRoutes(db))
          .use(pumpsRoutes(db))
          .use(sceRoutes(db))
          .use(productsRoutes(db)),
      )
  );
};

const STUB_AUTH = {
  secret: 'stub-secret-stub-secret-stub-secret-1',
  baseURL: 'http://localhost',
  production: false,
};

function missingAuth(): never {
  throw new Error('createApp needs `auth` or `session`');
}

/** The web app builds its Eden Treaty client from this type: `import type { App } from '@ddr/api'`. */
export type App = ReturnType<typeof createApp>;
