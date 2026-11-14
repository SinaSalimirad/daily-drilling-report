import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import z from "zod";
import { Role } from "@/features/users/roles";
import { loginSchema } from "@/features/users/users.schema";
import { authPlugin } from "@/plugins/auth.plugin";
import {
  clearAuthCookies,
  readAccessToken,
  readBearerToken,
  readRefreshCookie,
  setAuthCookies,
} from "@/plugins/auth-cookies";
import { loginRateLimitConfig, refreshRateLimitConfig } from "@/plugins/rate-limit.plugin";
import { verifyAccessToken } from "./access-token";
import { findActiveUser, login, refresh } from "./auth.service";
import { revokeSession, revokeSessionByRefreshToken } from "./sessions.service";

const failureResponse = {
  "invalid-credentials": { code: 401, message: "Invalid email or password." },
  "email-not-verified": { code: 403, message: "Your email address is not verified yet." },
} as const;

const sessionEnded = {
  code: "session-ended",
  message: "Your session has ended. Please log in again.",
};

// The desktop app sends its refresh token in the body; the browser sends none (it is a cookie).
const refreshTokenBody = z.object({ refreshToken: z.string().min(1).optional() }).optional();

// A cross-site <form> can only send form-encoded or text bodies, and a cross-site fetch with
// JSON triggers a CORS preflight that CORS_ORIGINS refuses. Requiring JSON therefore stops
// another site from logging the browser into an account of its choosing.
const isJson = (request: Request) =>
  request.headers.get("content-type")?.toLowerCase().startsWith("application/json") === true;

const notJson = { message: "Send the request as application/json." };

// The session an access token belongs to, if the token is valid (used to end it).
async function sessionIdOfAccessToken(token: string | undefined) {
  if (!token) return undefined;
  const result = await verifyAccessToken(token);

  return result.ok ? result.claims.sessionId : undefined;
}

// Both login routes share this instance's rate limiter, so they share one budget per client IP.
const loginRoutes = new Elysia()
  .use(rateLimit(loginRateLimitConfig))
  // onTransform runs before body validation, so a non-JSON body gets 415, never a 422.
  .onTransform(({ request, status }) => {
    if (!isJson(request)) throw status(415, notJson);
  })
  // Browser: both tokens go into HttpOnly cookies and never reach page scripts.
  .post(
    "/login",
    async ({ body, cookie, status }) => {
      const result = await login(body);

      if (!result.ok) {
        const { code, message } = failureResponse[result.reason];
        return status(code, { message });
      }

      // Rotate: a session the browser still holds from before is ended, never reused.
      const previousRefreshToken = readRefreshCookie(cookie);
      if (previousRefreshToken) {
        await revokeSessionByRefreshToken(previousRefreshToken, "replaced-by-login");
      }

      setAuthCookies(cookie, result.tokens);

      return result.user;
    },
    { body: loginSchema },
  )
  // Desktop app (Tauri): the tokens come back in the body; the app keeps them in the OS
  // keychain, sends the access token as `Authorization: Bearer` and refreshes with the body.
  .post(
    "/token",
    async ({ body, request, status }) => {
      const result = await login(body);

      if (!result.ok) {
        const { code, message } = failureResponse[result.reason];
        return status(code, { message });
      }

      // Rotate, like the cookie login: the session of the access token sent along is ended.
      const previousSessionId = await sessionIdOfAccessToken(readBearerToken(request));
      if (previousSessionId) await revokeSession(previousSessionId, "replaced-by-login");

      return { user: result.user, ...result.tokens };
    },
    { body: loginSchema },
  );

const refreshRoutes = new Elysia()
  .use(rateLimit(refreshRateLimitConfig))
  // onTransform runs before body validation, so a non-JSON body gets 415, never a 422.
  .onTransform(({ request, status }) => {
    if (!isJson(request)) throw status(415, notJson);
  })
  // Exchanges the refresh token for a new access + refresh token pair. Tokens go back the way
  // the refresh token came: as cookies for the browser, in the body for the desktop app.
  .post(
    "/refresh",
    async ({ body, cookie, status }) => {
      const fromBody = body?.refreshToken;
      const refreshToken = fromBody ?? readRefreshCookie(cookie);
      if (!refreshToken) return status(401, sessionEnded);

      const result = await refresh(refreshToken);

      if (result.ok) {
        if (fromBody) return result.tokens;

        setAuthCookies(cookie, result.tokens);
        return {
          accessExpiresAt: result.tokens.accessExpiresAt,
          refreshExpiresAt: result.tokens.refreshExpiresAt,
        };
      }

      if (result.reason === "race") {
        return status(409, {
          code: "refresh-race",
          message: "The session was refreshed by another request; retry with the new tokens.",
        });
      }

      if (result.reason === "reuse-detected") {
        // One structured line a log search or alert can match on. Never the token itself.
        console.warn(
          JSON.stringify({
            level: "warn",
            event: "refresh-token-reuse",
            userId: result.userId,
            sessionId: result.sessionId,
            time: new Date().toISOString(),
          }),
        );
      }

      if (!fromBody) clearAuthCookies(cookie);
      return status(401, sessionEnded);
    },
    { body: refreshTokenBody },
  );

export const authRoutes = new Elysia({ name: "auth", prefix: "/auth" })
  .use(authPlugin)
  // Works without a valid session too, so stale cookies can always be cleared. Ends the session
  // found through the refresh token (cookie or body), or else through a valid access token.
  .post(
    "/logout",
    async ({ body, cookie, request }) => {
      const refreshToken = body?.refreshToken ?? readRefreshCookie(cookie);

      if (refreshToken) {
        await revokeSessionByRefreshToken(refreshToken, "logout");
      } else {
        const sessionId = await sessionIdOfAccessToken(readAccessToken(cookie, request));
        if (sessionId) await revokeSession(sessionId, "logout");
      }

      clearAuthCookies(cookie);
    },
    { body: refreshTokenBody },
  )
  .get(
    "/me",
    async ({ user, status }) => {
      const current = await findActiveUser(user.id);

      return current ?? status(401, { message: "You need to log in." });
    },
    { role: Role.Viewer },
  )
  // Last on purpose: a "scoped" rate limit also applies to routes the parent registers after
  // it. Refresh comes before login so the small login budget never limits refreshing.
  .use(refreshRoutes)
  .use(loginRoutes);
