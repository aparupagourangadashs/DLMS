import { can, type Action, type Resource } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { Forbidden } from "@/server/http/errors";

export function assertCan(user: Pick<SessionUser, "role">, resource: Resource, action: Action) {
  if (!can(user.role, `${resource}:${action}`)) throw new Forbidden();
}
