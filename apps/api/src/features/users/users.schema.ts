import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { timestampConfig, timestamps, uuidv7 } from "@/db/_shared/columns";
import { requiredText } from "@/lib/helpers/schema-fields";
import { Role } from "./roles";

export const userRoleEnum = pgEnum("user_role", Role);

export const users = pgTable(
  "users",
  {
    id: uuidv7,
    // Always stored lower-cased, so the plain unique constraint is case-insensitive.
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default(Role.Viewer),
    isActive: boolean("is_active").notNull().default(true),
    // NULL = not verified yet. See users.service.ts `create` for why it is set right away today.
    emailVerifiedAt: timestamp("email_verified_at", timestampConfig),
    ...timestamps,
  },
  (table) => [
    unique("users_email_unique").on(table.email),
    // Guards the unique constraint: "A@x.com" and "a@x.com" can't both exist.
    check("users_email_lowercase", sql`${table.email} = lower(${table.email})`),
  ],
);

// Lower-cased here (not only in the DB) so login and create see the same value.
const email = z.string().trim().toLowerCase().pipe(z.email().max(255));

// Argon2 cost grows with input length; the upper bound keeps a huge body from tying up the CPU.
const password = z.string().min(8).max(128);

export const createUserSchema = z.object({
  email,
  password,
  displayName: requiredText,
  role: z.enum(Role).default(Role.Viewer),
});

// PATCH body: only the fields that are sent change. Email is fixed after creation.
export const updateUserSchema = z.object({
  displayName: requiredText.optional(),
  role: z.enum(Role).optional(),
  isActive: z.boolean().optional(),
  password: password.optional(),
});

export const loginSchema = z.object({
  email,
  // No length rules on login: a wrong password must get the same 401 as any other.
  password: z.string().min(1).max(128),
});

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type Login = z.infer<typeof loginSchema>;

// Every column except password_hash. Services select and return only these, so the hash
// can't reach a response by accident.
export const publicUserColumns = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  role: users.role,
  isActive: users.isActive,
  emailVerifiedAt: users.emailVerifiedAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};
