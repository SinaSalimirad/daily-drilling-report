import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { Role } from "@/features/users/roles";
import { authPlugin } from "@/plugins/auth.plugin";
import { writeRateLimitConfig } from "@/plugins/rate-limit.plugin";
import {
  createReportBody,
  listReportsQuery,
  reportIdParams,
  updateReportBody,
} from "./reports.model";
import { reportService } from "./reports.service";

const service = reportService();

// Writes get their own, stricter rate limit on top of the global one.
const writeRoutes = new Elysia()
  .use(authPlugin)
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createReportBody, role: Role.Reporter })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: reportIdParams,
    body: updateReportBody,
    role: Role.Reporter,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), {
    params: reportIdParams,
    role: Role.Manager,
  });

export const reportRoutes = new Elysia({ name: "reports", prefix: "/reports" })
  .use(authPlugin)
  .get("/", ({ query }) => service.list(query), { query: listReportsQuery, role: Role.Viewer })
  .get("/:id", ({ params }) => service.findOne(params.id), {
    params: reportIdParams,
    role: Role.Viewer,
  })
  .use(writeRoutes);
