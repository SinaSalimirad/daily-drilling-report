import cors from "@elysia/cors";
import openapi from "@elysia/openapi";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { logixlysia } from "logixlysia";
import { corsConfig } from "./plugins/cors.plugin";
import { dbErrorsPlugin } from "./plugins/db-errors.plugin";
import { logixlysiaConfig } from "./plugins/logixlysia.plugin";
import { openapiConfig } from "./plugins/openapi.plugin";
import { rateLimitConfig } from "./plugins/rate-limit.plugin";
import { routes } from "./routes";

// Built without `.listen()`, so tests can call `app.handle(request)` with no open port.
export const app = new Elysia({ prefix: "/api" })
  .use(openapi(openapiConfig))
  .use(cors(corsConfig))
  .use(rateLimit(rateLimitConfig))
  .use(logixlysia({ config: logixlysiaConfig }))
  .use(dbErrorsPlugin)
  .use(routes);
