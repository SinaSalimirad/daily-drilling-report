import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { Role } from "@/features/users/roles";
import { authPlugin } from "@/plugins/auth.plugin";
import { writeRateLimitConfig } from "@/plugins/rate-limit.plugin";
import { createWellBody, listWellsQuery, updateWellBody, wellIdParams } from "./wells.model";
import { wellService } from "./wells.service";

const service = wellService();

// Writes get their own, stricter rate limit on top of the global one.
const writeRoutes = new Elysia()
  .use(authPlugin)
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createWellBody, role: Role.Manager })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: wellIdParams,
    body: updateWellBody,
    role: Role.Manager,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), {
    params: wellIdParams,
    role: Role.Manager,
  });

export const wellRoutes = new Elysia({ name: "wells", prefix: "/wells" })
  .use(authPlugin)
  .get("/", ({ query }) => service.list(query.projectId), {
    query: listWellsQuery,
    role: Role.Viewer,
  })
  .get("/:id", ({ params }) => service.findOne(params.id), {
    params: wellIdParams,
    role: Role.Viewer,
  })
  .use(writeRoutes);
