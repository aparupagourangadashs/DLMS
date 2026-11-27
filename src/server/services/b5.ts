import crypto from "node:crypto";
import { prisma } from "@/server/db";
import { Forbidden, NotFound, ValidationError } from "@/server/http/errors";
import { writeAudit } from "@/server/audit";

async function learnerFor(userId: string) {
  const learner = await prisma.learnerProfile.findUnique({ where: { userId } });
  if (!learner) throw new Forbidden();
  return learner;
}

export async function listMyOrders(userId: string) {
  const learner = await learnerFor(userId);
  const rows = await prisma.order.findMany({
    where: { learnerId: learner.id },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } }, refunds: { orderBy: { processedAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    status: row.status,
    currency: row.currency,
    subtotalMinor: row.subtotalMinor,
    discountMinor: row.discountMinor,
    taxMinor: row.taxMinor,
    feeMinor: row.feeMinor,
    totalMinor: row.totalMinor,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    items: row.items.map((item) => ({ id: item.id, kind: item.kind, name: item.name, quantity: item.quantity, unitMinor: item.unitMinor, totalMinor: item.totalMinor })),
    payments: row.payments.map((payment) => ({ id: payment.id, status: payment.status, method: payment.method, amountMinor: payment.amountMinor, verifiedAt: payment.verifiedAt?.toISOString() ?? null })),
    refunds: row.refunds.map((refund) => ({ id: refund.id, amountMinor: refund.amountMinor, reason: refund.reason, processedAt: refund.processedAt.toISOString() })),
  }));
}

export async function getMyOrder(userId: string, orderId: string) {
  const learner = await learnerFor(userId);
  const row = await prisma.order.findFirst({
    where: { id: orderId, learnerId: learner.id },
    include: { items: true, payments: true, refunds: true, invoice: true },
  });
  if (!row) throw new NotFound();
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    currency: row.currency,
    subtotalMinor: row.subtotalMinor,
    discountMinor: row.discountMinor,
    taxMinor: row.taxMinor,
    feeMinor: row.feeMinor,
    totalMinor: row.totalMinor,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    items: row.items.map((item) => ({ kind: item.kind, name: item.name, quantity: item.quantity, unitMinor: item.unitMinor, totalMinor: item.totalMinor })),
    payments: row.payments.map((payment) => ({ status: payment.status, method: payment.method, amountMinor: payment.amountMinor })),
    refunds: row.refunds.map((refund) => ({ amountMinor: refund.amountMinor, reason: refund.reason, processedAt: refund.processedAt.toISOString() })),
    invoiceAvailable: Boolean(row.invoice),
  };
}

export async function listMyMemberships(userId: string) {
  const learner = await learnerFor(userId);
  const rows = await prisma.membership.findMany({
    where: { learnerId: learner.id },
    include: { plan: true },
    orderBy: [{ status: "asc" }, { endsAt: "desc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.plan.name,
    description: row.plan.description,
    priceMinor: row.plan.priceMinor,
    currency: row.plan.currency,
    interval: row.plan.interval,
    benefits: Array.isArray(row.plan.benefits) ? row.plan.benefits.filter((value): value is string => typeof value === "string") : [],
    status: row.status,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
  }));
}

export async function listAvailableMembershipPlans() {
  return prisma.membershipPlan.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  }).then((rows) => rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    priceMinor: row.priceMinor,
    currency: row.currency,
    interval: row.interval,
    benefits: Array.isArray(row.benefits) ? row.benefits.filter((value): value is string => typeof value === "string") : [],
  })));
}

export async function getMyReferrals(userId: string) {
  const learner = await learnerFor(userId);
  let referral = await prisma.referralCode.findUnique({ where: { learnerId: learner.id } });
  if (!referral) {
    const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
    referral = await prisma.referralCode.create({ data: { learnerId: learner.id, code: `IBMV-${suffix}` } });
  }
  const [transactions, ledger] = await Promise.all([
    prisma.referralTransaction.findMany({ where: { referrerId: learner.id }, include: { referee: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.creditLedger.findMany({ where: { learnerId: learner.id }, orderBy: { createdAt: "desc" } }),
  ]);
  return {
    code: referral.code,
    balanceMinor: ledger.reduce((sum, row) => sum + row.creditMinor, 0),
    transactions: transactions.map((row) => ({
      id: row.id,
      referee: row.referee?.name ?? "Pending",
      creditMinor: row.creditMinor,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function listReferralTransactions(userId: string) {
  const result = await getMyReferrals(userId);
  return { balanceMinor: result.balanceMinor, transactions: result.transactions };
}

export async function createFreeCourseOrder(userId: string, courseId: string, ip?: string) {
  const learner = await learnerFor(userId);
  const course = await prisma.course.findFirst({ where: { id: courseId, status: "PUBLISHED" } });
  if (!course) throw new NotFound();
  if (!course.isFree) throw new ValidationError({ courseId: "Paid checkout is not enabled. Use the official enrollment link." });
  const existing = await prisma.enrolment.findFirst({ where: { userId, courseId, status: { in: ["ACTIVE", "COMPLETED"] } } });
  if (existing) return { orderId: null, enrolmentId: existing.id, status: "PAID" };

  const number = `ORD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        number,
        learnerId: learner.id,
        status: "PAID",
        paidAt: new Date(),
        subtotalMinor: 0,
        totalMinor: 0,
        items: { create: { kind: "COURSE", productId: course.id, name: course.title, quantity: 1, unitMinor: 0, totalMinor: 0 } },
      },
    });
    await tx.enrolment.create({ data: { userId, courseId, source: "ORDER", status: "ACTIVE", orderId: created.id } });
    return created;
  });
  await writeAudit({ actorId: userId, action: "order.create.free", entity: "Order", entityId: order.id, after: { courseId, totalMinor: 0 }, ip });
  return { orderId: order.id, status: "PAID" };
}
