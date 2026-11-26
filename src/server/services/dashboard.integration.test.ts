import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

describe("B4b dashboard figures (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let registration: typeof import("@/server/services/registration");
    let dashboard: typeof import("@/server/services/dashboard");
    let sessions: typeof import("@/server/services/sessions");
    let ist: typeof import("@/lib/ist");

    let pune: { id: string };
    let mumbai: { id: string };
    let courseId: string;
    let staffId: string;

    // A Thursday; its week starts on Monday 2026-11-23 and the eight weeks start on 2026-10-05.
    const TODAY = "2026-11-26";
    let now: Date;

    const admin = () => ({ role: "ADMIN", branchIds: [] as string[] });
    const scopedTo = (branchId: string) => ({ role: "ADMIN", branchIds: [branchId] });
    const everything = { attendance: true, series: true };

    async function makeLearner(email: string, over: { branchId?: string; createdAt?: Date } = {}) {
        return prisma.$transaction(async (tx) =>
            tx.user.create({
                data: {
                    email,
                    kind: "LEARNER",
                    role: "LEARNER",
                    emailVerifiedAt: new Date(),
                    ...(over.createdAt ? { createdAt: over.createdAt } : {}),
                    learnerProfile: { create: { name: "Asha Rao", registrationNo: await registration.nextRegistrationNo(tx), ...(over.branchId ? { branchId: over.branchId } : {}) } },
                },
            }),
        );
    }

    const enrol = (userId: string, over: Record<string, unknown> = {}) => prisma.enrolment.create({ data: { userId, courseId, source: "ADMIN", ...over } });

    const makeBatch = (name: string, branchId: string | null) =>
        prisma.batch.create({ data: { name, courseId, startDate: new Date("2026-10-01T00:00:00Z"), endDate: new Date("2027-01-31T00:00:00Z"), instructorId: staffId, branchId } });

    const makeSession = (batchId: string, day: string, time: string, over: Record<string, unknown> = {}) => {
        const startsAt = ist.fromIst(day, time);
        return prisma.session.create({ data: { batchId, title: `DH ${day} ${time}`, startsAt, endsAt: new Date(startsAt.getTime() + 3_600_000), ...over } });
    };

    /** Learners enrolled in a batch, in order, so a test can mark some of them present. */
    async function enrolLearners(batchId: string, count: number, prefix: string) {
        const learners = [];
        for (let i = 0; i < count; i++) {
            const learner = await makeLearner(`dh.${prefix}${i}@example.com`);
            await enrol(learner.id, { batchId });
            learners.push(learner.id);
        }
        return learners;
    }

    const mark = (sessionId: string, present: string[], absent: string[] = []) =>
        prisma.attendance.createMany({
            data: [...present.map((userId) => ({ sessionId, userId, status: "PRESENT" as const })), ...absent.map((userId) => ({ sessionId, userId, status: "ABSENT" as const }))],
        });

    async function clear() {
        await prisma.enrolment.deleteMany({ where: { user: { email: { startsWith: "dh." } } } });
        await prisma.batch.deleteMany({ where: { name: { startsWith: "DH " } } });
        await prisma.counter.deleteMany();
        await prisma.user.deleteMany({ where: { email: { startsWith: "dh." } } });
    }

    async function wipe() {
        await clear();
        await prisma.course.deleteMany({ where: { slug: { startsWith: "dh-" } } });
    }

    before(async () => {
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        registration = await import("@/server/services/registration");
        dashboard = await import("@/server/services/dashboard");
        sessions = await import("@/server/services/sessions");
        ist = await import("@/lib/ist");
        now = ist.fromIst(TODAY, "12:00");

        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "dh-" } } });
        await prisma.branch.deleteMany({ where: { name: { startsWith: "DH " } } });
        await prisma.category.deleteMany({ where: { slug: "dh-cat" } });
        pune = await prisma.branch.create({ data: { name: "DH Pune" } });
        mumbai = await prisma.branch.create({ data: { name: "DH Mumbai" } });
        await prisma.category.create({ data: { slug: "dh-cat", title: "DH Category", description: "Test category", status: "PUBLISHED" } });
        courseId = (await prisma.course.create({ data: { slug: "dh-course", title: "DH Course", summary: "Summary", officialUrl: "https://example.org/dh", status: "PUBLISHED", category: { connect: { slug: "dh-cat" } } } })).id;
        staffId = (await prisma.user.create({ data: { email: "dh-teacher@ibmv.test", kind: "STAFF", role: "INSTRUCTOR", emailVerifiedAt: new Date(), staffProfile: { create: { displayName: "dh-teacher" } } } })).id;
    });

    beforeEach(clear);

    after(async () => {
        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "dh-" } } });
        await prisma.branch.deleteMany({ where: { name: { startsWith: "DH " } } });
        await prisma.category.deleteMany({ where: { slug: "dh-cat" } });
        await prisma.$disconnect();
    });

    test("signups and enrolments: eight Monday-based IST weeks, cancelled places left out, branch-scoped", async () => {
        const l1 = await makeLearner("dh.l1@example.com", { branchId: pune.id, createdAt: ist.fromIst("2026-11-24", "10:00") });
        const l2 = await makeLearner("dh.l2@example.com", { branchId: mumbai.id, createdAt: ist.fromIst("2026-11-23", "00:30") });
        const l3 = await makeLearner("dh.l3@example.com", { branchId: pune.id, createdAt: ist.fromIst("2026-11-22", "23:30") });
        const l4 = await makeLearner("dh.l4@example.com", { createdAt: ist.fromIst("2026-10-05", "08:00") });
        await makeLearner("dh.before@example.com", { branchId: pune.id, createdAt: ist.fromIst("2026-10-04", "23:59") });
        await makeLearner("dh.later@example.com", { branchId: pune.id, createdAt: ist.fromIst("2026-11-30", "09:00") });
        await enrol(l1.id, { enrolledAt: ist.fromIst("2026-11-24", "11:00") });
        await enrol(l2.id, { enrolledAt: ist.fromIst("2026-11-17", "11:00"), status: "CANCELLED" });
        await enrol(l3.id, { enrolledAt: ist.fromIst("2026-11-10", "11:00"), status: "COMPLETED" });
        await enrol(l4.id, { enrolledAt: ist.fromIst("2026-10-06", "11:00") });

        const all = await dashboard.getDashboardOverview(admin(), everything, now);
        assert.equal(all.today, TODAY);
        assert.deepEqual(all.series?.weekStarts, ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"]);
        assert.deepEqual(all.series?.signups, [1, 0, 0, 0, 0, 0, 1, 2], "Monday 00:30 IST belongs to the new week even though it is still Sunday in UTC");
        assert.deepEqual(all.series?.enrolments, [1, 0, 0, 0, 0, 1, 0, 1], "a cancelled enrolment is not counted");

        const puneView = await dashboard.getDashboardOverview(scopedTo(pune.id), everything, now);
        assert.deepEqual(puneView.series?.signups, [0, 0, 0, 0, 0, 0, 1, 1], "branch-scoped staff count their own branch's learners");
        assert.deepEqual(puneView.series?.enrolments, [0, 0, 0, 0, 0, 1, 0, 1]);
        const mumbaiView = await dashboard.getDashboardOverview(scopedTo(mumbai.id), everything, now);
        assert.deepEqual(mumbaiView.series?.signups, [0, 0, 0, 0, 0, 0, 0, 1]);
        assert.deepEqual(mumbaiView.series?.enrolments, [0, 0, 0, 0, 0, 0, 0, 0]);
        assert.deepEqual((await dashboard.getDashboardOverview({ role: "SUPER_ADMIN", branchIds: [pune.id] }, everything, now)).series?.signups, all.series?.signups, "a super admin is never scoped");
    });

    test("parts the caller may not read are not computed", async () => {
        const none = await dashboard.getDashboardOverview(admin(), { attendance: false, series: false }, now);
        assert.deepEqual(none, { today: TODAY, attendance: null, series: null });
        const attendanceOnly = await dashboard.getDashboardOverview(admin(), { attendance: true, series: false }, now);
        assert.equal(attendanceOnly.series, null);
        assert.deepEqual(attendanceOnly.attendance, { percent: null, previousPercent: null, days: [] }, "no sessions, no figure");
    });

    test("attendance: present over enrolled for classes already held with attendance taken, against the week before", async () => {
        const puneBatch = await makeBatch("DH Pune Batch", pune.id);
        const mumbaiBatch = await makeBatch("DH Mumbai Batch", mumbai.id);
        const [a, b, c, d] = await enrolLearners(puneBatch.id, 4, "p");
        const [m1, m2] = await enrolLearners(mumbaiBatch.id, 2, "m");

        const todayClass = await makeSession(puneBatch.id, TODAY, "10:00");
        await mark(todayClass.id, [a, b, c], [d]);
        const mondayClass = await makeSession(puneBatch.id, "2026-11-24", "10:00");
        await mark(mondayClass.id, [a, b]);
        const mumbaiClass = await makeSession(mumbaiBatch.id, TODAY, "10:00");
        await mark(mumbaiClass.id, [m1, m2]);
        // Left out: nothing marked, cancelled, still to be held, and outside both weeks.
        await makeSession(puneBatch.id, "2026-11-21", "10:00");
        const cancelled = await makeSession(puneBatch.id, "2026-11-22", "10:00", { status: "CANCELLED", cancelReason: "Rain" });
        await mark(cancelled.id, [a, b, c, d]);
        const later = await makeSession(puneBatch.id, TODAY, "20:00");
        await mark(later.id, [a, b, c, d]);
        const earlier = await makeSession(puneBatch.id, "2026-11-18", "10:00");
        await mark(earlier.id, [a, b], [c, d]);
        const tooOld = await makeSession(puneBatch.id, "2026-11-12", "10:00");
        await mark(tooOld.id, [a, b, c, d]);

        const all = (await dashboard.getDashboardOverview(admin(), everything, now)).attendance!;
        assert.equal(all.percent, 70, "7 of 10 expected, over the three classes with attendance");
        assert.equal(all.previousPercent, 50, "the week before: 2 of 4");
        assert.deepEqual(all.days, [{ date: "2026-11-24", percent: 50 }, { date: TODAY, percent: 83 }]);

        const scoped = (await dashboard.getDashboardOverview(scopedTo(pune.id), everything, now)).attendance!;
        assert.equal(scoped.percent, 63, "5 of 8, rounded");
        assert.deepEqual(scoped.days, [{ date: "2026-11-24", percent: 50 }, { date: TODAY, percent: 75 }]);
        assert.equal((await dashboard.getDashboardOverview(scopedTo(mumbai.id), everything, now)).attendance?.percent, 100);

        // The session list reports the same counts.
        const listed = await sessions.listSessions({ from: "2026-11-24", to: TODAY }, { id: staffId, role: "ADMIN", branchIds: [] });
        const byId = new Map(listed.sessions.map((s) => [s.id, s]));
        assert.deepEqual([byId.get(todayClass.id)?.attended, byId.get(todayClass.id)?.marked, byId.get(todayClass.id)?.enrolled], [3, 4, 4]);
        assert.deepEqual([byId.get(mondayClass.id)?.attended, byId.get(mondayClass.id)?.marked], [2, 2]);
        assert.deepEqual([byId.get(later.id)?.attended, byId.get(later.id)?.marked], [4, 4]);
    });

    test("attendance: a class never counts for more than everyone present", async () => {
        const batch = await makeBatch("DH Left Batch", pune.id);
        const [a, b] = await enrolLearners(batch.id, 2, "left");
        await prisma.enrolment.updateMany({ where: { batchId: batch.id }, data: { status: "CANCELLED" } });
        const held = await makeSession(batch.id, "2026-11-25", "10:00");
        await mark(held.id, [a, b]);

        const result = (await dashboard.getDashboardOverview(admin(), everything, now)).attendance!;
        assert.equal(result.percent, 100, "learners who have since left the batch still have their marks");
        assert.equal(result.previousPercent, null);
    });
});
