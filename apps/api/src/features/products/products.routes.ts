import Elysia from "elysia";
import { createProductBody, productIdParams, updateProductBody } from "./products.model";
import { productService } from "./products.service";

const service = productService();

export const productRoutes = new Elysia({ name: "products", prefix: "/products" })
  .get("/", () => service.list())
  .get("/:id", ({ params }) => service.findOne(params.id), { params: productIdParams })
  .post("/", ({ body }) => service.create(body), { body: createProductBody })
  .put("/:id", ({ params, body }) => service.update(params.id, body), {
    params: productIdParams,
    body: updateProductBody,
  })
  .delete("/:id", ({ params }) => service.remove(params.id), { params: productIdParams });
