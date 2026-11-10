import axios from "axios";

// Same-origin by default: nginx (or the Next rewrite in dev) forwards /api to the backend.
export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});
