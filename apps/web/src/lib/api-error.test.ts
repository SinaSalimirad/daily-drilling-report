/// <reference types="bun-types" />
import { describe, expect, it } from "bun:test";
import { AxiosError, type AxiosResponse } from "axios";
import { apiErrorMessage } from "./api-error";

const httpError = (status: number) =>
  new AxiosError("failed", "ERR_BAD_REQUEST", undefined, undefined, { status } as AxiosResponse);

const fallback = "Could not add the project. Please try again.";

describe("apiErrorMessage", () => {
  it("uses the feature's message for its status", () => {
    const message = apiErrorMessage(httpError(409), fallback, { 409: "Name already exists." });

    expect(message).toBe("Name already exists.");
  });

  it("uses a common message for statuses every screen shares", () => {
    expect(apiErrorMessage(httpError(403), fallback)).toBe("You don't have permission to do this.");
    expect(apiErrorMessage(httpError(429), fallback)).toContain("Too many requests");
    expect(apiErrorMessage(httpError(401), fallback)).toContain("session has ended");
  });

  it("lets a feature override a common message (login's 401)", () => {
    const message = apiErrorMessage(httpError(401), fallback, {
      401: "Invalid email or password.",
    });

    expect(message).toBe("Invalid email or password.");
  });

  it("falls back for any other status", () => {
    expect(apiErrorMessage(httpError(500), fallback)).toBe(fallback);
    expect(apiErrorMessage(httpError(409), fallback)).toBe(fallback);
  });

  it("says the server can't be reached when there is no response", () => {
    const networkError = new AxiosError("Network Error", "ERR_NETWORK");

    expect(apiErrorMessage(networkError, fallback)).toContain("Can't reach the server");
  });

  it("falls back for an error that is not from axios", () => {
    expect(apiErrorMessage(new Error("boom"), fallback)).toBe(fallback);
  });
});
