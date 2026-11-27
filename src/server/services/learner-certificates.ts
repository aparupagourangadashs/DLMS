import { prisma } from "@/server/db";
import { Forbidden, NotFound } from "@/server/http/errors";

export async function listMyCertificates(userId: string) {
  const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
  if (!profile) throw new Forbidden();
  const now = new Date();
  const rows = await prisma.certificate.findMany({
    where: { learnerId: profile.id },
    include: { template: { select: { name: true, heading: true, serialPrefix: true } } },
    orderBy: { issuedAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.template.heading ?? row.template.name,
    serial: row.serial,
    issuedAt: row.issuedAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    status: row.status === "REVOKED" ? "Revoked" : row.status === "EXPIRED" || (row.expiresAt && row.expiresAt < now) ? "Expired" : "Issued",
    verificationCode: row.verificationCode,
  }));
}

export async function getCertificateFile(userId: string, certificateId: string) {
  const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
  if (!profile) throw new Forbidden();
  const row = await prisma.certificate.findFirst({
    where: { id: certificateId, learnerId: profile.id },
    include: { fileAsset: true },
  });
  if (!row || !row.fileAsset?.storageKey || row.status === "REVOKED") throw new NotFound();
  return row.fileAsset;
}
