import { beforeEach, describe, expect, it } from "bun:test";
import { findSession, refreshWithBody } from "../../../test/auth-helpers";
import {
  callApi,
  hasTestDatabase,
  resetDatabase,
  signInAs,
  TEST_PASSWORD,
} from "../../../test/helpers";
import { Role } from "./roles";

const newUser = {
  email: "New.Driller@Example.com",
  password: "a-good-password",
  displayName: "New Driller",
  role: Role.Reporter,
};

describe.skipIf(!hasTestDatabase)("users routes", () => {
  beforeEach(resetDatabase);

  it("are for admins only (a manager gets 403)", async () => {
    const { cookie } = await signInAs(Role.Manager);

    expect((await callApi("GET", "/users", { cookie })).status).toBe(403);
    expect((await callApi("POST", "/users", { cookie, body: newUser })).status).toBe(403);
  });

  it("let an admin create a user who is verified, has a lower-cased email and can log in", async () => {
    const { cookie } = await signInAs(Role.Admin);

    const response = await callApi("POST", "/users", { cookie, body: newUser });

    expect(response.status).toBe(200);
    const created = (await response.json()) as Record<string, unknown>;
    expect(created).toMatchObject({ email: "new.driller@example.com", role: Role.Reporter });
    expect(created.emailVerifiedAt).not.toBeNull();
    expect(created).not.toHaveProperty("passwordHash");

    const login = await callApi("POST", "/auth/login", {
      body: { email: newUser.email, password: newUser.password },
    });
    expect(login.status).toBe(200);
  });

  it("reject a second user with the same email in another case (409)", async () => {
    const { cookie } = await signInAs(Role.Admin);
    await callApi("POST", "/users", { cookie, body: newUser });

    const duplicate = { ...newUser, email: newUser.email.toUpperCase() };
    expect((await callApi("POST", "/users", { cookie, body: duplicate })).status).toBe(409);
  });

  it("end every session of a user who is deactivated", async () => {
    const { cookie: adminCookie } = await signInAs(Role.Admin);
    const { user, sessionId, refreshToken } = await signInAs(Role.Reporter);

    const response = await callApi("PATCH", `/users/${user.id}`, {
      cookie: adminCookie,
      body: { isActive: false },
    });

    expect(response.status).toBe(200);
    expect((await findSession(sessionId))?.revokeReason).toBe("deactivated");
    expect((await refreshWithBody(refreshToken)).status).toBe(401);
  });

  it("end every session of a user whose password is changed, and the old password stops working", async () => {
    const { cookie: adminCookie } = await signInAs(Role.Admin);
    const { user, sessionId, refreshToken } = await signInAs(Role.Reporter);

    await callApi("PATCH", `/users/${user.id}`, {
      cookie: adminCookie,
      body: { password: "a-brand-new-password" },
    });

    expect((await findSession(sessionId))?.revokeReason).toBe("password-change");
    expect((await refreshWithBody(refreshToken)).status).toBe(401);
    const oldLogin = await callApi("POST", "/auth/login", {
      body: { email: user.email, password: TEST_PASSWORD },
    });
    expect(oldLogin.status).toBe(401);
  });

  it("do not let an admin change their own role or deactivate themselves", async () => {
    const { user, cookie } = await signInAs(Role.Admin);

    const demote = await callApi("PATCH", `/users/${user.id}`, {
      cookie,
      body: { role: Role.Viewer },
    });
    const deactivate = await callApi("PATCH", `/users/${user.id}`, {
      cookie,
      body: { isActive: false },
    });

    expect(demote.status).toBe(403);
    expect(deactivate.status).toBe(403);
  });

  it("let an admin change their own display name", async () => {
    const { user, cookie } = await signInAs(Role.Admin);

    const response = await callApi("PATCH", `/users/${user.id}`, {
      cookie,
      body: { displayName: "Renamed" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ displayName: "Renamed" });
  });
});
