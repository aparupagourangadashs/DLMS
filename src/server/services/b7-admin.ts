import { z } from "zod";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { Conflict, NotFound, ValidationError } from "@/server/http/errors";

export async function listTemplates(channel?: string) {
  const channelEnum = channel ? ({ EMAIL: "EMAIL", SMS: "SMS", WHATSAPP: "WHATSAPP", PUSH: "PUSH" } as Record<string, "EMAIL" | "SMS" | "WHATSAPP" | "PUSH">)[channel] : undefined;
  const rows = await prisma.messageTemplate.findMany({ where: channelEnum ? { channel: channelEnum } : {}, orderBy: [{ channel: "asc" }, { name: "asc" }] });
  return rows.map((row) => ({ id: row.id, channel: row.channel, name: row.name, subject: row.subject, body: row.body, replyTo: row.replyTo, unsubscribeText: row.unsubscribeText, approvalStatus: row.approvalStatus, providerTemplateId: row.providerTemplateId }));
}

const templateSchema = z.object({
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP", "PUSH"]),
  name: z.string().trim().min(2).max(100),
  subject: z.string().trim().max(200).optional().default(""),
  body: z.string().trim().min(1).max(20000),
  replyTo: z.string().trim().max(254).optional().default(""),
  unsubscribeText: z.string().trim().max(200).optional().default(""),
});

export async function saveTemplate(user: SessionUser, ip: string, input: unknown, id?: string) {
  const data = templateSchema.safeParse(input);
  if (!data.success) throw new ValidationError(Object.fromEntries(data.error.issues.map((issue) => [issue.path.join(".") || "_", issue.message])));
  if (await prisma.messageTemplate.findFirst({ where: { channel: data.data.channel, name: data.data.name, ...(id ? { id: { not: id } } : {}) } })) throw new Conflict("A template with this name already exists in this channel.");
  const row = id
    ? await prisma.messageTemplate.update({ where: { id }, data: { ...data.data, subject: data.data.subject || null, replyTo: data.data.replyTo || null, unsubscribeText: data.data.unsubscribeText || null } })
    : await prisma.messageTemplate.create({ data: { ...data.data, subject: data.data.subject || null, replyTo: data.data.replyTo || null, unsubscribeText: data.data.unsubscribeText || null } });
  await writeAudit({ actorId: user.id, action: id ? "template.update" : "template.create", entity: "MessageTemplate", entityId: row.id, after: { name: row.name, channel: row.channel }, ip });
  return row;
}

export async function deleteTemplate(user: SessionUser, ip: string, id: string) {
  const row = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!row) throw new NotFound();
  if (await prisma.campaign.count({ where: { templateId: id } })) throw new Conflict("This template is used by a campaign.");
  await prisma.messageTemplate.delete({ where: { id } });
  await writeAudit({ actorId: user.id, action: "template.delete", entity: "MessageTemplate", entityId: id, before: { name: row.name }, ip });
}

export async function listNotificationLogs(limit = 100) {
  const rows = await prisma.notificationLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((row) => ({ id: row.id, channel: row.channel, recipient: row.recipient, status: row.status, error: row.error, providerMessageId: row.providerMessageId, createdAt: row.createdAt.toISOString() }));
}

export async function getWallet() {
  const channels = ["WHATSAPP", "SMS", "EMAIL", "AI"] as const;
  const accounts = await prisma.walletAccount.findMany({ include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } });
  const byChannel = new Map(accounts.map((account) => [account.channel, account]));
  return {
    accounts: channels.map((channel) => {
      const account = byChannel.get(channel);
      return { channel, balance: account?.balance ?? 0, transactions: account?.transactions.map((row) => ({ id: row.id, kind: row.kind, amount: row.amount, balanceAfter: row.balanceAfter, description: row.description, createdAt: row.createdAt.toISOString() })) ?? [] };
    }),
  };
}

export async function adjustWallet(user: SessionUser, ip: string, input: unknown) {
  const data = z.object({ channel: z.enum(["WHATSAPP", "SMS", "EMAIL", "AI"]), kind: z.enum(["CREDIT", "DEBIT"]), amount: z.number().int().min(1).max(10_000_000), description: z.string().trim().min(2).max(500) }).safeParse(input);
  if (!data.success) throw new ValidationError(Object.fromEntries(data.error.issues.map((issue) => [issue.path.join(".") || "_", issue.message])));
  const account = await prisma.walletAccount.upsert({ where: { channel: data.data.channel }, update: {}, create: { channel: data.data.channel, balance: 0 } });
  const next = data.data.kind === "CREDIT" ? account.balance + data.data.amount : account.balance - data.data.amount;
  if (next < 0) throw new ValidationError({ amount: "The wallet cannot go negative." });
  await prisma.$transaction([
    prisma.walletAccount.update({ where: { id: account.id }, data: { balance: next } }),
    prisma.walletTransaction.create({ data: { accountId: account.id, kind: data.data.kind, amount: data.data.amount, balanceAfter: next, description: data.data.description } }),
  ]);
  await writeAudit({ actorId: user.id, action: "wallet.adjust", entity: "WalletAccount", entityId: account.id, after: { channel: data.data.channel, kind: data.data.kind, amount: data.data.amount, balance: next }, ip });
  return { channel: data.data.channel, balance: next };
}
