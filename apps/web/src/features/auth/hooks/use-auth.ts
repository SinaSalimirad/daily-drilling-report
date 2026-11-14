import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    // Login already returns the user, so the "me" query used by the dashboard needs no extra request.
    onSuccess: (user) => queryClient.setQueryData(authKeys.me(), user),
  });
}
