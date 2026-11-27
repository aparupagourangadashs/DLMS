import { prisma } from "@/server/db";
import { Award } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Certificate verification" };
}

export default async function VerifyCertificate({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const certificate = await prisma.certificate.findUnique({
    where: { verificationCode: code },
    include: { learner: { select: { name: true } }, template: { select: { name: true, heading: true } } },
  });
  const valid = Boolean(certificate && certificate.status === "ACTIVE" && (!certificate.expiresAt || certificate.expiresAt >= new Date()));
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16">
      <section className="rounded-3xl border border-border bg-surface p-8 text-center shadow-sm">
        <Award className="mx-auto size-12 text-accent" aria-hidden="true" />
        <h1 className="mt-5 font-serif text-3xl font-semibold">{valid ? "Valid certificate" : "Certificate not valid"}</h1>
        {valid && certificate ? (
          <dl className="mx-auto mt-8 max-w-md space-y-4 text-left">
            <div><dt className="text-xs text-muted">Learner</dt><dd className="mt-1 font-semibold">{certificate.learner.name}</dd></div>
            <div><dt className="text-xs text-muted">Credential</dt><dd className="mt-1 font-semibold">{certificate.template.heading ?? certificate.template.name}</dd></div>
            <div><dt className="text-xs text-muted">Serial</dt><dd className="mt-1 font-mono">{certificate.serial}</dd></div>
            <div><dt className="text-xs text-muted">Issued</dt><dd className="mt-1">{certificate.issuedAt.toISOString().slice(0, 10)}</dd></div>
          </dl>
        ) : <p className="mt-5 text-sm text-muted">This code is unknown, revoked or expired.</p>}
      </section>
    </main>
  );
}
