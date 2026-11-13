import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { writeRateLimitConfig } from "@/plugins/rate-limit.plugin";
import { createWellBody, listWellsQuery, updateWellBody, wellIdParams } from "./wells.model";
import { wellService } from "./wells.service";

const service = wellService();

// Writes get their own, stricter rate limit on top of the global one.
const writeRoutes = new Elysia()
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createWellBody })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: wellIdParams,
    body: updateWellBody,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), { params: wellIdParams });

export const wellRoutes = new Elysia({ name: "wells", prefix: "/wells" })
  .get("/", ({ query }) => service.list(query.projectId), { query: listWellsQuery })
  .get("/:id", ({ params }) => service.findOne(params.id), { params: wellIdParams })
  .use(writeRoutes);
