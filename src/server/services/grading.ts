import { z } from "zod";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { ValidationError } from "@/server/http/errors";
import type { SessionUser } from "@/server/auth/session";

export type GradeBand = { id: string; name: string; min: number; max: number; remark: string };

export async function getGradeBands(): Promise<GradeBand[]> {
  const rows = await prisma.gradeBand.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((row) => ({ id: row.id, name: row.name, min: row.minPercent, max: row.maxPercent, remark: row.remark }));
}

export async function saveGradeBands(user: SessionUser, ip: string, input: unknown): Promise<GradeBand[]> {
  const schema = z.object({
    bands: z.array(z.object({
      name: z.string().trim().min(1).max(30),
      min: z.number().int().min(0).max(100),
      max: z.number().int().min(0).max(100),
      remark: z.string().trim().max(80).optional().default(""),
    })).min(1).max(20),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ValidationError(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "bands"), issue.message])));
  const bands = [...parsed.data.bands].sort((a, b) => a.min - b.min);
  if (bands[0].min !== 0 || bands[bands.length - 1].max !== 100) throw new ValidationError({ bands: "Bands must cover 0–100." });
  for (let i = 0; i < bands.length; i += 1) {
    if (bands[i].name.trim() === "" || bands[i].min > bands[i].max) throw new ValidationError({ bands: "Each band needs a valid name and range." });
    if (i > 0 && bands[i].min !== bands[i - 1].max + 1) throw new ValidationError({ bands: "Bands must be continuous with no gaps or overlaps." });
  }
  if (new Set(bands.map((b) => b.name.toLowerCase())).size !== bands.length) throw new ValidationError({ bands: "Grade names must be unique." });

  await prisma.$transaction(async (tx) => {
    await tx.gradeBand.deleteMany({});
    await tx.gradeBand.createMany({
      data: bands.map((band, sortOrder) => ({
        name: band.name,
        minPercent: band.min,
        maxPercent: band.max,
        remark: band.remark,
        sortOrder,
        createdById: user.id,
      })),
    });
  });
  await writeAudit({ actorId: user.id, action: "grading.update", entity: "GradeBand", entityId: "set", after: { count: bands.length }, ip });
  return getGradeBands();
}
