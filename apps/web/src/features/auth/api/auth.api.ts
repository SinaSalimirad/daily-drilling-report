import api from "@/lib/axios";
import type { AuthUser, LoginInput } from "../type";

// The access and refresh tokens live in HttpOnly cookies set by the API; the web never sees
// them. Refreshing an expired access token happens in the axios interceptor (lib/axios.ts).
export const authApi = {
  login: async (input: LoginInput) => (await api.post<AuthUser>("/v1/auth/login", input)).data,
  // The browser sends the access_token cookie; the API answers with the user from the database.
  me: async () => (await api.get<AuthUser>("/v1/auth/me")).data,
  // `{}`: the API only accepts JSON on auth POSTs. The refresh_token cookie names the session.
  logout: async () => {
    await api.post("/v1/auth/logout", {});
  },
};
