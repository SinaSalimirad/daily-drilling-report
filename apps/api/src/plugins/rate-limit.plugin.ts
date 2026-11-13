import type { Options } from "elysia-rate-limit";
import { env } from "@/config/env";

// Behind nginx every socket peer is the proxy, so prefer the forwarded client address.
export const clientIpGenerator: Options["generator"] = (request, server) => {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip") ?? forwarded ?? server?.requestIP(request)?.address;

  return ip ?? "unknown";
};

export const rateLimitConfig: Partial<Options> = {
  duration: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  scoping: "global",
  generator: clientIpGenerator,
  errorResponse: new Response(
    JSON.stringify({ message: "Too many requests, please try again later." }),
    {
      status: 429,
      headers: { "Content-Type": "application/json" },
    },
  ),
};
