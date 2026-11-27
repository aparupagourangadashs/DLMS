import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { BusinessRule, Forbidden, NotFound, ValidationError } from "@/server/http/errors";
import { z } from "zod";

function profileFor(userId: string) {
  return prisma.learnerProfile.findUnique({ where: { userId } });
}

export async function listMyExams(userId: string, tab: "upcoming" | "past", now = new Date()) {
  const profile = await profileFor(userId);
  if (!profile) throw new Forbidden();
  const courseIds = await prisma.enrolment.findMany({
    where: { userId, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: { courseId: true },
  });
  const rows = await prisma.assessment.findMany({
    where: {
      status: "PUBLISHED",
      kind: "EXAM",
      OR: [
        { registrations: { some: { learnerId: profile.id } } },
        { courses: { some: { courseId: { in: courseIds.map((r) => r.courseId) } } } },
      ],
    },
    include: {
      bank: { include: { questions: { orderBy: { sortOrder: "asc" }, select: { id: true } } } },
      attempts: { where: { learnerId: profile.id }, orderBy: { startedAt: "desc" } },
    },
    orderBy: { opensAt: "asc" },
  });
  return rows
    .filter((row) => tab === "upcoming"
      ? row.attempts.every((a) => a.status !== "SUBMITTED") && (!row.closesAt || row.closesAt >= now)
      : row.attempts.some((a) => a.status === "SUBMITTED") || (row.closesAt && row.closesAt < now))
    .map((row) => ({
      id: row.id,
      name: row.name,
      opensAt: row.opensAt?.toISOString() ?? null,
      closesAt: row.closesAt?.toISOString() ?? null,
      durationMinutes: row.durationMinutes,
      maxAttempts: row.maxAttempts,
      questionCount: row.bank?.questions.length ?? 0,
      attempts: row.attempts.map((attempt) => ({
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        autoScore: attempt.autoScore,
      })),
    }));
}

export async function startExam(userId: string, assessmentId: string, now = new Date()) {
  const profile = await profileFor(userId);
  if (!profile) throw new Forbidden();
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      courses: { select: { courseId: true } },
      registrations: { where: { learnerId: profile.id }, select: { id: true } },
      bank: { include: { questions: { orderBy: { sortOrder: "asc" } } } },
      attempts: { where: { learnerId: profile.id }, orderBy: { startedAt: "desc" } },
    },
  });
  if (!assessment || assessment.status !== "PUBLISHED" || assessment.kind !== "EXAM") throw new NotFound();
  if (assessment.opensAt && now < assessment.opensAt) throw new BusinessRule("This exam opens later.");
  if (assessment.closesAt && now > assessment.closesAt) throw new BusinessRule("The exam window has closed.");
  if (assessment.attempts.length >= assessment.maxAttempts) throw new BusinessRule("The maximum number of attempts has been reached.");
  const active = assessment.attempts.find((attempt) => attempt.status === "IN_PROGRESS");
  if (active) return attemptPayload(active.id, assessment, active.answers);

  const enrolled = assessment.courses.length === 0 || assessment.registrations.length > 0
    ? assessment.registrations.length > 0
    : await prisma.enrolment.findFirst({ where: { userId, courseId: { in: assessment.courses.map((c) => c.courseId) }, status: { in: ["ACTIVE", "COMPLETED"] } } });
  if (!enrolled) throw new Forbidden();

  const attempt = await prisma.attempt.create({
    data: { assessmentId, learnerId: profile.id, status: "IN_PROGRESS", answers: {} },
  });
  return attemptPayload(attempt.id, assessment, {});
}

function attemptPayload(attemptId: string, assessment: Prisma.AssessmentGetPayload<{ include: { bank: { include: { questions: true } } } }>, answers: Prisma.JsonValue) {
  const safeAnswers = answers && typeof answers === "object" && !Array.isArray(answers) ? answers as Record<string, unknown> : {};
  return {
    attemptId,
    assessment: {
      id: assessment.id,
      name: assessment.name,
      instructions: assessment.instructions,
      durationMinutes: assessment.durationMinutes,
      passPercent: assessment.passPercent,
      totalMarks: assessment.totalMarks,
    },
    questions: assessment.bank?.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: Array.isArray(q.options) ? q.options : [],
      marks: q.marks,
      answer: safeAnswers[q.id] ?? null,
    })) ?? [],
  };
}

export async function saveAttemptAnswers(userId: string, attemptId: string, input: unknown) {
  const profile = await profileFor(userId);
  const parsed = z.object({ answers: z.record(z.string(), z.unknown()) }).safeParse(input);
  if (!parsed.success) throw new ValidationError({ answers: "Answers must be an object." });
  const attempt = await prisma.attempt.findFirst({ where: { id: attemptId, learnerId: profile?.id } });
  if (!attempt) throw new NotFound();
  if (attempt.status !== "IN_PROGRESS") throw new BusinessRule("This attempt is locked because it was already submitted.");
  const assessment = await prisma.assessment.findUnique({ where: { id: attempt.assessmentId }, include: { bank: true } });
  if (!assessment) throw new NotFound();
  const expiry = assessment.durationMinutes ? new Date(attempt.startedAt.getTime() + assessment.durationMinutes * 60_000) : null;
  if (assessment.closesAt && new Date() > assessment.closesAt) throw new BusinessRule("The exam window has closed.");
  if (expiry && new Date() > expiry) throw new BusinessRule("The attempt timer has expired.");
  await prisma.attempt.update({ where: { id: attemptId }, data: { answers: parsed.data.answers as Prisma.InputJsonObject } });
  return { saved: true };
}

export async function submitAttempt(userId: string, attemptId: string, now = new Date()) {
  const profile = await profileFor(userId);
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, learnerId: profile?.id },
    include: { assessment: { include: { bank: { include: { questions: true } } } } },
  });
  if (!attempt) throw new NotFound();
  if (attempt.status !== "IN_PROGRESS") throw new BusinessRule("This attempt is already submitted.");
  if (attempt.assessment.closesAt && now > attempt.assessment.closesAt) throw new BusinessRule("The exam window has closed.");
  if (attempt.assessment.durationMinutes && now > new Date(attempt.startedAt.getTime() + attempt.assessment.durationMinutes * 60_000)) throw new BusinessRule("The attempt timer has expired.");

  const answers = attempt.answers && typeof attempt.answers === "object" && !Array.isArray(attempt.answers) ? attempt.answers as Record<string, unknown> : {};
  let autoScore = 0;
  for (const question of attempt.assessment.bank?.questions ?? []) {
    const given = answers[question.id];
    const answer = question.answer && typeof question.answer === "object" ? question.answer as Record<string, unknown> : null;
    if (question.type === "MCQ" && answer && typeof given === "number" && answer.option === given) autoScore += question.marks;
  }
  const total = attempt.assessment.totalMarks || attempt.assessment.bank?.questions.reduce((sum, q) => sum + q.marks, 0) || 0;
  const late = Boolean(attempt.assessment.closesAt && now > attempt.assessment.closesAt);
  await prisma.$transaction([
    prisma.attempt.update({ where: { id: attemptId }, data: { status: "SUBMITTED", submittedAt: now, answers: answers as Prisma.InputJsonObject, autoScore, durationSeconds: Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000) } }),
    prisma.submission.create({ data: { attemptId, assessmentId: attempt.assessmentId, learnerId: attempt.learnerId, text: null, submittedAt: now, evaluationStatus: "NOT_EVALUATED", total, late } }),
  ]);
  return getAttemptResult(userId, attemptId);
}

export async function getAttemptResult(userId: string, attemptId: string) {
  const profile = await profileFor(userId);
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, learnerId: profile?.id },
    include: { assessment: true, submission: true },
  });
  if (!attempt) throw new NotFound();
  if (attempt.status !== "SUBMITTED") throw new BusinessRule("Submit the attempt before viewing a result.");
  const total = attempt.submission?.total ?? attempt.assessment.totalMarks;
  const percentage = total > 0 ? Math.round(((attempt.submission?.marks ?? attempt.autoScore ?? 0) / total) * 100) : 0;
  return {
    attemptId,
    assessmentName: attempt.assessment.name,
    status: attempt.status,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    autoScore: attempt.autoScore,
    marks: attempt.submission?.marks ?? null,
    total,
    percentage,
    passed: percentage >= attempt.assessment.passPercent,
  };
}
