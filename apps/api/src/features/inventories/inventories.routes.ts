import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { Role } from "@/features/users/roles";
import { authPlugin } from "@/plugins/auth.plugin";
import { writeRateLimitConfig } from "@/plugins/rate-limit.plugin";
import {
  createInventoryBody,
  inventoryIdParams,
  listInventoriesQuery,
  updateInventoryBody,
} from "./inventories.model";
import { inventoryService } from "./inventories.service";

const service = inventoryService();

// Writes get their own, stricter rate limit on top of the global one.
const writeRoutes = new Elysia()
  .use(authPlugin)
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createInventoryBody, role: Role.Reporter })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: inventoryIdParams,
    body: updateInventoryBody,
    role: Role.Reporter,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), {
    params: inventoryIdParams,
    role: Role.Manager,
  });

export const inventoryRoutes = new Elysia({ name: "inventories", prefix: "/inventories" })
  .use(authPlugin)
  .get("/", ({ query }) => service.list(query.reportId), {
    query: listInventoriesQuery,
    role: Role.Viewer,
  })
  .get("/:id", ({ params }) => service.findOne(params.id), {
    params: inventoryIdParams,
    role: Role.Viewer,
  })
  .use(writeRoutes);
