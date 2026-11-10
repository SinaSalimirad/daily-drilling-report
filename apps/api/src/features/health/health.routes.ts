import { Elysia } from "elysia";

export const healthRoutes = new Elysia({ name: "health" }).get("/health", () => ({
  status: "ok" as const,
  uptime: process.uptime(),
}));
