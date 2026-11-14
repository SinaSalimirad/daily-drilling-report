import type { Role } from "@/features/users/roles";
import type { PublicUser } from "@/features/users/users.types";

// What createSession returns: the raw refresh token goes to the client, only its hash is stored.
export type NewSession = { sessionId: string; refreshToken: string; refreshExpiresAt: Date };

// Everything a client needs after login or refresh.
export type IssuedTokens = {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
};

export type LoginResult =
  | { ok: true; user: PublicUser; tokens: IssuedTokens }
  | { ok: false; reason: "invalid-credentials" | "email-not-verified" };

// "race": the token was rotated a moment ago by a parallel request; the client should retry
// with what that request got. "reuse-detected": an old token came back, every session ended.
export type RefreshResult =
  | {
      ok: true;
      userId: string;
      role: Role;
      sessionId: string;
      refreshToken: string;
      refreshExpiresAt: Date;
    }
  | { ok: false; reason: "invalid" | "race" }
  | { ok: false; reason: "reuse-detected"; userId: string; sessionId: string };
