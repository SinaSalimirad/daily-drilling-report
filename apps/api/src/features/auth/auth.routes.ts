import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { Role } from "@/features/users/roles";
import { loginSchema } from "@/features/users/users.schema";
import { authPlugin } from "@/plugins/auth.plugin";
import { loginRateLimitConfig } from "@/plugins/rate-limit.plugin";
import { clearSessionCookie, readSessionToken, setSessionCookie } from "@/plugins/session-cookie";
import { login } from "./auth.service";
import { revokeSession } from "./sessions.service";

const loginRoutes = new Elysia().use(rateLimit(loginRateLimitConfig)).post(
  "/login",
  async ({ body, cookie, status }) => {
    const result = await login(body);

    if (!result.ok) {
      return result.reason === "email-not-verified"
        ? status(403, { message: "Your email address is not verified yet." })
        : status(401, { message: "Invalid email or password." });
    }

    // Rotate: a session the browser still holds from before is ended, never reused.
    const previousToken = readSessionToken(cookie);
    if (previousToken) await revokeSession(previousToken);

    setSessionCookie(cookie, result.session);

    return result.user;
  },
  { body: loginSchema },
);

export const authRoutes = new Elysia({ name: "auth", prefix: "/auth" })
  .use(authPlugin)
  // Works without a valid session too, so a stale cookie can always be cleared.
  .post("/logout", async ({ cookie }) => {
    const token = readSessionToken(cookie);
    if (token) await revokeSession(token);

    clearSessionCookie(cookie);
  })
  .get("/me", ({ user }) => user, { role: Role.Viewer })
  // Last on purpose: a "scoped" rate limit also applies to routes the parent registers after it.
  .use(loginRoutes);
