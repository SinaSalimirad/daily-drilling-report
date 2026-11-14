import { apiErrorMessage } from "@/lib/api-error";
import type { LoginInput } from "../type";

export type LoginFormValues = {
  email: string;
  password: string;
};

export const defaultValues: LoginFormValues = { email: "", password: "" };

type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

// Deliberately loose: the API (zod `z.email()`) is the real check, this only catches typos.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Form-level validation for instant feedback; returns per-field messages for TanStack Form.
 * The password has no length rule, like the API: a wrong password must look like any other.
 */
export function validate({ value }: { value: LoginFormValues }) {
  const fields: FieldErrors = {};

  if (value.email.trim() === "") fields.email = "Email is required";
  else if (!EMAIL_PATTERN.test(value.email.trim())) fields.email = "Enter a valid email address";

  if (value.password === "") fields.password = "Password is required";

  return Object.keys(fields).length > 0 ? { fields } : undefined;
}

/** The API lower-cases the email itself; the password is sent exactly as typed (no trim). */
export const toPayload = (values: LoginFormValues): LoginInput => ({
  email: values.email.trim(),
  password: values.password,
});

/** The toast text for a failed login, chosen from the status code (see docs/error-flow.md). */
export const loginErrorMessage = (error: unknown) =>
  apiErrorMessage(error, "Could not log in. Please try again.", {
    // On login these mean something else than on other screens.
    401: "Invalid email or password.",
    403: "Your email address is not verified yet.",
    429: "Too many attempts. Please wait a minute and try again.",
  });
