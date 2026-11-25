import crypto from "node:crypto";
import fs from "node:fs";

// Temporary: creates one throwaway admin and one throwaway learner (enrolled in Demo Batch 1) for a manual browser check.
// Their emails start with "smoke." so `npx tsx scripts/cleanup-smoke.mjs` removes them.
const env = Object.fromEntries(
    fs.readFileSync(new URL("../.env", import.meta.url), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
process.env.DATABASE_URL = env.DATABASE_URL;
const { createPrismaClient } = await import("../src/server/prisma-factory.ts");
const { hashPassword } = await import("../src/server/auth/password.ts");
const { nextRegistrationNo } = await import("../src/server/services/registration.ts");
const prisma = createPrismaClient();

try {
    const password = `Br-${crypto.randomBytes(6).toString("hex")}-Aa1`;
    const hash = await hashPassword(password);
    const admin = await prisma.user.upsert({
        where: { email: "smoke.browser.admin@example.com" },
        update: { passwordHash: hash },
        create: { email: "smoke.browser.admin@example.com", passwordHash: hash, kind: "STAFF", role: "ADMIN", emailVerifiedAt: new Date(), staffProfile: { create: { displayName: "Smoke Browser Admin" } } },
    });
    let learner = await prisma.user.findUnique({ where: { email: "smoke.browser.learner@example.com" } });
    if (learner) await prisma.user.update({ where: { id: learner.id }, data: { passwordHash: hash } });
    else {
        learner = await prisma.$transaction(async (tx) =>
            tx.user.create({
                data: { email: "smoke.browser.learner@example.com", passwordHash: hash, kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), learnerProfile: { create: { name: "Smoke Browser Learner", registrationNo: await nextRegistrationNo(tx) } } },
            }),
        );
    }
    const batch = await prisma.batch.findUnique({ where: { name: "Demo Batch 1" } });
    if (batch && !(await prisma.enrolment.findFirst({ where: { userId: learner.id, courseId: batch.courseId, status: "ACTIVE" } }))) {
        await prisma.enrolment.create({ data: { userId: learner.id, courseId: batch.courseId, batchId: batch.id, source: "ADMIN", createdById: admin.id } });
    }
    console.log(`password=${password}`);
} finally {
    await prisma.$disconnect();
}
