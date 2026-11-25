import { RegisterForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" description="Register as a learner. We will email you a link to verify your address.">
      <RegisterForm />
    </AuthShell>
  );
}
