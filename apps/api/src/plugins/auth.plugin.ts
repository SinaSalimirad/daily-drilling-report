import { Elysia } from "elysia";
import { verifyAccessToken } from "@/features/auth/access-token";
import { hasRole, type Role } from "@/features/users/roles";
import { readAccessToken } from "./auth-cookies";

// The logged-in user's id per request, read by the logger (logixlysia enrichers only get the
// Request, not the Elysia context). A WeakMap entry disappears with its request.
export const authenticatedUserIds = new WeakMap<Request, string>();

// Adds a `role` option to every route of an instance that uses this plugin:
//
//   .delete("/:id", handler, { params, role: Role.Manager })
//
// The access token (a JWT) comes from the `Authorization: Bearer` header or the `access_token`
// cookie. It is checked by its signature only, with no database read: no valid token -> 401,
// role below the minimum -> 403, otherwise the handler gets `user` ({ id, role, sessionId }).
// It runs after body/params validation, so an anonymous request with an invalid body gets
// a 422 before the 401.
export const authPlugin = new Elysia({ name: "auth-plugin" }).macro({
  role: (minimum: Role) => ({
    async resolve({ cookie, request, status }) {
      const token = readAccessToken(cookie, request);
      if (!token) return status(401, { message: "You need to log in." });

      const result = await verifyAccessToken(token);
      if (!result.ok) {
        // "token-expired" tells the client to refresh; anything else means log in again.
        return result.reason === "expired"
          ? status(401, { code: "token-expired", message: "Your session token has expired." })
          : status(401, { message: "You need to log in." });
      }

      const { userId, sessionId, role } = result.claims;
      authenticatedUserIds.set(request, userId);

      if (!hasRole(role, minimum)) {
        return status(403, { message: "You don't have permission to do this." });
      }

      return { user: { id: userId, role, sessionId } };
    },
  }),
});
