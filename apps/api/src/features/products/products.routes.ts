import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { writeRateLimitConfig } from "@/plugins/rate-limit.plugin";
import { createProductBody, productIdParams, updateProductBody } from "./products.model";
import { productService } from "./products.service";

const service = productService();

// Writes get their own, stricter rate limit on top of the global one.
const writeRoutes = new Elysia()
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createProductBody })
  .patch("/:id", ({ params, body }) => service.update(params.id, body), {
    params: productIdParams,
    body: updateProductBody,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), { params: productIdParams });

export const productRoutes = new Elysia({ name: "products", prefix: "/products" })
  .get("/", () => service.list())
  .get("/:id", ({ params }) => service.findOne(params.id), { params: productIdParams })
  .use(writeRoutes);
