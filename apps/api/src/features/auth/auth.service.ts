import { eq } from "drizzle-orm";
import { db } from "@/db";
import { type Login, publicUserColumns, users } from "@/features/users/users.schema";
import { hashPassword } from "@/features/users/users.service";
import { createSession } from "./sessions.service";

// When the email is unknown we still verify against this hash, so the response takes as long
// as for a wrong password and the timing does not reveal which emails have an account.
// Created on first use rather than at import, so loading the module stays cheap.
let dummyPasswordHash: Promise<string> | undefined;
const getDummyPasswordHash = () => {
  dummyPasswordHash ??= hashPassword("not-a-real-password");
  return dummyPasswordHash;
};

type LoginResult =
  | {
    ok: true;
    user: Omit<typeof users.$inferSelect, "passwordHash">;
    session: Awaited<ReturnType<typeof createSession>>;
  }
  | { ok: false; reason: "invalid-credentials" | "email-not-verified" };

export async function login({ email, password }: Login): Promise<LoginResult> {
  const [found] = await db
    .select({ ...publicUserColumns, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email));

  const passwordMatches = await Bun.password.verify(
    password,
    found?.passwordHash ?? (await getDummyPasswordHash()),
  );

  // Unknown email, wrong password and deactivated account all get the same answer.
  if (!found || !passwordMatches || !found.isActive) {
    return { ok: false, reason: "invalid-credentials" };
  }

  // FIXME: Unreachable until v1.1.0, because every user is created verified (see users.service.ts).
  if (!found.emailVerifiedAt) return { ok: false, reason: "email-not-verified" };

  const { passwordHash: _, ...user } = found;
  const session = await createSession(user.id);

  return { ok: true, user, session };
}
