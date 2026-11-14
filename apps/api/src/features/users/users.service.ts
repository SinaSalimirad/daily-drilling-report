import { asc, eq } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { db } from "@/db";
import { revokeAllSessionsForUser } from "@/features/auth/sessions.service";
import { type CreateUser, publicUserColumns, type UpdateUser, users } from "./users.schema";

export const hashPassword = (password: string) =>
  Bun.password.hash(password, { algorithm: "argon2id" });

// drizzle puts the query parameters into the error message ("Failed query: ... params: ...")
// and the logger prints that message, so a failed insert would log the password hash.
// Replace the message but keep `cause`: dbErrorsPlugin reads the SQLSTATE from it (409, 422).
async function hidingQueryParams<T>(query: Promise<T>): Promise<T> {
  try {
    return await query;
  } catch (error) {
    throw new Error("A users query failed (parameters hidden from the log)", {
      cause: (error as Error).cause,
    });
  }
}

export function userService() {
  const service = {
    list: () => db.select(publicUserColumns).from(users).orderBy(asc(users.email)),

    findOne: async (id: string) => {
      const [row] = await db.select(publicUserColumns).from(users).where(eq(users.id, id));

      if (!row) throw new NotFoundError(`User "${id}" not found`);

      return row;
    },

    // A duplicate email is rejected by the unique constraint (409, see dbErrorsPlugin).
    create: async ({ password, ...input }: CreateUser) => {
      const [row] = await hidingQueryParams(
        db
          .insert(users)
          .values({
            ...input,
            passwordHash: await hashPassword(password),
            // TODO (v1.1.0): there is no mail service yet, so every email is treated as verified
            // the moment the account is created. Once email sending exists, leave this NULL, send
            // a verification link, and set it when the link is opened. Login already refuses
            // users whose email_verified_at is NULL (see auth.service.ts).
            emailVerifiedAt: new Date(),
          })
          .returning(publicUserColumns),
      );

      return row;
    },

    // Partial update (PATCH). Deactivating a user or setting a new password also ends all of
    // their sessions, in the same transaction, so they can't refresh with an old token.
    update: async (id: string, { password, ...fields }: UpdateUser) => {
      const changes = {
        ...fields,
        ...(password !== undefined && { passwordHash: await hashPassword(password) }),
      };

      // drizzle throws on an empty SET, so an empty patch just returns the current row.
      if (Object.values(changes).every((value) => value === undefined)) {
        return service.findOne(id);
      }

      return db.transaction(async (tx) => {
        const [row] = await hidingQueryParams(
          tx.update(users).set(changes).where(eq(users.id, id)).returning(publicUserColumns),
        );

        if (!row) throw new NotFoundError(`User "${id}" not found`);

        // Ends the refresh tokens at once; access tokens already issued run out within
        // ACCESS_TOKEN_TTL_MINUTES (they are not checked against the database).
        if (fields.isActive === false) {
          await revokeAllSessionsForUser(id, "deactivated", tx);
        } else if (password !== undefined) {
          await revokeAllSessionsForUser(id, "password-change", tx);
        }

        return row;
      });
    },
  };

  return service;
}
