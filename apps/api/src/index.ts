import cors from "@elysia/cors";
import openapi from "@elysia/openapi";
import { Elysia } from "elysia";
import { logixlysia } from "logixlysia";
import { env } from "./config/env";
import { corsConfig } from "./plugins/cors.plugin";
import { logixlysiaConfig } from "./plugins/logixlysia.plugin";
import { openapiConfig } from "./plugins/openapi.plugin";
import { routes } from "./routes";

new Elysia({ prefix: "/api" })
  .use(openapi(openapiConfig))
  .use(cors(corsConfig))
  .use(logixlysia({ config: logixlysiaConfig }))
  .use(routes)
  .listen(env.PORT);
