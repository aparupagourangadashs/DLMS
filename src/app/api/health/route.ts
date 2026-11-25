import { prisma } from "@/server/db";
import { apiHandler } from "@/server/http/handler";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("[health] database check failed", error);
    return Response.json({ status: "degraded", db: "down" }, { status: 503 });
  }
  return Response.json({ status: "ok", db: "up" });
});
