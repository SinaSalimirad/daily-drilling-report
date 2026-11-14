import Elysia from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { authPlugin } from "@/plugins/auth.plugin";
import { writeRateLimitConfig } from "@/plugins/rate-limit.plugin";
import { Role } from "./roles";
import { createUserBody, updateUserBody, userIdParams } from "./users.model";
import type { UpdateUser } from "./users.schema";
import { userService } from "./users.service";

const service = userService();

// An admin can't demote or deactivate themselves; otherwise the last admin could lock
// everyone out of user management. Another admin has to do it.
const changesOwnAccess = (actingUserId: string, targetId: string, input: UpdateUser) =>
  actingUserId === targetId && (input.role !== undefined || input.isActive !== undefined);

const writeRoutes = new Elysia()
  .use(authPlugin)
  .use(rateLimit(writeRateLimitConfig))
  .post("/", ({ body }) => service.create(body), { body: createUserBody, role: Role.Admin })
  .patch(
    "/:id",
    ({ params, body, user, status }) => {
      if (changesOwnAccess(user.id, params.id, body)) {
        return status(403, { message: "You can't change your own role or active status." });
      }

      return service.update(params.id, body);
    },
    { params: userIdParams, body: updateUserBody, role: Role.Admin },
  );

export const userRoutes = new Elysia({ name: "users", prefix: "/users" })
  .use(authPlugin)
  .get("/", () => service.list(), { role: Role.Admin })
  .get("/:id", ({ params }) => service.findOne(params.id), {
    params: userIdParams,
    role: Role.Admin,
  })
  .use(writeRoutes);
