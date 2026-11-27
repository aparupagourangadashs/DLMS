import type { ReportColumn, ReportRow } from "@/lib/admin/reports";
import { formatNumber } from "@/lib/format";
import { prisma } from "@/server/db";
import "server-only";
import { dayEnd, dayStart, largest, type Runner } from "./shared";

export const membershipEnrollments: Runner = async (query) => {
  const memberships = await prisma.membership.findMany({
    where: { createdAt: { gte: dayStart(query.from), lt: dayEnd(query.to) } },
    include: { plan: { select: { name: true } } },
  });
  const active = await prisma.membership.groupBy({ by: ["planId", "status"], _count: { _all: true } });
  const map = new Map<string, { memberships: number; active: number; expired: number; cancelled: number }>();
  for (const membership of memberships) {
    const entry = map.get(membership.planId) ?? { memberships: 0, active: 0, expired: 0, cancelled: 0 };
    entry.memberships += 1;
    if (membership.status === "ACTIVE") entry.active += 1;
    if (membership.status === "EXPIRED") entry.expired += 1;
    if (membership.status === "CANCELLED") entry.cancelled += 1;
    map.set(membership.planId, entry);
  }
  for (const group of active) {
    const entry = map.get(group.planId) ?? { memberships: 0, active: 0, expired: 0, cancelled: 0 };
    if (group.status === "ACTIVE") entry.active = group._count._all;
    if (group.status === "EXPIRED") entry.expired = group._count._all;
    if (group.status === "CANCELLED") entry.cancelled = group._count._all;
    map.set(group.planId, entry);
  }
  const plans = await prisma.membershipPlan.findMany({ where: { id: { in: [...map.keys()] } }, select: { id: true, name: true } });
  const rows = plans.map((plan): ReportRow => {
    const entry = map.get(plan.id) ?? { memberships: 0, active: 0, expired: 0, cancelled: 0 };
    return { plan: plan.name, memberships: entry.memberships, active: entry.active, expired: entry.expired, cancelled: entry.cancelled };
  });
  const columns: ReportColumn[] = [
    { key: "plan", label: "Membership plan" },
    { key: "memberships", label: "New in period", kind: "number" },
    { key: "active", label: "Active now", kind: "number" },
    { key: "expired", label: "Expired", kind: "number" },
    { key: "cancelled", label: "Cancelled", kind: "number" },
  ];
  const biggest = largest(rows, 12, (row) => Number(row.memberships));
  return {
    columns,
    rows,
    summary: [
      { label: "Plans", value: formatNumber(rows.length) },
      { label: "New memberships", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.memberships), 0)) },
      { label: "Active", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.active), 0)) },
      { label: "Expired", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.expired), 0)) },
    ],
    chart: rows.length ? { title: "Memberships by plan", seriesLabel: "New memberships", labels: biggest.map((row) => String(row.plan)), values: biggest.map((row) => Number(row.memberships)) } : null,
  };
};

export const issuedCertificates: Runner = async (query) => {
  const certificates = await prisma.certificate.findMany({
    where: { issuedAt: { gte: dayStart(query.from), lt: dayEnd(query.to) } },
    include: { template: { select: { name: true, serialPrefix: true } } },
  });
  const map = new Map<string, { name: string; issued: number; active: number; revoked: number; expired: number }>();
  for (const certificate of certificates) {
    const entry = map.get(certificate.templateId) ?? { name: certificate.template.name, issued: 0, active: 0, revoked: 0, expired: 0 };
    entry.issued += 1;
    if (certificate.status === "ACTIVE") entry.active += 1;
    if (certificate.status === "REVOKED") entry.revoked += 1;
    if (certificate.status === "EXPIRED") entry.expired += 1;
    map.set(certificate.templateId, entry);
  }
  const rows = [...map].map(([, entry]): ReportRow => ({ template: entry.name, issued: entry.issued, active: entry.active, revoked: entry.revoked, expired: entry.expired }));
  const columns: ReportColumn[] = [
    { key: "template", label: "Certificate template" },
    { key: "issued", label: "Issued in period", kind: "number" },
    { key: "active", label: "Active", kind: "number" },
    { key: "revoked", label: "Revoked", kind: "number" },
    { key: "expired", label: "Expired", kind: "number" },
  ];
  const total = (key: "issued" | "active" | "revoked" | "expired") => rows.reduce((sum, row) => sum + Number(row[key]), 0);
  const biggest = largest(rows, 12, (row) => Number(row.issued));
  return {
    columns,
    rows,
    summary: [
      { label: "Templates", value: formatNumber(rows.length) },
      { label: "Issued", value: formatNumber(total("issued")) },
      { label: "Active", value: formatNumber(total("active")) },
      { label: "Revoked", value: formatNumber(total("revoked")) },
    ],
    chart: rows.length ? { title: "Certificates issued by template", seriesLabel: "Issued", labels: biggest.map((row) => String(row.template)), values: biggest.map((row) => Number(row.issued)) } : null,
  };
};

export const walletRecharges: Runner = async (query) => {
  const transactions = await prisma.walletTransaction.findMany({
    where: { createdAt: { gte: dayStart(query.from), lt: dayEnd(query.to) } },
    include: { account: { select: { channel: true } } },
  });
  const map = new Map<string, { credits: number; debits: number; creditAmount: number; debitAmount: number }>();
  for (const transaction of transactions) {
    const entry = map.get(transaction.account.channel) ?? { credits: 0, debits: 0, creditAmount: 0, debitAmount: 0 };
    if (transaction.kind === "CREDIT") {
      entry.credits += 1;
      entry.creditAmount += transaction.amount;
    } else {
      entry.debits += 1;
      entry.debitAmount += transaction.amount;
    }
    map.set(transaction.account.channel, entry);
  }
  const rows = [...map].map(([channel, entry]): ReportRow => ({
    channel,
    credits: entry.credits,
    creditAmount: entry.creditAmount,
    debits: entry.debits,
    debitAmount: entry.debitAmount,
  }));
  const columns: ReportColumn[] = [
    { key: "channel", label: "Channel" },
    { key: "credits", label: "Credit transactions", kind: "number" },
    { key: "creditAmount", label: "Credits added", kind: "number" },
    { key: "debits", label: "Debit transactions", kind: "number" },
    { key: "debitAmount", label: "Credits used", kind: "number" },
  ];
  return {
    columns,
    rows,
    summary: [
      { label: "Channels", value: formatNumber(rows.length) },
      { label: "Credit transactions", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.credits), 0)) },
      { label: "Credits added", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.creditAmount), 0)) },
      { label: "Credits used", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.debitAmount), 0)) },
    ],
    chart: rows.length ? { title: "Credits added by channel", seriesLabel: "Credits", labels: rows.map((row) => String(row.channel)), values: rows.map((row) => Number(row.creditAmount)) } : null,
  };
};

export const assessmentAttempts: Runner = async (query) => {
  const attempts = await prisma.attempt.findMany({
    where: { startedAt: { gte: dayStart(query.from), lt: dayEnd(query.to) } },
    include: { assessment: { select: { name: true, totalMarks: true } }, submission: { select: { marks: true } }, learner: { select: { name: true, registrationNo: true } } },
  });
  const rows = attempts.map((attempt): ReportRow => {
    const duration = attempt.durationSeconds === null ? null : Math.round(attempt.durationSeconds / 60);
    const score = attempt.submission?.marks ?? attempt.autoScore ?? null;
    const percentage = score === null || attempt.assessment.totalMarks === 0 ? null : Math.round((score / attempt.assessment.totalMarks) * 100);
    return { assessment: attempt.assessment.name, learner: attempt.learner.name, registrationNo: attempt.learner.registrationNo, status: attempt.status, score: score ?? 0, percentage, duration };
  });
  const columns: ReportColumn[] = [
    { key: "assessment", label: "Assessment" }, { key: "learner", label: "Learner" }, { key: "registrationNo", label: "Registration no." },
    { key: "status", label: "Status" }, { key: "score", label: "Score", kind: "number" }, { key: "percentage", label: "Percentage", kind: "percent" }, { key: "duration", label: "Minutes", kind: "number" },
  ];
  const scored = rows.map((row) => Number(row.percentage ?? 0));
  return {
    columns,
    rows,
    summary: [
      { label: "Attempts", value: formatNumber(rows.length) },
      { label: "Submitted", value: formatNumber(rows.filter((row) => row.status === "SUBMITTED").length) },
      { label: "Average score", value: rows.length ? `${Math.round(scored.reduce((sum, value) => sum + value, 0) / rows.length)}%` : "\u2014" },
      { label: "Longest attempt", value: rows.length ? `${Math.max(...rows.map((row) => Number(row.duration ?? 0)))} min` : "\u2014" },
    ],
    chart: rows.length ? { title: "Attempt percentage distribution", seriesLabel: "Attempts", labels: rows.slice(0, 12).map((row) => String(row.learner)), values: rows.slice(0, 12).map((row) => Number(row.percentage ?? 0)), unit: "%" } : null,
  };
};

export const batchAssessment: Runner = async (query) => {
  const submissions = await prisma.submission.findMany({
    where: { submittedAt: { gte: dayStart(query.from), lt: dayEnd(query.to) } },
    include: { assessment: { select: { name: true, passPercent: true } } },
  });
  const learnerIds = [...new Set(submissions.map((submission) => submission.learnerId))];
  const enrolments = await prisma.enrolment.findMany({
    where: { userId: { in: learnerIds }, batchId: { not: null } },
    select: { userId: true, batch: { select: { id: true, name: true } } },
  });
  const batchesByLearner = new Map<string, Array<{ id: string; name: string }>>();
  for (const enrolment of enrolments) {
    if (!enrolment.batch) continue;
    const list = batchesByLearner.get(enrolment.userId) ?? [];
    if (!list.some((batch) => batch.id === enrolment.batch!.id)) list.push(enrolment.batch);
    batchesByLearner.set(enrolment.userId, list);
  }
  const map = new Map<string, { batch: string; submitted: number; evaluated: number; passed: number }>();
  for (const submission of submissions) {
    const batches = batchesByLearner.get(submission.learnerId) ?? [];
    for (const batch of batches) {
      const entry = map.get(batch.id) ?? { batch: batch.name, submitted: 0, evaluated: 0, passed: 0 };
      entry.submitted += 1;
      if (submission.evaluationStatus === "EVALUATED") entry.evaluated += 1;
      if (submission.marks !== null && submission.total > 0 && submission.assessment.passPercent <= Math.round((submission.marks / submission.total) * 100)) entry.passed += 1;
      map.set(batch.id, entry);
    }
  }
  const rows = [...map].map(([, entry]): ReportRow => ({
    batch: entry.batch,
    submitted: entry.submitted,
    evaluated: entry.evaluated,
    passed: entry.passed,
    passRate: entry.submitted ? Math.round((entry.passed / entry.submitted) * 100) : 0,
  }));
  const columns: ReportColumn[] = [
    { key: "batch", label: "Batch" },
    { key: "submitted", label: "Submitted", kind: "number" },
    { key: "evaluated", label: "Evaluated", kind: "number" },
    { key: "passed", label: "Passed", kind: "number" },
    { key: "passRate", label: "Pass rate", kind: "percent" },
  ];
  return {
    columns,
    rows,
    summary: [
      { label: "Batches", value: formatNumber(rows.length) },
      { label: "Submitted", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.submitted), 0)) },
      { label: "Evaluated", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.evaluated), 0)) },
      { label: "Passed", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.passed), 0)) },
    ],
    chart: rows.length ? { title: "Pass rate by batch", seriesLabel: "Pass rate", labels: rows.slice(0, 12).map((row) => String(row.batch)), values: rows.slice(0, 12).map((row) => Number(row.passRate)), unit: "%" } : null,
  };
};

export const userTime: Runner = async (query) => {
  const activities = await prisma.userActivity.findMany({
    where: { occurredAt: { gte: dayStart(query.from), lt: dayEnd(query.to) } },
    select: { userId: true, kind: true, durationSec: true, occurredAt: true },
  });
  const map = new Map<string, { activeUsers: Set<string>; seconds: number; views: number }>();
  for (const activity of activities) {
    const date = activity.occurredAt.toISOString().slice(0, 10);
    const entry = map.get(date) ?? { activeUsers: new Set<string>(), seconds: 0, views: 0 };
    entry.activeUsers.add(activity.userId);
    entry.seconds += activity.durationSec;
    if (activity.kind === "PAGE_VIEW") entry.views += 1;
    map.set(date, entry);
  }
  const rows = [...map].sort(([a], [b]) => a.localeCompare(b)).map(([date, entry]): ReportRow => ({
    date,
    activeUsers: entry.activeUsers.size,
    minutes: Math.round(entry.seconds / 60),
    views: entry.views,
  }));
  const columns: ReportColumn[] = [
    { key: "date", label: "Date", kind: "date" },
    { key: "activeUsers", label: "Active users", kind: "number" },
    { key: "minutes", label: "Minutes tracked", kind: "number" },
    { key: "views", label: "Page views", kind: "number" },
  ];
  return {
    columns,
    rows,
    summary: [
      { label: "Days", value: formatNumber(rows.length) },
      { label: "Active users", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.activeUsers), 0)) },
      { label: "Minutes tracked", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.minutes), 0)) },
      { label: "Page views", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.views), 0)) },
    ],
    chart: rows.length ? { title: "Daily active users", seriesLabel: "Active users", labels: rows.map((row) => String(row.date)), values: rows.map((row) => Number(row.activeUsers)) } : null,
  };
};
