import { apiHandler, ok } from "@/server/http/handler";
import { listNotificationLogs } from "@/server/services/b7-admin";

export const GET = apiHandler(async () => ok(await listNotificationLogs()), { auth: "staff", permission: "notifications:read" });
