// Mirrors users.schema.ts in the API (role enum and the public user columns).
export type UserRole = "viewer" | "reporter" | "manager" | "admin";

// Body of POST /auth/login.
export type LoginInput = {
  email: string;
  password: string;
};

// What POST /auth/login and GET /auth/me return: a user row without the password hash.
export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
