import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
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
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createReportBody })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: reportIdParams,
    body: updateReportBody,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), { params: reportIdParams });

export const reportRoutes = new Elysia({ name: "reports", prefix: "/reports" })
  .get("/", ({ query }) => service.list(query), { query: listReportsQuery })
  .get("/:id", ({ params }) => service.findOne(params.id), { params: reportIdParams })
  .use(writeRoutes);
