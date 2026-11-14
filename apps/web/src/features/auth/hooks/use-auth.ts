import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api-error";
import { authApi } from "../api/auth.api";
import { loginErrorMessage } from "../lib/login-form";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    // Login already returns the user, so the "me" query used by the dashboard needs no extra request.
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
      toast.success(`Welcome, ${user.displayName}`);
    },
    onError: (error) => toast.error(loginErrorMessage(error)),
  });
}

// The logged-in user. Server state, so it lives in the query cache, not in a client store:
// login fills it, logout clears it, and a refetch picks up a changed name or role.
export function useMe() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
    // A 401 has already been through the refresh in lib/axios.ts; retrying can't fix it.
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.logout,
    // Drop every cached query, so the next user of this browser sees none of this user's data.
    onSuccess: () => {
      queryClient.clear();
      toast.success("You have been logged out");
      router.replace("/login");
    },
    // Only the API can clear the HttpOnly cookies. If the request failed they are still there,
    // so going to /login would pretend a logout that didn't happen: say so and stay.
    onError: (error) => toast.error(apiErrorMessage(error, "Could not log out. Please try again.")),
  });
}
