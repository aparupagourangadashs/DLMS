import fs from "node:fs";

// Usage: `npx tsx scripts/cleanup-smoke.mjs`
// Removes the throwaway accounts the HTTP smoke scripts leave behind (emails starting with "smoke.").
const envPath = new URL("../.env", import.meta.url);
const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
process.env.DATABASE_URL = env.DATABASE_URL;
const { createPrismaClient } = await import("../src/server/prisma-factory.ts");
const prisma = createPrismaClient();
try {
    const removed = await prisma.user.deleteMany({ where: { email: { startsWith: "smoke." } } });
    console.log(`Removed ${removed.count} smoke account(s).`);
} finally {
    await prisma.$disconnect();
}
