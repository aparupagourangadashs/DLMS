import { safeNext } from "@/server/auth/redirect";
import { getSessionUser } from "@/server/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Landing point after sign-in: picks the right portal for the account type.
export default async function AuthRedirect({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(safeNext(next, user.kind));
}
