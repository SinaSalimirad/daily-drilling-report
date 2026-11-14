import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { Role } from "@/features/users/roles";
import { loginSchema } from "@/features/users/users.schema";
import { authPlugin } from "@/plugins/auth.plugin";
import { loginRateLimitConfig } from "@/plugins/rate-limit.plugin";
import {
  clearSessionCookie,
  readBearerToken,
  readRequestToken,
  readSessionToken,
  setSessionCookie,
} from "@/plugins/session-cookie";
import { login } from "./auth.service";
import { revokeSession } from "./sessions.service";

const failureResponse = {
  "invalid-credentials": { code: 401, message: "Invalid email or password." },
  "email-not-verified": { code: 403, message: "Your email address is not verified yet." },
} as const;

// Both login routes share this instance's rate limiter, so they share one budget per client IP.
const loginRoutes = new Elysia()
  .use(rateLimit(loginRateLimitConfig))
  // A cross-site <form> can only send form-encoded or text bodies, and a cross-site fetch with
  // JSON triggers a CORS preflight that CORS_ORIGINS refuses. Requiring JSON therefore stops
  // another site from logging the browser into an account of its choosing.
  .onBeforeHandle(({ request, status }) => {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return status(415, { message: "Send the login as application/json." });
    }
  })
  // Browser: the token goes into the HttpOnly cookie and never reaches page scripts.
  .post(
    "/login",
    async ({ body, cookie, status }) => {
      const result = await login(body);

      if (!result.ok) {
        const { code, message } = failureResponse[result.reason];
        return status(code, { message });
      }

      // Rotate: a session the browser still holds from before is ended, never reused.
      const previousToken = readSessionToken(cookie);
      if (previousToken) await revokeSession(previousToken);

      setSessionCookie(cookie, result.session);

      return result.user;
    },
    { body: loginSchema },
  )
  // Desktop app (Tauri): the token comes back in the body; the app keeps it in the OS keychain
  // and sends it as `Authorization: Bearer <token>`. Same sessions, expiry and revocation.
  .post(
    "/token",
    async ({ body, request, status }) => {
      const result = await login(body);

      if (!result.ok) {
        const { code, message } = failureResponse[result.reason];
        return status(code, { message });
      }

      // Rotate, like the cookie login: the token the app sent along is ended.
      const previousToken = readBearerToken(request);
      if (previousToken) await revokeSession(previousToken);

      const { token, expiresAt } = result.session;

      return { user: result.user, token, expiresAt };
    },
    { body: loginSchema },
  );

export const authRoutes = new Elysia({ name: "auth", prefix: "/auth" })
  .use(authPlugin)
  // Works without a valid session too, so a stale cookie can always be cleared.
  .post("/logout", async ({ cookie, request }) => {
    const token = readRequestToken(cookie, request);
    if (token) await revokeSession(token);

    clearSessionCookie(cookie);
  })
  .get("/me", ({ user }) => user, { role: Role.Viewer })
  // Last on purpose: a "scoped" rate limit also applies to routes the parent registers after it.
  .use(loginRoutes);
