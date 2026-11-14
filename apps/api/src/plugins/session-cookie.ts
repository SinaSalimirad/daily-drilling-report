import type { Cookie } from "elysia";
import { env } from "@/config/env";
import type { NewSession } from "@/features/auth/auth.types";

const SESSION_COOKIE = "session";

type Cookies = Record<string, Cookie<unknown>>;

// HttpOnly: page scripts can't read it, so an XSS bug can't steal the session.
// SameSite=Lax: other sites can't make the browser send it with a POST/PATCH/DELETE.
// Secure only in production, because the local stack is plain http.
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

export const readSessionToken = (cookies: Cookies) => {
  const value = cookies[SESSION_COOKIE]?.value;

  return typeof value === "string" && value.length > 0 ? value : undefined;
};

// The desktop app (Tauri) can't rely on the cookie (its webview is another site than the API),
// so it sends the same session token as `Authorization: Bearer <token>`.
export const readBearerToken = (request: Request) => {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);

  return match?.[1];
};

// The session token of a request: the Authorization header wins over the cookie.
export const readRequestToken = (cookies: Cookies, request: Request) =>
  readBearerToken(request) ?? readSessionToken(cookies);

export const setSessionCookie = (cookies: Cookies, session: NewSession) => {
  cookies[SESSION_COOKIE]?.set({
    ...cookieOptions,
    value: session.token,
    expires: session.expiresAt,
  });
};

// Browsers only drop a cookie when path (and the other attributes) match the original.
export const clearSessionCookie = (cookies: Cookies) => {
  cookies[SESSION_COOKIE]?.set({ ...cookieOptions, value: "", expires: new Date(0) });
};
