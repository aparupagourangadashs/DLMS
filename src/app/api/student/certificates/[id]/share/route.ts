import { apiHandler, ok } from "@/server/http/handler";
import { prisma } from "@/server/db";
import { Forbidden, NotFound } from "@/server/http/errors";

type Params = { id: string };
export const GET = apiHandler<Params, "learner">(async ({ params, user, request }) => {
  const profile = await prisma.learnerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new Forbidden();
  const certificate = await prisma.certificate.findFirst({ where: { id: params.id, learnerId: profile.id } });
  if (!certificate) throw new NotFound();
  const origin = new URL(request.url).origin;
  return ok({ url: `${origin}/verify-certificate/${certificate.verificationCode}` });
}, { auth: "learner" });
