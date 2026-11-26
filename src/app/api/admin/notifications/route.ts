import { apiHandler } from "@/server/http/handler";
import { listNotifications } from "@/server/services/notifications";

// The signed-in staff member's own bell: any staff role, never another person's messages.
export const GET = apiHandler<Record<string, never>, "staff">(({ user }) => listNotifications(user.id), { auth: "staff" });
