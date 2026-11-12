import Elysia from "elysia";
import { createInventoryBody, inventoryIdParams, updateInventoryBody } from "./inventories.model";
import { inventoryService } from "./inventories.service";

const service = inventoryService();

export const inventoryRoutes = new Elysia({ name: "inventories", prefix: "/inventories" })
  .get("/", () => service.list())
  .get("/:id", ({ params }) => service.findOne(params.id), { params: inventoryIdParams })
  .post("/", ({ body }) => service.create(body), { body: createInventoryBody })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: inventoryIdParams,
    body: updateInventoryBody,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), { params: inventoryIdParams });
