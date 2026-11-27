import { z } from "zod";
import { apiHandler, ok } from "@/server/http/handler";
import { readJson, parseWith } from "@/server/http/validate";
import { requireStaff } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { Forbidden } from "@/server/http/errors";
import { writeAudit } from "@/server/audit";

export const POST = apiHandler(async ({ request, ip }) => {
  const user = await requireStaff("recordings:delete");
  const data = parseWith(z.object({ ids: z.array(z.string().min(1)).min(1).max(100) }), await readJson(request));
  const scoped = user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && user.branchIds.length > 0;
  const rows = await prisma.recording.findMany({
    where: {
      id: { in: data.ids },
      ...(scoped ? { session: { batch: { OR: [{ branchId: { in: user.branchIds } }, { branchId: null }] } } } : {}),
    },
    select: { id: true, title: true, sessionId: true, session: { select: { batchId: true } } },
  });
  if (rows.length !== data.ids.length) throw new Forbidden("One or more recordings are outside your permitted branch scope.");
  await prisma.recording.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
  for (const row of rows) {
    await writeAudit({ actorId: user.id, action: "recording.delete", entity: "Recording", entityId: row.id, before: { title: row.title, session: row.sessionId, batch: row.session.batchId }, ip });
  }
  return ok({ deleted: rows.length });
}, { auth: "staff" });
