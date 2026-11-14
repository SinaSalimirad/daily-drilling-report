"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { TextField } from "@/shared/components/form-fields";
import { useLogin } from "../hooks/use-auth";
import { useLoginForm } from "../hooks/use-login-form";
import { loginErrorMessage, toPayload } from "../lib/login-form";

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const [error, setError] = useState<string | null>(null);

  const form = useLoginForm(async (values) => {
    setError(null);

    try {
      await login.mutateAsync(toPayload(values));
    } catch (caught) {
      // Keep what the user typed so they can fix a typo; the message comes from the status code.
      setError(loginErrorMessage(caught));
      return;
    }

    router.replace("/dashboard");
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email and password to continue
          </p>
        </div>

        <form.Field name="email">
          {(field) => (
            <TextField
              field={field}
              label="Email"
              placeholder="you@company.com"
              type="email"
              autoComplete="username"
              required
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <TextField
              field={field}
              label="Password"
              placeholder="Your password"
              type="password"
              autoComplete="current-password"
              required
            />
          )}
        </form.Field>

        {error && (
          <div role="alert" className="text-sm text-destructive">
            {error}
          </div>
        )}

        <Field>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" className="h-10" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Login"}
              </Button>
            )}
          </form.Subscribe>
        </Field>
      </FieldGroup>
    </form>
  );
}
