import Elysia from "elysia";
import { productRoutes } from "./features/products/products.routes";

export const routes = new Elysia({ name: "routes", prefix: "/v1" })
    .use(productRoutes)