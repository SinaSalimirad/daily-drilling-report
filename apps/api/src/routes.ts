import Elysia from "elysia";
import { inventoryRoutes } from "./features/inventories/inventories.routes";
import { productRoutes } from "./features/products/products.routes";
import { projectRoutes } from "./features/projects/projects.routes";

export const routes = new Elysia({ name: "routes", prefix: "/v1" })
  .use(productRoutes)
  .use(projectRoutes)
  .use(inventoryRoutes);
