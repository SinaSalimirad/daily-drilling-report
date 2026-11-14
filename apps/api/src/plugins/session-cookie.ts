import type { Cookie } from "elysia";
import { env } from "@/config/env";

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

export const setSessionCookie = (cookies: Cookies, session: { token: string; expiresAt: Date }) => {
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
