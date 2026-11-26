import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { markNotificationsRead } from "@/server/services/notifications";

// `{ ids: [...] }` marks those messages read; an empty body marks them all.
export const POST = apiHandler<Record<string, never>, "staff">(async ({ request, user }) => markNotificationsRead(user.id, await readJson(request)), { auth: "staff" });
