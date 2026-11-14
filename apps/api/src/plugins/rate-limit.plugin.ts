import type { Options } from "elysia-rate-limit";
import { env } from "@/config/env";

// Behind nginx every socket peer is the proxy, so prefer the forwarded client address.
export const clientIpGenerator: Options["generator"] = (request, server) => {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip") ?? forwarded ?? server?.requestIP(request)?.address;

  return ip ?? "unknown";
};

const baseConfig: Partial<Options> = {
  duration: env.RATE_LIMIT_WINDOW_MS,
  generator: clientIpGenerator,
  errorResponse: new Response(
    JSON.stringify({ message: "Too many requests, please try again later." }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  ),
};

// Applies to every route.
export const rateLimitConfig: Partial<Options> = {
  ...baseConfig,
  max: env.RATE_LIMIT_MAX,
  scoping: "global",
};

// Stricter limit for routes that change data (POST / PATCH / DELETE).
// "scoped" = only the routes of the Elysia instance that calls `.use(rateLimit(...))`.
export const writeRateLimitConfig: Partial<Options> = {
  ...baseConfig,
  max: env.RATE_LIMIT_WRITE_MAX,
  scoping: "scoped",
};

// Login only: a small budget per client ip slows down password guessing.
export const loginRateLimitConfig: Partial<Options> = {
  ...baseConfig,
  max: env.RATE_LIMIT_LOGIN_MAX,
  scoping: "scoped",
};
