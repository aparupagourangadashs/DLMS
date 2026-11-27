import { z } from "zod";
import { apiHandler, created, ok } from "@/server/http/handler";
import { readJson, parseWith } from "@/server/http/validate";
import { createFreeCourseOrder, listMyOrders } from "@/server/services/b5";

export const GET = apiHandler(async ({ user }) => ok(await listMyOrders(user.id)), { auth: "learner" });
export const POST = apiHandler(async ({ request, user, ip }) => {
  const data = parseWith(z.object({ courseId: z.string().min(1), kind: z.literal("free-course").optional() }), await readJson(request));
  return created(await createFreeCourseOrder(user.id, data.courseId, ip));
}, { auth: "learner" });
