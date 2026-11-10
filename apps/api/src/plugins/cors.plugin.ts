import type { CORSConfig } from "@elysia/cors";
import { env } from "@/config/env";

export const corsConfig: CORSConfig = {
  origin: env.CORS_ORIGINS,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};
