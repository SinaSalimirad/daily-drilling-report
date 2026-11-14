import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { Role } from "@/features/users/roles";
import { authPlugin } from "@/plugins/auth.plugin";
import { writeRateLimitConfig } from "@/plugins/rate-limit.plugin";
import { createProjectBody, projectIdParams, updateProjectBody } from "./projects.model";
import { projectService } from "./projects.service";

const service = projectService();

// Writes get their own, stricter rate limit on top of the global one.
const writeRoutes = new Elysia()
  .use(authPlugin)
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createProjectBody, role: Role.Manager })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: projectIdParams,
    body: updateProjectBody,
    role: Role.Manager,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), {
    params: projectIdParams,
    role: Role.Manager,
  });

export const projectRoutes = new Elysia({ name: "projects", prefix: "/projects" })
  .use(authPlugin)
  .get("/", () => service.list(), { role: Role.Viewer })
  .get("/:id", ({ params }) => service.findOne(params.id), {
    params: projectIdParams,
    role: Role.Viewer,
  })
  .use(writeRoutes);
