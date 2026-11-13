import Elysia from "elysia";
import { inventoryRoutes } from "./features/inventories/inventories.routes";
import { productRoutes } from "./features/products/products.routes";
import { projectRoutes } from "./features/projects/projects.routes";
import { reportRoutes } from "./features/reports/reports.routes";
import { sectionRoutes } from "./features/sections/sections.routes";
import { wellRoutes } from "./features/wells/wells.routes";

export const routes = new Elysia({ name: "routes", prefix: "/v1" })
  .use(productRoutes)
  .use(projectRoutes)
  .use(wellRoutes)
  .use(sectionRoutes)
  .use(reportRoutes)
  .use(inventoryRoutes);
