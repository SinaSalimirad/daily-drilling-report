import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { Role } from "@/features/users/roles";
import { authPlugin } from "@/plugins/auth.plugin";
import { writeRateLimitConfig } from "@/plugins/rate-limit.plugin";
import {
  createSectionBody,
  listSectionsQuery,
  sectionIdParams,
  updateSectionBody,
} from "./sections.model";
import { sectionService } from "./sections.service";

const service = sectionService();

// Writes get their own, stricter rate limit on top of the global one.
const writeRoutes = new Elysia()
  .use(authPlugin)
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createSectionBody, role: Role.Manager })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: sectionIdParams,
    body: updateSectionBody,
    role: Role.Manager,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), {
    params: sectionIdParams,
    role: Role.Manager,
  });

export const sectionRoutes = new Elysia({ name: "sections", prefix: "/sections" })
  .use(authPlugin)
  .get("/", ({ query }) => service.list(query.wellId), {
    query: listSectionsQuery,
    role: Role.Viewer,
  })
  .get("/:id", ({ params }) => service.findOne(params.id), {
    params: sectionIdParams,
    role: Role.Viewer,
  })
  .use(writeRoutes);
