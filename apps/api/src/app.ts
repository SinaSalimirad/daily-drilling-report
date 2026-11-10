import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { healthRoutes } from "@/features/health/health.routes";
import { reportsRoutes } from "@/features/reports/reports.routes";
import { NotFoundError } from "@/shared/errors";

// nginx forwards /api/* untouched, so the whole API lives under /api.
export const app = new Elysia({ prefix: "/api" })
  .use(cors({ origin: env.corsOrigins.length ? env.corsOrigins : false }))
  .error({ NotFoundError })
  .onError(({ code, error, set }) => {
    if (code === "NotFoundError") {
      set.status = 404;
      return { error: error.message };
    }
  })
  .use(healthRoutes)
  .use(reportsRoutes);

export type App = typeof app;
