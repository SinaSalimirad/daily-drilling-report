import type { PublicUser } from "@/features/users/users.types";

// What createSession returns: the raw token goes into the cookie, only its hash is stored.
export type NewSession = { token: string; expiresAt: Date };

export type LoginResult =
  | { ok: true; user: PublicUser; session: NewSession }
  | { ok: false; reason: "invalid-credentials" | "email-not-verified" };
