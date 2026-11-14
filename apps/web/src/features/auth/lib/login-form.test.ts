/// <reference types="bun-types" />
import { describe, expect, it } from "bun:test";
import { AxiosError, type AxiosResponse } from "axios";
import { defaultValues, loginErrorMessage, toPayload, validate } from "./login-form";

const errorsFor = (email: string, password: string) =>
  validate({ value: { email, password } })?.fields;

const httpError = (status: number) =>
  new AxiosError("failed", "ERR_BAD_REQUEST", undefined, undefined, { status } as AxiosResponse);

describe("validate", () => {
  it("accepts a normal email and password", () => {
    expect(errorsFor("sina@example.com", "secret")).toBeUndefined();
  });

  it("requires both fields when the form is empty", () => {
    const fields = validate({ value: defaultValues })?.fields;

    expect(fields?.email).toBe("Email is required");
    expect(fields?.password).toBe("Password is required");
  });

  it("treats an email with only spaces as empty", () => {
    expect(errorsFor("   ", "secret")?.email).toBe("Email is required");
  });

  it("rejects text that is not an email", () => {
    expect(errorsFor("sina", "secret")?.email).toBe("Enter a valid email address");
    expect(errorsFor("sina@example", "secret")?.email).toBe("Enter a valid email address");
  });

  it("accepts a short password, because only the API judges the password", () => {
    expect(errorsFor("sina@example.com", "a")).toBeUndefined();
  });
});

describe("toPayload", () => {
  it("trims the email but sends the password exactly as typed", () => {
    expect(toPayload({ email: "  sina@example.com ", password: " pass word " })).toEqual({
      email: "sina@example.com",
      password: " pass word ",
    });
  });
});

describe("loginErrorMessage", () => {
  it("explains a wrong email or password on 401", () => {
    expect(loginErrorMessage(httpError(401))).toBe("Invalid email or password.");
  });

  it("explains an unverified email on 403", () => {
    expect(loginErrorMessage(httpError(403))).toBe("Your email address is not verified yet.");
  });

  it("asks the user to wait on 429", () => {
    expect(loginErrorMessage(httpError(429))).toContain("Too many attempts");
  });

  it("reports a network failure when there is no response", () => {
    expect(loginErrorMessage(new AxiosError("Network Error", "ERR_NETWORK"))).toContain(
      "Can't reach the server",
    );
  });

  it("falls back to a generic message for other statuses and unknown errors", () => {
    expect(loginErrorMessage(httpError(500))).toBe("Could not log in. Please try again.");
    expect(loginErrorMessage(new Error("boom"))).toBe("Could not log in. Please try again.");
  });
});
