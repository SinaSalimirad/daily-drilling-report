import { describe, expect, it } from "bun:test";
import { Role } from "./roles";
import { createUserSchema, loginSchema, updateUserSchema } from "./users.schema";

const validUser = {
  email: "driller@example.com",
  password: "long-enough",
  displayName: "Driller",
};

describe("createUserSchema", () => {
  it("lower-cases and trims the email so the unique constraint is case-insensitive", () => {
    const parsed = createUserSchema.parse({ ...validUser, email: "  Driller@Example.COM " });
    expect(parsed.email).toBe("driller@example.com");
  });

  it("defaults the role to viewer", () => {
    expect(createUserSchema.parse(validUser).role).toBe(Role.Viewer);
  });

  it("rejects an invalid email", () => {
    expect(createUserSchema.safeParse({ ...validUser, email: "driller" }).success).toBe(false);
  });

  it("rejects a password shorter than 8 or longer than 128 characters", () => {
    expect(createUserSchema.safeParse({ ...validUser, password: "short" }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...validUser, password: "x".repeat(129) }).success).toBe(
      false,
    );
  });

  it("rejects an unknown role", () => {
    expect(createUserSchema.safeParse({ ...validUser, role: "owner" }).success).toBe(false);
  });

  it("strips fields the client may not set (id, passwordHash)", () => {
    const parsed = createUserSchema.parse({ ...validUser, id: "x", passwordHash: "x" });
    expect("id" in parsed || "passwordHash" in parsed).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("accepts an empty patch", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it("does not let the email be changed", () => {
    expect("email" in updateUserSchema.parse({ email: "new@example.com" })).toBe(false);
  });
});

describe("loginSchema", () => {
  it("lower-cases the email the same way as createUserSchema", () => {
    expect(loginSchema.parse({ email: "A@B.com", password: "x" }).email).toBe("a@b.com");
  });

  it("accepts a short password, so a wrong one gets 401 and not a validation error", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
});
