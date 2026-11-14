/// <reference types="bun-types" />
import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import api from "./axios";

// A fake transport: `statusFor` decides each response; `calls` records every URL requested.
let calls: string[] = [];
let statusFor: (url: string, callNumber: number) => number;

api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
  const url = config.url ?? "";
  calls.push(url);
  const status = statusFor(url, calls.filter((called) => called === url).length);
  const response = { status, data: {}, headers: {}, config, statusText: "" } as AxiosResponse;

  if (status >= 400) {
    throw new AxiosError("failed", "ERR_BAD_REQUEST", config, undefined, response);
  }
  return response;
};

const statusOf = (promise: Promise<AxiosResponse>) =>
  promise.then(
    (response) => response.status,
    (error: AxiosError) => error.response?.status,
  );

describe("api 401 handling", () => {
  beforeEach(() => {
    calls = [];
    spyOn(console, "error").mockImplementation(() => {});
  });

  it("refreshes once and repeats the request when the access token has expired", async () => {
    statusFor = (url, n) => (url === "/v1/projects" && n === 1 ? 401 : 200);

    expect(await statusOf(api.get("/v1/projects"))).toBe(200);
    expect(calls).toEqual(["/v1/projects", "/v1/auth/refresh", "/v1/projects"]);
  });

  it("shares one refresh between requests that fail at the same time", async () => {
    // The first call of each URL fails, later calls succeed.
    const seen = new Set<string>();
    statusFor = (url) => {
      if (url === "/v1/auth/refresh") return 200;
      if (seen.has(url)) return 200;
      seen.add(url);
      return 401;
    };

    const statuses = await Promise.all([
      statusOf(api.get("/v1/wells")),
      statusOf(api.get("/v1/sections")),
      statusOf(api.get("/v1/products")),
    ]);

    expect(statuses).toEqual([200, 200, 200]);
    expect(calls.filter((url) => url === "/v1/auth/refresh")).toHaveLength(1);
  });

  it("repeats the request when the refresh answers 409 (another tab refreshed first)", async () => {
    statusFor = (url, n) => {
      if (url === "/v1/auth/refresh") return 409;
      return n === 1 ? 401 : 200;
    };

    expect(await statusOf(api.get("/v1/reports"))).toBe(200);
  });

  it("gives up after one retry, so a request that keeps failing does not loop", async () => {
    statusFor = (url) => (url === "/v1/auth/refresh" ? 200 : 401);

    expect(await statusOf(api.get("/v1/users"))).toBe(401);
    expect(calls).toEqual(["/v1/users", "/v1/auth/refresh", "/v1/users"]);
  });

  it("returns the original 401 when the refresh fails (session ended)", async () => {
    statusFor = () => 401;

    expect(await statusOf(api.get("/v1/inventories"))).toBe(401);
    expect(calls).toEqual(["/v1/inventories", "/v1/auth/refresh"]);
  });

  it("never refreshes for a failed login (wrong password)", async () => {
    statusFor = () => 401;

    expect(await statusOf(api.post("/v1/auth/login", {}))).toBe(401);
    expect(calls).toEqual(["/v1/auth/login"]);
  });
});
