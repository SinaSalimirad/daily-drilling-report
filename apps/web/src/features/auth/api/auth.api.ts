import api from "@/lib/axios";
import type { AuthUser, LoginInput } from "../type";

// The session lives in an HttpOnly cookie set by the API; the web never sees the token.
export const authApi = {
  login: async (input: LoginInput) => (await api.post<AuthUser>("/v1/auth/login", input)).data,
};
