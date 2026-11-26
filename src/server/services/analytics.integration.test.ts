import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

type Actor = { role: string; branchIds: string[] };

describe("B8 analytics on the data that exists (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let analytics: typeof import("@/server/services/analytics");
    let permissions: typeof import("@/server/auth/permissions");
    let ist: typeof import("@/lib/ist");
    let errors: typeof import("@/server/http/errors");

    // 12:00 IST on 1 December 2026; the figures below are worked out for this moment.
    const now = new Date("2026-12-01T06:30:00Z");
    const period = { from: "2026-11-01", to: "2026-12-01" };
    let main: { id: string };
    let north: { id: string };
    let courseA: { id: string };
    let courseB: { id: string };
    let admin: Actor;
    let scoped: Actor;
    let superAdmin: Actor;

    const run = (page: string, report: string, input: Record<string, unknown> = {}, who: Actor = admin) =>
        analytics.runReport(page, report, { ...period, ...input }, who, now);
    const column = (result: Awaited<ReturnType<typeof run>>, key: string) => result.data.rows.map((row) => row[key]);
    const at = (iso: string) => new Date(iso);

    async function wipe() {
        await prisma.lessonProgress.deleteMany();
        await prisma.enrolment.deleteMany();
        await prisma.session.deleteMany();
        await prisma.batch.deleteMany();
        await prisma.courseModule.deleteMany();
        await prisma.module.deleteMany({ where: { name: { startsWith: "AN " } } });
        await prisma.course.deleteMany({ where: { slug: { startsWith: "an-" } } });
        await prisma.category.deleteMany({ where: { slug: "an-cat" } });
        await prisma.user.deleteMany({ where: { email: { startsWith: "an" } } });
        await prisma.branch.deleteMany({ where: { name: { startsWith: "AN " } } });
        await prisma.lead.deleteMany();
        await prisma.asset.deleteMany();
    }

    async function staff(email: string, role: "ADMIN" | "INSTRUCTOR" | "FINANCE" | "CONTENT_EDITOR" | "SUPPORT", branchIds: string[] = []) {
        const user = await prisma.user.create({ data: { email, kind: "STAFF", role, emailVerifiedAt: new Date(), staffProfile: { create: { displayName: email.split("@")[0] } } } });
        for (const branchId of branchIds) await prisma.userBranch.create({ data: { userId: user.id, branchId } });
        return user;
    }

    async function learner(key: string, name: string, over: { reg: string; createdAt: string; branchId?: string; lastLoginAt?: string }) {
        return prisma.user.create({
            data: {
                email: `an.${key}@example.com`, kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), createdAt: at(over.createdAt), lastLoginAt: over.lastLoginAt ? at(over.lastLoginAt) : null,
                learnerProfile: { create: { name, registrationNo: over.reg, branchId: over.branchId ?? null, createdAt: at(over.createdAt) } },
            },
        });
    }

    before(async () => {
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        analytics = await import("@/server/services/analytics");
        permissions = await import("@/server/auth/permissions");
        ist = await import("@/lib/ist");
        errors = await import("@/server/http/errors");
        await wipe();

        main = await prisma.branch.create({ data: { name: "AN Main", city: "Vrindavan" } });
        north = await prisma.branch.create({ data: { name: "AN North" } });
        admin = { role: "ADMIN", branchIds: [] };
        scoped = { role: "ADMIN", branchIds: [main.id] };
        superAdmin = { role: "SUPER_ADMIN", branchIds: [main.id] };
        const trainer1 = await staff("an-trainer1@ibmv.test", "INSTRUCTOR");
        const trainer2 = await staff("an-trainer2@ibmv.test", "INSTRUCTOR");

        const category = await prisma.category.create({ data: { slug: "an-cat", title: "AN Category", description: "Test category", status: "PUBLISHED" } });
        courseA = await prisma.course.create({ data: { slug: "an-gita", title: "AN Gita", summary: "A test course.", categoryId: category.id, officialUrl: "https://example.org/gita", status: "PUBLISHED" } });
        courseB = await prisma.course.create({ data: { slug: "an-sanskrit", title: "AN Sanskrit", summary: "Another test course.", categoryId: category.id, officialUrl: "https://example.org/sanskrit", status: "PUBLISHED" } });

        // Module One has two lessons and Module Two one. The Gita course has both modules, the Sanskrit course the first.
        const one = await prisma.module.create({ data: { name: "AN Module One", status: "PUBLISHED", contents: { create: [{ title: "Lesson 1", type: "TEXT", body: "x", sortOrder: 0 }, { title: "Lesson 2", type: "TEXT", body: "x", sortOrder: 1 }] } }, include: { contents: { orderBy: { sortOrder: "asc" } } } });
        const two = await prisma.module.create({ data: { name: "AN Module Two", status: "PUBLISHED", contents: { create: [{ title: "Lesson 3", type: "TEXT", body: "x", sortOrder: 0 }] } }, include: { contents: true } });
        await prisma.courseModule.createMany({ data: [{ courseId: courseA.id, moduleId: one.id, sortOrder: 0 }, { courseId: courseA.id, moduleId: two.id, sortOrder: 1 }, { courseId: courseB.id, moduleId: one.id, sortOrder: 0 }] });
        const [l1, l2] = one.contents;
        const [l3] = two.contents;

        const asha = await learner("asha", "Asha", { reg: "AN-001", createdAt: "2026-11-02T05:00:00Z", branchId: main.id, lastLoginAt: "2026-11-30T05:00:00Z" });
        const bala = await learner("bala", "Bala", { reg: "AN-002", createdAt: "2026-11-03T05:00:00Z", branchId: main.id, lastLoginAt: "2026-11-10T05:00:00Z" });
        const chitra = await learner("chitra", "Chitra", { reg: "AN-003", createdAt: "2026-11-18T05:00:00Z", branchId: north.id });
        const dev = await learner("dev", "Dev", { reg: "AN-004", createdAt: "2026-10-10T05:00:00Z", branchId: north.id, lastLoginAt: "2026-10-01T05:00:00Z" });
        const esha = await learner("esha", "Esha", { reg: "AN-005", createdAt: "2026-11-27T05:00:00Z", lastLoginAt: "2026-11-29T05:00:00Z" });

        const batch = (name: string, courseId: string, branchId: string | null, instructorId: string, status: "ACTIVE" | "COMPLETED" = "ACTIVE") =>
            prisma.batch.create({ data: { name, courseId, branchId, instructorId, status, startDate: at("2026-10-01T00:00:00Z"), endDate: at("2027-03-01T00:00:00Z") } });
        const a1 = await batch("AN Batch A1", courseA.id, main.id, trainer1.id);
        const a2 = await batch("AN Batch A2", courseA.id, north.id, trainer2.id);
        const b1 = await batch("AN Batch B1", courseB.id, main.id, trainer1.id, "COMPLETED");
        const none = await batch("AN Batch None", courseB.id, null, trainer2.id);

        const enrol = (userId: string, courseId: string, batchId: string, status: "ACTIVE" | "COMPLETED" | "CANCELLED", progressPercent: number, enrolledAt: string, source: "ADMIN" | "ORDER" | "MEMBERSHIP" | "BULK") =>
            prisma.enrolment.create({ data: { userId, courseId, batchId, status, progressPercent, enrolledAt: at(enrolledAt), source } });
        const e1 = await enrol(asha.id, courseA.id, a1.id, "ACTIVE", 50, "2026-11-05T05:00:00Z", "ADMIN");
        const e2 = await enrol(bala.id, courseA.id, a1.id, "COMPLETED", 100, "2026-11-06T05:00:00Z", "ORDER");
        await enrol(chitra.id, courseA.id, a2.id, "ACTIVE", 0, "2026-10-20T05:00:00Z", "ADMIN");
        const e4 = await enrol(dev.id, courseB.id, b1.id, "ACTIVE", 20, "2026-10-15T05:00:00Z", "MEMBERSHIP");
        await enrol(asha.id, courseB.id, none.id, "CANCELLED", 0, "2026-11-25T05:00:00Z", "ADMIN");
        await enrol(esha.id, courseB.id, none.id, "ACTIVE", 10, "2026-11-28T05:00:00Z", "BULK");
        await prisma.lessonProgress.createMany({
            data: [
                { enrolmentId: e1.id, contentId: l1.id, completedAt: at("2026-11-25T05:00:00Z") }, { enrolmentId: e1.id, contentId: l3.id, completedAt: at("2026-11-27T05:00:00Z") },
                { enrolmentId: e2.id, contentId: l1.id, completedAt: at("2026-11-20T05:00:00Z") }, { enrolmentId: e2.id, contentId: l2.id, completedAt: at("2026-11-21T05:00:00Z") }, { enrolmentId: e2.id, contentId: l3.id, completedAt: at("2026-11-22T05:00:00Z") },
                { enrolmentId: e4.id, contentId: l1.id, completedAt: at("2026-10-16T05:00:00Z") },
            ],
        });

        const session = (batchId: string, title: string, day: string, from: string, to: string, over: { instructorId?: string; status?: "SCHEDULED" | "CANCELLED" } = {}) =>
            prisma.session.create({ data: { batchId, title, startsAt: ist.fromIst(day, from), endsAt: ist.fromIst(day, to), ...over } });
        const s1 = await session(a1.id, "Gita class 1", "2026-11-20", "10:00", "11:00", { instructorId: trainer1.id });
        const s2 = await session(a1.id, "Gita class 2", "2026-11-22", "10:00", "11:00", { instructorId: trainer1.id });
        const s3 = await session(a2.id, "Gita class 3", "2026-11-23", "18:00", "19:30");
        await session(a1.id, "Gita class 4", "2026-11-25", "10:00", "11:00", { instructorId: trainer1.id, status: "CANCELLED" });
        await session(a1.id, "Gita class 5", "2026-12-05", "10:00", "11:00", { instructorId: trainer1.id });
        await session(none.id, "Sanskrit class 1", "2026-11-26", "09:00", "10:00");
        const s7 = await session(b1.id, "Sanskrit class 2", "2026-11-15", "10:00", "11:00", { instructorId: trainer1.id });
        await prisma.attendance.createMany({
            data: [
                { sessionId: s1.id, userId: asha.id, status: "PRESENT" }, { sessionId: s1.id, userId: bala.id, status: "ABSENT" },
                { sessionId: s2.id, userId: asha.id, status: "PRESENT" },
                { sessionId: s3.id, userId: chitra.id, status: "ABSENT" },
                { sessionId: s7.id, userId: dev.id, status: "PRESENT" },
            ],
        });

        const lead = (name: string, source: "CONTACT_FORM" | "BULK_BOOK" | "MANUAL", stage: "NEW" | "CONVERTED" | "CLOSED", createdAt: string) =>
            ({ name, email: `${name.toLowerCase().replace(/\W+/g, ".")}@example.com`, source, stage, createdAt: at(createdAt) });
        await prisma.lead.createMany({
            data: [
                lead("Lead One", "CONTACT_FORM", "NEW", "2026-11-05T05:00:00Z"), lead("Lead Two", "CONTACT_FORM", "CONVERTED", "2026-11-06T05:00:00Z"), lead("Lead Three", "CONTACT_FORM", "CLOSED", "2026-11-07T05:00:00Z"),
                lead("Lead Four", "BULK_BOOK", "NEW", "2026-11-08T05:00:00Z"), lead("Lead Five", "BULK_BOOK", "NEW", "2026-11-09T05:00:00Z"),
                lead("Lead Six", "MANUAL", "CONVERTED", "2026-11-10T05:00:00Z"), lead("Lead Old", "CONTACT_FORM", "NEW", "2026-09-10T05:00:00Z"),
            ],
        });

        // Two assets share one stored image; a staged upload and a link are not stored files.
        const asset = (name: string, type: "IMAGE" | "PDF" | "YOUTUBE", over: Record<string, unknown>) => ({ name, type, ...over });
        await prisma.asset.createMany({
            data: [
                asset("AN image 1", "IMAGE", { status: "READY", storageKey: "an-key-1", sizeBytes: 1_048_576, createdAt: at("2026-11-10T05:00:00Z") }),
                asset("AN image 1 again", "IMAGE", { status: "READY", storageKey: "an-key-1", sizeBytes: 1_048_576, createdAt: at("2026-11-12T05:00:00Z") }),
                asset("AN image 2", "IMAGE", { status: "READY", storageKey: "an-key-3", sizeBytes: 2_097_152, createdAt: at("2026-11-20T05:00:00Z") }),
                asset("AN pdf", "PDF", { status: "READY", storageKey: "an-key-2", sizeBytes: 3_145_728, createdAt: at("2026-09-01T05:00:00Z") }),
                asset("AN staged", "IMAGE", { status: "STAGED", storageKey: "an-key-4", sizeBytes: 5_000_000 }),
                asset("AN link", "YOUTUBE", { status: "READY", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
            ],
        });
    });

    after(async () => {
        await wipe();
        await prisma.$disconnect();
    });

    test("batch progress: learners, completions and the average for each batch; the filters and a branch-bound administrator", async () => {
        const all = await run("batch-progress", "batch-progress");
        assert.deepEqual(column(all, "batch"), ["AN Batch A1", "AN Batch A2", "AN Batch B1", "AN Batch None"], "the biggest batch first, equal ones by name");
        const a1 = all.data.rows[0];
        assert.deepEqual([a1.course, a1.branch, a1.status, a1.learners, a1.completed, a1.progress], ["AN Gita", "AN Main", "Active", 2, 1, 75]);
        assert.deepEqual(all.data.rows[3].branch, null, "a batch of no branch");
        assert.deepEqual(all.summary.map((card) => card.value), ["4", "5", "36%", "1"], "a cancelled enrolment is not a learner");
        assert.equal(all.data.chart?.unit, "%");
        assert.deepEqual(all.data.chart?.labels, ["AN Batch A1", "AN Batch A2", "AN Batch B1", "AN Batch None"]);

        assert.deepEqual(column(await run("batch-progress", "batch-progress", { status: "Completed" }), "batch"), ["AN Batch B1"]);
        assert.deepEqual(column(await run("batch-progress", "batch-progress", { course: courseB.id }), "batch"), ["AN Batch B1", "AN Batch None"]);
        assert.deepEqual(column(await run("batch-progress", "batch-progress", { branch: main.id }), "batch"), ["AN Batch A1", "AN Batch B1"]);

        // A branch-bound administrator sees their own branch and the batches that belong to none.
        assert.deepEqual(column(await run("batch-progress", "batch-progress", {}, scoped), "batch"), ["AN Batch A1", "AN Batch B1", "AN Batch None"]);
        assert.deepEqual(column(await run("batch-progress", "batch-progress", { branch: north.id }, scoped), "batch"), [], "another branch is out of reach");
        assert.deepEqual(column(await run("batch-progress", "batch-progress", {}, superAdmin), "batch").length, 4, "a Super Admin is never bound to a branch");
    });

    test("learner progress: lessons done of the course's lessons, the last lesson and a chart of progress bands", async () => {
        const all = await run("batch-progress", "learner-progress");
        assert.deepEqual(column(all, "learner"), ["Bala", "Asha", "Dev", "Esha", "Chitra"], "highest progress first");
        const asha = all.data.rows[1];
        assert.deepEqual([asha.registrationNo, asha.course, asha.batch, asha.lessonsDone, asha.lessonsTotal, asha.progress, asha.lastLesson, asha.status], ["AN-001", "AN Gita", "AN Batch A1", 2, 3, 50, "2026-11-27", "Active"]);
        const esha = all.data.rows[3];
        assert.deepEqual([esha.lessonsDone, esha.lessonsTotal, esha.lastLesson], [0, 2, null], "the Sanskrit course has the two lessons of the first module");
        assert.equal(all.data.rows.length, 5, "the cancelled enrolment is left out");
        assert.deepEqual(all.summary.map((card) => card.value), ["5", "36%", "1", "1"]);
        assert.deepEqual(all.data.chart?.labels, ["Not started", "1\u201325%", "26\u201350%", "51\u201375%", "76\u201399%", "Completed"]);
        assert.deepEqual(all.data.chart?.values, [1, 2, 1, 0, 0, 1]);

        assert.deepEqual(column(await run("batch-progress", "learner-progress", { status: "Completed" }), "learner"), ["Bala"]);
        assert.deepEqual(column(await run("batch-progress", "learner-progress", { course: courseB.id }), "learner"), ["Dev", "Esha"]);
        assert.deepEqual(column(await run("batch-progress", "learner-progress", { branch: north.id }), "learner"), ["Dev", "Chitra"]);
        assert.deepEqual(column(await run("batch-progress", "learner-progress", {}, scoped), "learner"), ["Bala", "Asha"], "only learners of the administrator's branch");
    });

    test("attendance: classes that have marks, with the expected count never below the marks; by class and by batch", async () => {
        const classes = await run("batch-progress", "attendance");
        assert.deepEqual(column(classes, "date"), ["2026-11-23", "2026-11-22", "2026-11-20", "2026-11-15"], "cancelled, unmarked and future classes are left out");
        const first = classes.data.rows[2];
        assert.deepEqual([first.time, first.class, first.batch, first.course, first.branch, first.expected, first.present, first.attendance], ["10:00", "Gita class 1", "AN Batch A1", "AN Gita", "AN Main", 2, 1, 50]);
        assert.deepEqual(classes.summary.map((card) => card.value), ["4", "5", "3", "60%"]);
        const chart = classes.data.chart!;
        assert.equal(chart.labels.length, 31);
        assert.equal(chart.labels[0], "11-01");
        assert.deepEqual([chart.values[chart.labels.indexOf("11-15")], chart.values[chart.labels.indexOf("11-20")], chart.values[chart.labels.indexOf("11-23")]], [100, 50, 0]);
        assert.deepEqual(column(await run("batch-progress", "attendance", { branch: north.id }), "class"), ["Gita class 3"]);
        assert.deepEqual(column(await run("batch-progress", "attendance", {}, scoped), "class"), ["Gita class 2", "Gita class 1", "Sanskrit class 2"], "a branch-bound administrator does not see the north batch");
        assert.deepEqual(column(await run("batch-progress", "attendance", { from: "2026-11-21", to: "2026-11-30" }), "class"), ["Gita class 3", "Gita class 2"]);

        const batches = await run("batch-progress", "batch-attendance");
        assert.deepEqual(column(batches, "batch"), ["AN Batch A1", "AN Batch A2", "AN Batch B1"]);
        assert.deepEqual(batches.data.rows[0].classes, 2);
        assert.deepEqual([batches.data.rows[0].expected, batches.data.rows[0].present, batches.data.rows[0].attendance], [3, 2, 67]);
        assert.deepEqual(batches.data.rows.map((row) => row.attendance), [67, 0, 100]);
        assert.deepEqual(batches.summary.map((card) => card.value), ["3", "4", "3", "60%"]);
    });

    test("trainers and the session log: classes held, cancelled and upcoming, with the trainer a batch falls back to", async () => {
        const trainers = await run("trainer", "trainer-summary");
        assert.deepEqual(column(trainers, "trainer"), ["an-trainer1", "an-trainer2"]);
        const [one, two] = trainers.data.rows;
        assert.deepEqual([one.classes, one.cancelled, one.batches, one.expected, one.present, one.attendance], [3, 1, 2, 4, 3, 75]);
        assert.deepEqual([two.classes, two.cancelled, two.batches, two.expected, two.present, two.attendance], [2, 0, 2, 1, 0, 0], "classes with no trainer of their own go to the batch's trainer");
        assert.deepEqual(column(await run("trainer", "trainer-summary", { branch: north.id }), "trainer"), ["an-trainer2"]);

        const log = await run("trainer", "session-log");
        assert.deepEqual(column(log, "class"), ["Sanskrit class 1", "Gita class 4", "Gita class 3", "Gita class 2", "Gita class 1", "Sanskrit class 2"]);
        assert.deepEqual(column(log, "status"), ["Held", "Cancelled", "Held", "Held", "Held", "Held"]);
        const first = log.data.rows[4];
        assert.deepEqual([first.date, first.time, first.batch, first.trainer, first.minutes, first.expected, first.present], ["2026-11-20", "10:00", "AN Batch A1", "an-trainer1", 60, 2, 1]);
        assert.deepEqual([log.data.rows[0].expected, log.data.rows[0].present], [null, null], "a class with no marks shows no attendance");
        assert.equal(log.data.rows[2].minutes, 90);
        assert.deepEqual(log.summary.map((card) => card.value), ["6", "5", "1", "0"]);
        assert.deepEqual(column(await run("trainer", "session-log", { status: "Cancelled" }), "class"), ["Gita class 4"]);
        assert.deepEqual(column(await run("trainer", "session-log", { to: "2026-12-10", status: "Upcoming" }), "class"), ["Gita class 5"]);
    });

    test("module progress and inactive learners", async () => {
        const modules = await run("batch-progress", "module-progress");
        assert.deepEqual(column(modules, "module"), ["AN Module One", "AN Module Two"]);
        const [one, two] = modules.data.rows;
        assert.deepEqual([one.lessons, one.learners, one.lessonsCompleted, one.progress], [2, 4, 2, 25], "learners counted once for each course that has the module");
        assert.deepEqual([two.lessons, two.learners, two.lessonsCompleted, two.progress], [1, 2, 1, 50]);
        assert.deepEqual(modules.summary.map((card) => card.value), ["2", "3", "3", "30%"]);
        const sanskrit = await run("batch-progress", "module-progress", { course: courseB.id });
        assert.deepEqual(column(sanskrit, "module"), ["AN Module One"]);
        assert.deepEqual([sanskrit.data.rows[0].learners, sanskrit.data.rows[0].progress], [2, 25]);

        const inactive = await run("batch-progress", "inactive-learners");
        assert.deepEqual(column(inactive, "learner"), ["Dev", "Chitra"], "the longest away first; a learner who finished everything is not checked");
        assert.deepEqual(inactive.data.rows.map((row) => [row.lastActivity, row.inactiveDays]), [["2026-10-16", 46], ["Never", 42]], "the later of the last sign-in and the last lesson; never active counts from the enrolment");
        assert.deepEqual(inactive.summary.map((card) => card.value), ["4", "2", "1", "46 days"]);
        assert.deepEqual(inactive.data.chart?.values, [0, 2, 0, 0]);
        assert.deepEqual(column(await run("batch-progress", "inactive-learners", { branch: main.id }), "learner"), [], "Asha signed in yesterday");
        assert.equal((await run("batch-progress", "inactive-learners", { branch: main.id })).data.chart, null);
    });

    test("enrolments by day and by course, lead sources, branch statistics and storage", async () => {
        const days = await run("sales-enrollment", "product-enrollments", { pageSize: 100 });
        assert.equal(days.data.rows.length, 31, "every day of the period, also the quiet ones");
        const byDate = new Map(days.data.rows.map((row) => [String(row.date), row]));
        assert.deepEqual([byDate.get("2026-11-05")?.enrolments, byDate.get("2026-11-06")?.enrolments, byDate.get("2026-11-06")?.paid, byDate.get("2026-11-02")?.newLearners, byDate.get("2026-11-04")?.enrolments], [1, 1, 1, 1, 0]);
        assert.deepEqual(days.summary.map((card) => card.value), ["4", "3", "1", "05 Nov 2026"], "a cancelled enrolment and ones before the period are left out");
        assert.equal(days.data.chart?.labels.length, 31);
        const mainOnly = await run("sales-enrollment", "product-enrollments", { branch: main.id });
        assert.deepEqual(mainOnly.summary.map((card) => card.value).slice(0, 3), ["2", "2", "1"]);
        const course = await run("sales-enrollment", "product-enrollments", { course: courseA.id });
        assert.deepEqual([course.summary[0].value, course.summary[1].value, course.data.rows[0].newLearners], ["\u2014", "2", null], "learners are not tied to a course");
        const year = await run("sales-enrollment", "product-enrollments", { from: "2026-01-01", to: "2026-12-01" });
        assert.equal(year.data.chart?.labels.length, 48, "a long period is charted by the week");

        const courses = await run("sales-enrollment", "course-enrollments");
        assert.deepEqual(column(courses, "course"), ["AN Gita", "AN Sanskrit"]);
        assert.deepEqual(courses.data.rows.map((row) => [row.newEnrolments, row.active, row.completed, row.total]), [[2, 2, 1, 3], [1, 2, 0, 2]]);
        assert.deepEqual(courses.data.rows.map((row) => row.category), ["AN Category", "AN Category"]);
        assert.deepEqual(courses.data.rows.length === 2 && (await run("sales-enrollment", "course-enrollments", { branch: north.id })).data.rows.map((row) => [row.course, row.active]), [["AN Gita", 1], ["AN Sanskrit", 1]]);

        const leads = await run("marketing-analytics", "lead-sources");
        assert.deepEqual(column(leads, "source"), ["Contact form", "Bulk book enquiry", "Manual entry", "Campaign", "Event"]);
        assert.deepEqual(leads.data.rows.map((row) => [row.enquiries, row.converted, row.conversion]), [[3, 1, 33], [2, 0, 0], [1, 1, 100], [0, 0, null], [0, 0, null]]);
        assert.deepEqual(leads.summary.map((card) => card.value), ["6", "2", "33%", "Contact form"], "a lead from before the period is not counted");
        assert.deepEqual((await run("marketing-analytics", "lead-sources", { branch: north.id })).data.rows[0].enquiries, 3, "a filter the report does not have is ignored");

        const branches = (await run("more", "branch-statistics")).data.rows.filter((row) => String(row.branch).startsWith("AN "));
        assert.deepEqual(branches.map((row) => [row.branch, row.city, row.registrations, row.enrolments, row.activeBatches]), [["AN Main", "Vrindavan", 2, 2, 1], ["AN North", null, 1, 0, 1]]);
        assert.deepEqual((await run("more", "branch-statistics", {}, scoped)).data.rows.map((row) => row.branch), ["AN Main"]);

        const storage = await run("more", "storage-consumption");
        assert.deepEqual(storage.data.rows.map((row) => [row.type, row.files, row.size, row.added, row.addedSize]), [["PDF", 1, 3, 0, 0], ["Image", 2, 3, 2, 3]], "equal files count once; staged uploads and links are not stored files");
        assert.deepEqual(storage.summary.map((card) => card.value), ["3", "6 MB", "2", "3 MB"]);
        assert.deepEqual((await run("more", "storage-consumption", { from: "2026-11-15", to: "2026-11-30" })).summary.map((card) => card.value).slice(2), ["1", "2 MB"]);
    });

    test("the engine: unknown and waiting reports, checked periods, search, order and pages, the CSV and who may open it", async () => {
        await assert.rejects(run("sales-enrollment", "nope"), errors.NotFound);
        await assert.rejects(run("nope", "batch-progress"), errors.NotFound);
        await assert.rejects(run("feedback-rating", "course-ratings"), errors.NotFound, "a page that is still sample data has no reports here");
        await assert.rejects(run("sales-enrollment", "sales-overview"), (error: unknown) => error instanceof errors.BusinessRule && /Payments \(phase B5\)/.test(error.message));
        const field = (name: string) => (error: unknown) => error instanceof errors.ValidationError && Boolean(error.fields?.[name]);
        await assert.rejects(run("sales-enrollment", "course-enrollments", { from: "2026-13-01" }), field("from"));
        await assert.rejects(run("sales-enrollment", "course-enrollments", { to: "2026-02-30" }), field("to"));
        await assert.rejects(run("sales-enrollment", "course-enrollments", { from: "2026-12-02", to: "2026-12-01" }), field("to"));
        await assert.rejects(run("sales-enrollment", "course-enrollments", { from: "2025-11-30", to: "2026-12-01" }), field("to"), "more than 366 days");
        await assert.rejects(run("batch-progress", "batch-progress", { status: "Nope" }), field("status"));
        assert.equal((await run("batch-progress", "batch-progress", { from: "garbage", to: "also garbage" })).total, 4, "a report with no period ignores it");

        assert.deepEqual(column(await run("sales-enrollment", "course-enrollments", { q: "SANSKRIT" }), "course"), ["AN Sanskrit"], "search is not case sensitive");
        assert.deepEqual(column(await run("sales-enrollment", "course-enrollments", { sort: "course", dir: "asc" }), "course"), ["AN Gita", "AN Sanskrit"]);
        assert.deepEqual(column(await run("sales-enrollment", "course-enrollments", { sort: "course", dir: "desc" }), "course"), ["AN Sanskrit", "AN Gita"]);
        assert.deepEqual(column(await run("sales-enrollment", "course-enrollments", { sort: "nonsense" }), "course"), ["AN Gita", "AN Sanskrit"], "an unknown column falls back to the report's order");
        const withNulls = await run("batch-progress", "batch-progress", { sort: "branch", dir: "asc" });
        assert.equal(withNulls.data.rows.at(-1)?.branch, null, "empty values come last");
        const paged = await run("batch-progress", "batch-progress", { pageSize: 3 });
        assert.deepEqual([paged.total, paged.page, paged.data.rows.length], [4, 1, 3]);
        const second = await run("batch-progress", "batch-progress", { pageSize: 3, page: 2 });
        assert.deepEqual([second.page, second.data.rows.length], [2, 1]);
        assert.equal((await run("batch-progress", "batch-progress", { pageSize: 3, page: 9 })).page, 2, "a page past the end gives the last one");
        assert.equal((await run("batch-progress", "batch-progress", { pageSize: 500 })).pageSize, 100);

        const file = await analytics.exportReport("marketing-analytics", "lead-sources", period, admin, now);
        assert.equal(file.filename, "lead-sources_2026-11-01_2026-12-01.csv");
        assert.deepEqual(file.headers, ["Source", "Enquiries", "Converted", "Conversion (%)"]);
        assert.equal(file.count, 5);
        assert.deepEqual(file.rows[0], ["Contact form", 3, 1, 33]);
        const snapshot = await analytics.exportReport("batch-progress", "batch-progress", { pageSize: 1, q: "A1" }, admin, now);
        assert.deepEqual([snapshot.filename, snapshot.count], ["batch-progress.csv", 1], "a CSV holds every matching row, however the screen pages them");
        assert.deepEqual((await analytics.exportReport("more", "storage-consumption", period, admin, now)).headers.slice(2, 3), ["Stored size (MB)"]);

        const options = await analytics.reportFilterOptions(admin);
        assert.ok(options.branches.some((branch) => branch.label === "AN Main") && options.branches.some((branch) => branch.label === "AN North"));
        assert.ok(options.courses.some((course) => course.label === "AN Gita"));
        assert.deepEqual((await analytics.reportFilterOptions(scoped)).branches.map((branch) => branch.label), ["AN Main"], "a branch-bound administrator is offered only their branch");

        for (const role of ["SUPER_ADMIN", "ADMIN", "FINANCE"] as const) assert.ok(permissions.can(role, "reports:read"), role);
        for (const role of ["INSTRUCTOR", "CONTENT_EDITOR", "SUPPORT"] as const) assert.equal(permissions.can(role, "reports:read"), false, role);
        assert.ok(permissions.can("ADMIN", "reports:export") && permissions.can("FINANCE", "reports:export"));
    });
});
