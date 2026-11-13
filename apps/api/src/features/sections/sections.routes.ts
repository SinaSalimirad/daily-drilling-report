import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
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
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createSectionBody })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: sectionIdParams,
    body: updateSectionBody,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), { params: sectionIdParams });

export const sectionRoutes = new Elysia({ name: "sections", prefix: "/sections" })
  .get("/", ({ query }) => service.list(query.wellId), { query: listSectionsQuery })
  .get("/:id", ({ params }) => service.findOne(params.id), { params: sectionIdParams })
  .use(writeRoutes);
