import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { Role } from "@/features/users/roles";
import { authPlugin } from "@/plugins/auth.plugin";
import { writeRateLimitConfig } from "@/plugins/rate-limit.plugin";
import { createProductBody, productIdParams, updateProductBody } from "./products.model";
import { productService } from "./products.service";

const service = productService();

// Writes get their own, stricter rate limit on top of the global one.
const writeRoutes = new Elysia()
  .use(authPlugin)
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createProductBody, role: Role.Manager })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: productIdParams,
    body: updateProductBody,
    role: Role.Manager,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), {
    params: productIdParams,
    role: Role.Manager,
  });

export const productRoutes = new Elysia({ name: "products", prefix: "/products" })
  .use(authPlugin)
  .get("/", () => service.list(), { role: Role.Viewer })
  .get("/:id", ({ params }) => service.findOne(params.id), {
    params: productIdParams,
    role: Role.Viewer,
  })
  .use(writeRoutes);
