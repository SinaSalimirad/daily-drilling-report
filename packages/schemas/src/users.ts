import { z } from 'zod';
import { idSchema } from './base';
import { roleSchema } from './permissions';

// User management of the admin (docs/07): sign-up is closed, an admin creates the users and
// assigns the wells of engineers and clients.

export const PASSWORD_MIN_LENGTH = 10;

const password = z.string().min(PASSWORD_MIN_LENGTH).max(128);

export const userCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.email().max(200),
    password,
    role: roleSchema,
  })
  .strict();
export type UserCreate = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    role: roleSchema,
    /** A deactivated user cannot sign in and loses every session. */
    banned: z.boolean(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to change');
export type UserUpdate = z.infer<typeof userUpdateSchema>;

export const userPasswordSchema = z.object({ password }).strict();

export const userSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string(),
  role: roleSchema,
  banned: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type AppUser = z.infer<typeof userSchema>;

export const userParamsSchema = z.object({ userId: idSchema });

/** The wells a user is assigned to (the whole set is replaced). */
export const wellMembersPutSchema = z.object({ userIds: z.array(idSchema).max(200) }).strict();
export type WellMembersPut = z.infer<typeof wellMembersPutSchema>;

export const wellMembersSchema = z.object({ members: z.array(userSchema) });

/** Last edit of a submitted report (docs/07: "edited after submit" with the last editor and time). */
export const auditEntrySchema = z.object({
  id: idSchema,
  userName: z.string().nullable(),
  action: z.string(),
  revisionBefore: z.number().int(),
  revisionAfter: z.number().int(),
  changes: z.record(z.string(), z.unknown()),
  at: z.iso.datetime(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;
