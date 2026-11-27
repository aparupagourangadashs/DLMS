import { z } from "zod";
import type { UserActivityKind } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ValidationError } from "@/server/http/errors";
import type { SessionUser } from "@/server/auth/session";

const kinds: Record<string, UserActivityKind> = {
  LOGIN: "LOGIN",
  PAGE_VIEW: "PAGE_VIEW",
  LESSON_START: "LESSON_START",
  LESSON_COMPLETE: "LESSON_COMPLETE",
  DOWNLOAD: "DOWNLOAD",
  COMMUNITY_POST: "COMMUNITY_POST",
  EXAM_SUBMIT: "EXAM_SUBMIT",
  CERTIFICATE_VIEW: "CERTIFICATE_VIEW",
};

export const activitySchema = z.object({
  kind: z.enum(["LOGIN", "PAGE_VIEW", "LESSON_START", "LESSON_COMPLETE", "DOWNLOAD", "COMMUNITY_POST", "EXAM_SUBMIT", "CERTIFICATE_VIEW"]),
  path: z.string().trim().regex(/^\/(?!\/)[^\s]{0,299}$/, "Use a local path."),
  relatedId: z.string().trim().max(191).optional(),
  durationSec: z.number().int().min(0).max(86_400).optional().default(0),
});

export async function recordActivity(user: SessionUser, input: unknown) {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join(".") || "_", issue.message])));
  await prisma.userActivity.create({
    data: {
      userId: user.id,
      kind: kinds[parsed.data.kind],
      path: parsed.data.path,
      relatedId: parsed.data.relatedId,
      durationSec: parsed.data.durationSec,
    },
  });
  return { recorded: true };
}
