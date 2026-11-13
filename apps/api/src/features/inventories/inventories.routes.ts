import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { writeRateLimitConfig } from "@/plugins/rate-limit.plugin";
import { createInventoryBody, inventoryIdParams, updateInventoryBody } from "./inventories.model";
import { inventoryService } from "./inventories.service";

const service = inventoryService();

// Writes get their own, stricter rate limit on top of the global one.
const writeRoutes = new Elysia()
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createInventoryBody })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: inventoryIdParams,
    body: updateInventoryBody,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), { params: inventoryIdParams });

export const inventoryRoutes = new Elysia({ name: "inventories", prefix: "/inventories" })
  .get("/", () => service.list())
  .get("/:id", ({ params }) => service.findOne(params.id), { params: inventoryIdParams })
  .use(writeRoutes);
