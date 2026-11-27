import { apiHandler, ok } from "@/server/http/handler";
import { prisma } from "@/server/db";
import { Forbidden } from "@/server/http/errors";

export const GET = apiHandler(async ({ user }) => {
  const profile = await prisma.learnerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new Forbidden();
  const fields = await prisma.customField.findMany({
    where: { entity: "LEARNER", placement: "SIGNUP" },
    include: { values: { where: { entityId: profile.id } } },
    orderBy: { sortOrder: "asc" },
  });
  return ok(fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    options: Array.isArray(field.options) ? field.options.filter((v): v is string => typeof v === "string") : [],
    value: field.values[0]?.value ?? "",
  })));
}, { auth: "learner" });
