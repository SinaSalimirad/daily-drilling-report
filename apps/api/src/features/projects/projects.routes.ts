import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { writeRateLimitConfig } from "@/plugins/rate-limit.plugin";
import { createProjectBody, projectIdParams, updateProjectBody } from "./projects.model";
import { projectService } from "./projects.service";

const service = projectService();

// Writes get their own, stricter rate limit on top of the global one.
const writeRoutes = new Elysia()
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createProjectBody })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: projectIdParams,
    body: updateProjectBody,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), { params: projectIdParams });

export const projectRoutes = new Elysia({ name: "projects", prefix: "/projects" })
  .get("/", () => service.list())
  .get("/:id", ({ params }) => service.findOne(params.id), { params: projectIdParams })
  .use(writeRoutes);
