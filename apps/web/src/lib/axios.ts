import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  timeout: 15_000,
  // Sends the HttpOnly `session` cookie when web (:3000) and api (:4000) are different origins in
  // development. Behind nginx everything is one origin and this changes nothing.
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add authorization headers here if needed.
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
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
