"use client";

import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { apiClient } from "@/lib/api/client";
import { useMutation } from "@/lib/api/hooks";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const linkClass = "font-medium text-accent hover:underline";

function FormMessage({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={tone === "error" ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"}
    >
      {children}
    </p>
  );
}

const loginErrors: Record<string, string> = {
  email_not_verified: "Please verify your email address first. Check your inbox for the link.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
};

export function LoginForm({ next }: { next?: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const result = await signIn("credentials", { email: String(form.get("email") ?? ""), password: String(form.get("password") ?? ""), redirect: false });
    if (result?.error) {
      setError(loginErrors[result.code ?? ""] ?? "Incorrect email or password.");
      setPending(false);
      return;
    }
    const target = next ? `/auth/redirect?next=${encodeURIComponent(next)}` : "/auth/redirect";
    window.location.assign(target);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <Field id="email" label="Email" required>
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
      </Field>
      <Field id="password" label="Password" required>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <Button type="submit" variant="primary" disabled={pending} className="h-11">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="flex justify-between text-sm">
        <Link href="/forgot-password" className={linkClass}>Forgot password?</Link>
        <Link href="/register" className={linkClass}>Create an account</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [done, setDone] = useState("");
  const { mutate, pending, fieldErrors } = useMutation(
    (body: { name: string; email: string; password: string }) => apiClient.post<{ message: string }>("/api/public/auth/register", body),
    { onSuccess: (result) => setDone(result.data.message) },
  );

  if (done) return <FormMessage tone="success">{done}</FormMessage>;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void mutate({ name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
      }}
    >
      <Field id="name" label="Full name" required error={fieldErrors.name}>
        <input id="name" name="name" autoComplete="name" required className={inputClass} aria-invalid={Boolean(fieldErrors.name)} />
      </Field>
      <Field id="email" label="Email" required error={fieldErrors.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} aria-invalid={Boolean(fieldErrors.email)} />
      </Field>
      <Field id="password" label="Password" required help="At least 10 characters with a letter and a number." error={fieldErrors.password}>
        <input id="password" name="password" type="password" autoComplete="new-password" required className={inputClass} aria-invalid={Boolean(fieldErrors.password)} />
      </Field>
      <Button type="submit" variant="primary" disabled={pending} className="h-11">
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-sm">
        Already registered? <Link href="/login" className={linkClass}>Sign in</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [done, setDone] = useState("");
  const { mutate, pending, fieldErrors } = useMutation(
    (body: { email: string }) => apiClient.post<{ message: string }>("/api/public/auth/forgot-password", body),
    { onSuccess: (result) => setDone(result.data.message) },
  );

  if (done) return <FormMessage tone="success">{done}</FormMessage>;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void mutate({ email: String(new FormData(event.currentTarget).get("email") ?? "") });
      }}
    >
      <Field id="email" label="Email" required error={fieldErrors.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} aria-invalid={Boolean(fieldErrors.email)} />
      </Field>
      <Button type="submit" variant="primary" disabled={pending} className="h-11">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-sm"><Link href="/login" className={linkClass}>Back to sign in</Link></p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState("");
  const { mutate, pending, fieldErrors, error } = useMutation(
    (body: { token: string; password: string }) => apiClient.post<{ message: string }>("/api/public/auth/reset-password", body),
    { onSuccess: (result) => setDone(result.data.message) },
  );

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="success">{done}</FormMessage>
        <Link href="/login" className={linkClass}>Go to sign in</Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void mutate({ token, password: String(new FormData(event.currentTarget).get("password") ?? "") });
      }}
    >
      {error && !fieldErrors.password ? <FormMessage tone="error">{error.message}</FormMessage> : null}
      <Field id="password" label="New password" required help="At least 10 characters with a letter and a number." error={fieldErrors.password}>
        <input id="password" name="password" type="password" autoComplete="new-password" required className={inputClass} aria-invalid={Boolean(fieldErrors.password)} />
      </Field>
      <Button type="submit" variant="primary" disabled={pending} className="h-11">
        {pending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}

// Verification needs a click so email scanners that open links cannot consume the token.
export function VerifyEmailForm({ token }: { token: string }) {
  const [done, setDone] = useState("");
  const { mutate, pending, error } = useMutation(
    (body: { token: string }) => apiClient.post<{ message: string }>("/api/public/auth/verify-email", body),
    { onSuccess: (result) => setDone(result.data.message) },
  );

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="success">{done}</FormMessage>
        <Link href="/login" className={linkClass}>Go to sign in</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <FormMessage tone="error">{error.message}</FormMessage> : null}
      <Button variant="primary" disabled={pending} onClick={() => void mutate({ token })} className="h-11">
        {pending ? "Confirming…" : "Confirm my email"}
      </Button>
    </div>
  );
}
