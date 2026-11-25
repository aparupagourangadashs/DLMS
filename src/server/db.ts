import type { PrismaClient } from "@/generated/prisma/client";
import "server-only";
import { createPrismaClient } from "./prisma-factory";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Reused across dev hot reloads so each reload does not open a new pool.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
