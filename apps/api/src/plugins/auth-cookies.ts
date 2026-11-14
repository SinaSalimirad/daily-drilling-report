import type { Cookie } from "elysia";
import { env } from "@/config/env";
import type { IssuedTokens } from "@/features/auth/auth.types";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

// The access token is needed by every API route; the refresh token only by /auth/refresh and
// /auth/logout, so it is not sent (and can't leak) with any other request.
const ACCESS_COOKIE_PATH = "/api";
const REFRESH_COOKIE_PATH = "/api/v1/auth";

type Cookies = Record<string, Cookie<unknown>>;

// HttpOnly: page scripts can't read them, so an XSS bug can't steal the tokens.
// SameSite=Lax: other sites can't make the browser send them with a POST/PATCH/DELETE.
// Secure only in production, because the local stack is plain http.
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
} as const;

const readCookie = (cookies: Cookies, name: string) => {
  const value = cookies[name]?.value;

  return typeof value === "string" && value.length > 0 ? value : undefined;
};

// The desktop app (Tauri) can't rely on cookies (its webview is another site than the API),
// so it sends the access token as `Authorization: Bearer <token>`.
export const readBearerToken = (request: Request) => {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);

  return match?.[1];
};

// The access token of a request: the Authorization header wins over the cookie.
export const readAccessToken = (cookies: Cookies, request: Request) =>
  readBearerToken(request) ?? readCookie(cookies, ACCESS_COOKIE);

export const readRefreshCookie = (cookies: Cookies) => readCookie(cookies, REFRESH_COOKIE);

export const setAuthCookies = (cookies: Cookies, tokens: IssuedTokens) => {
  cookies[ACCESS_COOKIE]?.set({
    ...cookieOptions,
    path: ACCESS_COOKIE_PATH,
    value: tokens.accessToken,
    expires: tokens.accessExpiresAt,
  });
  cookies[REFRESH_COOKIE]?.set({
    ...cookieOptions,
    path: REFRESH_COOKIE_PATH,
    value: tokens.refreshToken,
    expires: tokens.refreshExpiresAt,
  });
};

// Browsers only drop a cookie when path (and the other attributes) match the original.
export const clearAuthCookies = (cookies: Cookies) => {
  const expired = { ...cookieOptions, value: "", expires: new Date(0) };

  cookies[ACCESS_COOKIE]?.set({ ...expired, path: ACCESS_COOKIE_PATH });
  cookies[REFRESH_COOKIE]?.set({ ...expired, path: REFRESH_COOKIE_PATH });
};
