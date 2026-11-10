import { Elysia } from "elysia";
import { db } from "@/db/client";
import { createReportBody, reportIdParams } from "./reports.model";
import { createReportsService } from "./reports.service";

const service = createReportsService(db);

export const reportsRoutes = new Elysia({ name: "reports", prefix: "/reports" })
  .get("/", () => service.list())
  .get("/:id", ({ params }) => service.get(params.id), { params: reportIdParams })
  .post(
    "/",
    async ({ body, set }) => {
      set.status = 201;
      return service.create(body);
    },
    { body: createReportBody },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      await service.remove(params.id);
      set.status = 204;
    },
    { params: reportIdParams },
  );
