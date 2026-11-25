import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { redact } from "./redact";

export type AuditInput = {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string;
};

type Db = Pick<typeof prisma, "auditEvent">;

export async function writeAudit(input: AuditInput, db: Db = prisma) {
  await db.auditEvent.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: input.before === undefined ? undefined : (redact(input.before) as Prisma.InputJsonValue),
      after: input.after === undefined ? undefined : (redact(input.after) as Prisma.InputJsonValue),
      ip: input.ip,
    },
  });
}
