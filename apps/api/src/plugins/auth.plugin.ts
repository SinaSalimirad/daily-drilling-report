import { Elysia } from "elysia";
import { findUserBySessionToken } from "@/features/auth/sessions.service";
import { hasRole, type Role } from "@/features/users/roles";
import { readSessionToken } from "./session-cookie";

// The logged-in user's id per request, read by the logger (logixlysia enrichers only get the
// Request, not the Elysia context). A WeakMap entry disappears with its request.
export const authenticatedUserIds = new WeakMap<Request, string>();

// Adds a `role` option to every route of an instance that uses this plugin:
//
//   .delete("/:id", handler, { params, role: Role.Manager })
//
// No valid session -> 401, role below the minimum -> 403, otherwise the handler gets `user`.
// It runs after body/params validation, so an anonymous request with an invalid body gets
// a 422 before the 401.
export const authPlugin = new Elysia({ name: "auth-plugin" }).macro({
  role: (minimum: Role) => ({
    async resolve({ cookie, request, status }) {
      const token = readSessionToken(cookie);
      const user = token ? await findUserBySessionToken(token) : undefined;

      if (!user) return status(401, { message: "You need to log in." });

      authenticatedUserIds.set(request, user.id);

      if (!hasRole(user.role, minimum)) {
        return status(403, { message: "You don't have permission to do this." });
      }

      return { user };
    },
  }),
});
