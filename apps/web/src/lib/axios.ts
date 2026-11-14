import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  timeout: 15_000,
  // Sends the HttpOnly `access_token` / `refresh_token` cookies when web (:3000) and api (:4000)
  // are different origins in development. Behind nginx everything is one origin.
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// A 401 from these must never trigger a refresh: they are the auth flow itself (and a 401
// from /refresh retried through /refresh would loop).
const NO_REFRESH_PATHS = [
  "/v1/auth/login",
  "/v1/auth/token",
  "/v1/auth/refresh",
  "/v1/auth/logout",
];

type RetriableConfig = InternalAxiosRequestConfig & { retriedAfterRefresh?: boolean };

const canRefreshFor = (config: RetriableConfig | undefined): config is RetriableConfig =>
  config !== undefined &&
  !config.retriedAfterRefresh &&
  !NO_REFRESH_PATHS.some((path) => config.url?.startsWith(path));

async function postRefresh() {
  try {
    // `{}` and not no body: the API only accepts JSON here, and axios drops the Content-Type
    // of a request without a body.
    await api.post("/v1/auth/refresh", {});
  } catch (error) {
    // 409: another request rotated the token a moment ago; its new cookies are ours too.
    if (axios.isAxiosError(error) && error.response?.status === 409) return;
    throw error;
  }
}

// Tabs share the cookies, so two tabs refreshing with the same token at once would look like a
// stolen token to the API. The Web Lock makes them take turns: the second tab then refreshes
// with the new cookie the first one got.
const refreshAcrossTabs = () =>
  typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request("auth-refresh", postRefresh)
    : postRefresh();

// Every request of this tab that gets a 401 at the same time waits for one refresh.
let refreshInFlight: Promise<void> | null = null;

const refreshSession = () => {
  refreshInFlight ??= refreshAcrossTabs().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

// A full page load also drops the TanStack Query cache, including the ["auth", "me"] user.
const goToLogin = () => {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;

    // The access token ran out (or the cookie expired): refresh once, then repeat the request.
    if (error.response?.status === 401 && canRefreshFor(config)) {
      config.retriedAfterRefresh = true;
      try {
        await refreshSession();
      } catch {
        goToLogin();
        return Promise.reject(error);
      }
      return api(config);
    }

    if (error.response) {
      // Server responded with a non-2xx status.
      console.error("API error:", error.response.status);
    } else if (error.request) {
      // Request was sent but no response was received.
      console.error("Network error: no response received");
    } else {
      console.error("Request setup error:", error.message);
    }

    return Promise.reject(error);
  },
);

export default api;
