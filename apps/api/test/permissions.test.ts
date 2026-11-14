import { beforeEach, describe, expect, it } from "bun:test";
import { Role } from "@/features/users/roles";
import { callApi, hasTestDatabase, resetDatabase, signInAs } from "./helpers";

// One row per feature: who may write. Reading always needs `viewer`, deleting `manager`.
// Must match the `role` options in each `<feature>.routes.ts`.
const features = [
  { path: "/projects", writeRole: Role.Manager, belowWriteRole: Role.Reporter },
  { path: "/wells", writeRole: Role.Manager, belowWriteRole: Role.Reporter },
  { path: "/sections", writeRole: Role.Manager, belowWriteRole: Role.Reporter },
  { path: "/products", writeRole: Role.Manager, belowWriteRole: Role.Reporter },
  { path: "/reports", writeRole: Role.Reporter, belowWriteRole: Role.Viewer },
  { path: "/inventories", writeRole: Role.Reporter, belowWriteRole: Role.Viewer },
];

// A well-formed id of a row that does not exist: a request that gets past the role check
// ends in 404, so the "allowed" case needs no test data.
const missingId = "00000000-0000-7000-8000-000000000000";

describe.skipIf(!hasTestDatabase)("route permissions", () => {
  beforeEach(resetDatabase);

  describe.each(features)("$path", ({ path, writeRole, belowWriteRole }) => {
    it("returns 401 to an anonymous request", async () => {
      expect((await callApi("GET", path)).status).toBe(401);
      expect((await callApi("DELETE", `${path}/${missingId}`)).status).toBe(401);
    });

    it("lets a viewer read", async () => {
      const { cookie } = await signInAs(Role.Viewer);

      expect((await callApi("GET", path, { cookie })).status).toBe(200);
    });

    it(`needs at least ${writeRole} to edit`, async () => {
      const below = await signInAs(belowWriteRole);
      const allowed = await signInAs(writeRole);
      const patch = (cookie: string) =>
        callApi("PATCH", `${path}/${missingId}`, { cookie, body: {} });

      expect((await patch(below.cookie)).status).toBe(403);
      expect((await patch(allowed.cookie)).status).toBe(404);
    });

    it("needs at least manager to delete", async () => {
      const reporter = await signInAs(Role.Reporter);
      const manager = await signInAs(Role.Manager);
      const remove = (cookie: string) => callApi("DELETE", `${path}/${missingId}`, { cookie });

      expect((await remove(reporter.cookie)).status).toBe(403);
      expect((await remove(manager.cookie)).status).toBe(404);
    });
  });
});
