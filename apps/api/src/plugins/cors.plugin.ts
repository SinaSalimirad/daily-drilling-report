import type { CORSConfig } from "@elysia/cors";
import { env } from "@/config/env";

// An empty list disables CORS (no headers are sent); see CORS_ORIGINS in config/env.ts.
export const corsConfig: CORSConfig = {
  origin: env.CORS_ORIGINS,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  // Lets a web app on another dev origin (localhost:3000 -> :4000) send the session cookie.
  credentials: true,
  // Browsers may cache the preflight answer for 10 minutes instead of the library default of 5s.
  maxAge: 600,
};
