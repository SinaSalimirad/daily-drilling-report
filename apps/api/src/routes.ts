import Elysia from "elysia";
import { authRoutes } from "./features/auth/auth.routes";
import { inventoryRoutes } from "./features/inventories/inventories.routes";
import { productRoutes } from "./features/products/products.routes";
import { projectRoutes } from "./features/projects/projects.routes";
import { reportRoutes } from "./features/reports/reports.routes";
import { sectionRoutes } from "./features/sections/sections.routes";
import { userRoutes } from "./features/users/users.routes";
import { wellRoutes } from "./features/wells/wells.routes";

export const routes = new Elysia({ name: "routes", prefix: "/v1" })
  .use(authRoutes)
  .use(userRoutes)
  .use(productRoutes)
  .use(projectRoutes)
  .use(wellRoutes)
  .use(sectionRoutes)
  .use(reportRoutes)
  .use(inventoryRoutes);
