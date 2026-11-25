import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, mock, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

type SessionUser = import("@/server/auth/session").SessionUser;

describe("B4 batches, enrolments, sessions and announcements (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let registration: typeof import("@/server/services/registration");
    let enrolments: typeof import("@/server/services/enrolments");
    let sessions: typeof import("@/server/services/sessions");
    let learning: typeof import("@/server/services/learner-learning");
    let resources: typeof import("@/server/admin/resources");
    let ist: typeof import("@/lib/ist");
    let errors: typeof import("@/server/http/errors");

    let admin: SessionUser;
    let teacher: SessionUser;
    let scoped: SessionUser;
    let punePune: { id: string; name: string };
    let mumbai: { id: string; name: string };
    let courseA: { id: string; title: string };
    let courseB: { id: string; title: string };
    let today: string;

    const ctx = (user: SessionUser) => ({ user, ip: "127.0.0.1" });
    const actor = (user: SessionUser) => ({ id: user.id, ip: "127.0.0.1", role: user.role, branchIds: user.branchIds });
    const listQuery = { q: "", filters: {}, page: 1, pageSize: 25, skip: 0, take: 25 };
    const batches = () => resources.getResource("learning/batches");
    const learners = () => resources.getResource("users/learners");
    const notices = () => resources.getResource("learning/announcements");
    const quiet = () => mock.method(console, "info", () => undefined);
    const emailsSent = (spy: ReturnType<typeof mock.method>) => spy.mock.calls.map((call) => String(call.arguments[0]));

    async function createStaff(email: string, role: SessionUser["role"], branchIds: string[] = []): Promise<SessionUser> {
        const user = await prisma.user.create({ data: { email, kind: "STAFF", role, emailVerifiedAt: new Date(), staffProfile: { create: { displayName: email.split("@")[0] } } } });
        for (const branchId of branchIds) await prisma.userBranch.create({ data: { userId: user.id, branchId } });
        return { id: user.id, email, name: email, role, kind: "STAFF", branchIds };
    }

    async function createLearner(email: string, name = "Asha Rao", branchId?: string) {
        const user = await prisma.$transaction(async (tx) =>
            tx.user.create({
                data: { email, kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), learnerProfile: { create: { name, branchId, registrationNo: await registration.nextRegistrationNo(tx) } } },
            }),
        );
        return { id: user.id, email, name, role: "LEARNER", kind: "LEARNER", branchIds: [] } as SessionUser;
    }

    const batchInput = (over: Record<string, unknown> = {}) => ({
        name: "B4 Batch A",
        course: courseA.title,
        startDate: ist.addDays(today, -30),
        endDate: ist.addDays(today, 200),
        instructor: "b4-teacher",
        manager: "b4-admin",
        additionalManagers: [],
        branch: punePune.name,
        status: "Active",
        ...over,
    });

    async function makeBatch(over: Record<string, unknown> = {}, user: SessionUser = admin) {
        const row = await batches().create!(batchInput(over), ctx(user));
        return String(row.id);
    }

    async function wipe() {
        await prisma.announcement.deleteMany();
        await prisma.holiday.deleteMany();
        await prisma.session.deleteMany();
        await prisma.enrolment.deleteMany();
        await prisma.batch.deleteMany();
        await prisma.auditEvent.deleteMany();
        await prisma.counter.deleteMany();
        await prisma.user.deleteMany({ where: { email: { startsWith: "b4." }, kind: "LEARNER" } });
    }

    before(async () => {
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        registration = await import("@/server/services/registration");
        enrolments = await import("@/server/services/enrolments");
        sessions = await import("@/server/services/sessions");
        learning = await import("@/server/services/learner-learning");
        resources = await import("@/server/admin/resources");
        ist = await import("@/lib/ist");
        errors = await import("@/server/http/errors");
        today = ist.istToday();

        await prisma.user.deleteMany({ where: { email: { startsWith: "b4" } } });
        await prisma.branch.deleteMany({ where: { name: { startsWith: "B4 " } } });
        await prisma.course.deleteMany({ where: { slug: { startsWith: "b4-" } } });
        await prisma.category.deleteMany({ where: { slug: "b4-cat" } });
        punePune = await prisma.branch.create({ data: { name: "B4 Pune" } });
        mumbai = await prisma.branch.create({ data: { name: "B4 Mumbai" } });
        const category = await prisma.category.create({ data: { slug: "b4-cat", title: "B4 Category", description: "Test category", status: "PUBLISHED" } });
        courseA = await prisma.course.create({ data: { slug: "b4-gita", title: "B4 Gita Course", summary: "A test course.", categoryId: category.id, officialUrl: "https://example.org/gita", status: "PUBLISHED" } });
        courseB = await prisma.course.create({ data: { slug: "b4-sanskrit", title: "B4 Sanskrit Course", summary: "Another test course.", categoryId: category.id, officialUrl: "https://example.org/sanskrit", status: "PUBLISHED" } });
        admin = await createStaff("b4-admin@ibmv.test", "ADMIN");
        teacher = await createStaff("b4-teacher@ibmv.test", "INSTRUCTOR");
        await createStaff("b4-support@ibmv.test", "SUPPORT");
        scoped = await createStaff("b4-scoped@ibmv.test", "SUPPORT", [punePune.id]);
    });

    beforeEach(wipe);

    after(async () => {
        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "b4" } } });
        await prisma.branch.deleteMany({ where: { name: { startsWith: "B4 " } } });
        await prisma.course.deleteMany({ where: { slug: { startsWith: "b4-" } } });
        await prisma.category.deleteMany({ where: { slug: "b4-cat" } });
        await prisma.$disconnect();
    });

    test("IST helpers convert both ways and find day boundaries", () => {
        const start = ist.fromIst("2026-11-25", "19:00");
        assert.equal(start.toISOString(), "2026-11-25T13:30:00.000Z");
        assert.deepEqual(ist.toIst(start), { date: "2026-11-25", time: "19:00" });
        assert.deepEqual(ist.toIst(new Date("2026-11-25T19:00:00Z")), { date: "2026-11-26", time: "00:30" }, "after 18:30 UTC it is already tomorrow in India");
        assert.equal(ist.istDayRange("2026-11-25").start.toISOString(), "2026-11-24T18:30:00.000Z");
        assert.equal(ist.addDays("2026-02-27", 2), "2026-03-01");
    });

    test("batches: validated, role-checked, listed with tabs, and managed by branch", async () => {
        const id = await makeBatch();
        const row = await batches().get!(id, ctx(admin));
        assert.equal(row.instructor, "b4-teacher");
        assert.equal(row.manager, "b4-admin");
        assert.equal(row.branch, punePune.name);
        assert.equal(row.learners, 0);

        await assert.rejects(makeBatch({ name: "B4 Batch A" }), errors.Conflict, "batch names are unique");
        await assert.rejects(makeBatch({ name: "B4 Bad Dates", endDate: ist.addDays(today, -30) }), errors.ValidationError, "end after start");
        await assert.rejects(makeBatch({ name: "B4 No Course", course: "Not a course" }), errors.ValidationError);
        await assert.rejects(makeBatch({ name: "B4 Support Teaches", instructor: "b4-support" }), errors.ValidationError, "only teaching roles can be instructors");
        await assert.rejects(makeBatch({ name: "B4 Unknown Manager", manager: "nobody" }), errors.ValidationError);
        await assert.rejects(makeBatch({ name: "B4 Bad Branch", branch: "Nowhere" }), errors.ValidationError);
        await assert.rejects(makeBatch({ name: "B4 Bad Status", status: "Frozen" }), errors.ValidationError);

        const other = await makeBatch({ name: "B4 Batch B", course: courseB.title, additionalManagers: ["b4-support", "b4-admin"], branch: mumbai.name, status: "Completed" });
        assert.deepEqual((await batches().get!(other, ctx(admin))).additionalManagers, ["b4-support"], "the primary manager is not repeated as an extra manager");

        const active = await batches().list({ ...listQuery, tab: "Active" }, ctx(admin));
        assert.deepEqual(active.rows.map((r) => r.name), ["B4 Batch A"]);
        assert.deepEqual(active.tabCounts, { Active: 1, Completed: 1, Archived: 0 });
        assert.deepEqual((await batches().list({ ...listQuery, filters: { course: courseB.title } }, ctx(admin))).rows.map((r) => r.name), ["B4 Batch B"]);
        assert.deepEqual((await batches().list({ ...listQuery, q: "gita" }, ctx(admin))).rows.map((r) => r.name), ["B4 Batch A"], "search covers the course title");
        assert.deepEqual((await batches().list({ ...listQuery, sort: { key: "name", dir: "desc" } }, ctx(admin))).rows.map((r) => r.name), ["B4 Batch B", "B4 Batch A"]);

        // Completing, reopening and archiving are audited; duplicating keeps the setup but starts active.
        await batches().update!(id, batchInput({ status: "Completed" }), ctx(admin));
        await batches().update!(id, batchInput({ status: "Active" }), ctx(admin));
        const copy = await batches().actions!.duplicate(id, ctx(admin));
        assert.equal(copy.name, "B4 Batch A (copy)");
        await batches().actions!.archive(String(copy.id), ctx(admin));
        assert.deepEqual((await prisma.auditEvent.findMany({ where: { entity: "Batch" } })).map((e) => e.action).sort(), [
            "batch.archive", "batch.complete", "batch.create", "batch.create", "batch.create", "batch.reopen",
        ]);

        // Branch-scoped staff see their own branch and branch-less batches, and edit only their own.
        const online = await makeBatch({ name: "B4 Online", branch: "" });
        assert.deepEqual((await batches().list({ ...listQuery, tab: undefined }, ctx(scoped))).rows.map((r) => r.name).sort(), ["B4 Batch A", "B4 Batch A (copy)", "B4 Online"]);
        await assert.rejects(batches().get!(other, ctx(scoped)), errors.NotFound, "another branch looks absent");
        await assert.rejects(batches().update!(online, batchInput({ name: "B4 Online", branch: "" }), ctx(scoped)), errors.Forbidden, "branch-less batches are read-only for scoped staff");
        const mine = await batches().update!(id, batchInput({ name: "B4 Batch A2" }), ctx(scoped));
        assert.equal(mine.name, "B4 Batch A2");
        await assert.rejects(batches().update!(id, batchInput({ name: "B4 Batch A2", branch: mumbai.name }), ctx(scoped)), errors.Forbidden);

        const options = await batches().options!();
        assert.ok(options.course.includes(courseA.title));
        assert.ok(options.instructor.includes("b4-teacher") && !options.instructor.includes("b4-support"));
        assert.ok(options.manager.includes("b4-support"));
    });

    test("enrolments: existing and new learners, skips, refusals, dry runs and branch limits", async () => {
        const batchId = await makeBatch();
        const asha = await createLearner("b4.asha@example.com", "Asha Rao", punePune.id);
        const spy = quiet();
        try {
            const dry = await enrolments.enrolByEmail({ email: "B4.Asha@Example.com", batchId, source: "ADMIN", commit: false }, actor(admin));
            assert.equal(dry.status, "ready");
            assert.equal(await prisma.enrolment.count(), 0, "a dry run writes nothing");

            const first = await enrolments.enrolByEmail({ email: "b4.asha@example.com", batchId, source: "ADMIN", commit: true }, actor(admin));
            assert.equal(first.status, "enrolled");
            const again = await enrolments.enrolByEmail({ email: "b4.asha@example.com", batchId, source: "ADMIN", commit: true }, actor(admin));
            assert.equal(again.status, "skipped", "never enrolled twice");
            assert.match(again.message, /Already enrolled/);
            const otherBatch = await makeBatch({ name: "B4 Batch A later" });
            assert.equal((await enrolments.enrolByEmail({ email: "b4.asha@example.com", batchId: otherBatch, source: "ADMIN", commit: true }, actor(admin))).status, "skipped", "one active enrolment per course");
            assert.equal(await prisma.enrolment.count(), 1);

            await assert.rejects(enrolments.enrolByEmail({ email: "b4.new@example.com", batchId, source: "ADMIN", commit: true }, actor(admin)), (e: InstanceType<typeof errors.ValidationError>) => e instanceof errors.ValidationError && Boolean(e.fields?.name), "a new address needs a name");
            const created = await enrolments.enrolByEmail({ email: "b4.new@example.com", name: "New Person", phone: "+91 90000 00000", batchId, source: "ADMIN", commit: true }, actor(admin));
            assert.equal(created.newAccount, true);
            assert.ok(emailsSent(spy).some((line) => line.includes("to=b4.new@example.com") && line.includes("Set up your IBMV account")));
            const stored = await prisma.user.findUniqueOrThrow({ where: { email: "b4.new@example.com" }, include: { learnerProfile: true } });
            assert.match(stored.learnerProfile?.registrationNo ?? "", /^IBMV\/\d{2}\/\d{5}$/);
            assert.equal(stored.learnerProfile?.branchId, punePune.id, "a new learner joins the batch's branch");
            assert.equal(stored.passwordHash, null);

            await assert.rejects(enrolments.enrolByEmail({ email: "b4-admin@ibmv.test", batchId, source: "ADMIN", commit: true }, actor(admin)), errors.BusinessRule, "staff accounts are not learners");
            await assert.rejects(enrolments.enrolByEmail({ email: "nope", batchId, source: "ADMIN", commit: true }, actor(admin)), errors.ValidationError);
            await assert.rejects(enrolments.enrolByEmail({ email: "b4.asha@example.com", batchId: "missing", source: "ADMIN", commit: true }, actor(admin)), errors.ValidationError);

            const done = await makeBatch({ name: "B4 Finished", status: "Completed", course: courseB.title });
            await assert.rejects(enrolments.enrolByEmail({ email: "b4.asha@example.com", batchId: done, source: "ADMIN", commit: true }, actor(admin)), errors.BusinessRule, "completed batches take no enrolments");

            await prisma.learnerProfile.update({ where: { userId: asha.id }, data: { status: "ARCHIVED" } });
            const sanskrit = await makeBatch({ name: "B4 Sanskrit A", course: courseB.title });
            await assert.rejects(enrolments.enrolByEmail({ email: "b4.asha@example.com", batchId: sanskrit, source: "ADMIN", commit: true }, actor(admin)), errors.BusinessRule, "archived learners are not enrolled");
            await prisma.learnerProfile.update({ where: { userId: asha.id }, data: { status: "REGISTERED" } });

            // Branch limits: a scoped member cannot enrol learners of, or into, another branch.
            const mumbaiBatch = await makeBatch({ name: "B4 Mumbai Batch", course: courseB.title, branch: mumbai.name });
            await assert.rejects(enrolments.enrolByEmail({ email: "b4.asha@example.com", batchId: mumbaiBatch, source: "ADMIN", commit: true }, actor(scoped)), errors.BusinessRule);
            await createLearner("b4.mumbai@example.com", "Mumbai Learner", mumbai.id);
            await assert.rejects(enrolments.enrolByEmail({ email: "b4.mumbai@example.com", batchId: sanskrit, source: "ADMIN", commit: true }, actor(scoped)), errors.BusinessRule);
        } finally {
            spy.mock.restore();
        }
        assert.deepEqual((await prisma.auditEvent.findMany({ where: { entity: "Enrolment" } })).map((e) => e.action), ["enrolment.create", "enrolment.create"]);
    });

    test("enrolments: lists and CSV files report every row, never stop at a bad one, and write only on commit", async () => {
        const batchId = await makeBatch();
        await makeBatch({ name: "B4 Batch B", course: courseB.title });
        await createLearner("b4.known@example.com", "Known Learner");
        const spy = quiet();
        try {
            const list = enrolments.parseEmailList("b4.known@example.com, B4.NEW.PERSON@example.com\nnot-an-email; b4.known@example.com");
            assert.equal(list.length, 4);
            const checked = await enrolments.enrolRows(list, { commit: false, source: "BULK", fixedBatchId: batchId, deriveNames: true }, actor(admin));
            assert.deepEqual(checked.map((r) => r.status), ["ready", "ready", "error", "error"]);
            assert.equal(checked[1].name, "B New Person", "names come from the address (digits dropped) when none is given");
            assert.equal(checked[2].message, "Enter a valid email address.");
            assert.equal(checked[3].message, "Duplicate in this list.");
            assert.equal(await prisma.enrolment.count(), 0);

            const done = await enrolments.enrolRows(list, { commit: true, source: "BULK", fixedBatchId: batchId, deriveNames: true }, actor(admin));
            assert.deepEqual(done.map((r) => r.status), ["enrolled", "enrolled", "error", "error"]);
            assert.equal(done[1].newAccount, true);
            assert.equal(await prisma.enrolment.count({ where: { source: "BULK" } }), 2);

            const file = enrolments.parseEnrolmentFile("email,name,batch\nb4.new.person@example.com,,B4 Batch B\nb4.third@example.com,Third Person,B4 Batch B\nb4.fourth@example.com,,B4 Batch B\nb4.fifth@example.com,Fifth,Unknown Batch\nb4.known@example.com,,b4 batch b\n");
            const results = await enrolments.enrolRows(file, { commit: true, source: "BULK", deriveNames: false }, actor(admin));
            assert.deepEqual(results.map((r) => r.status), ["enrolled", "enrolled", "error", "error", "enrolled"]);
            assert.match(results[2].message, /Name needed/, "a new learner in a file needs a name");
            assert.match(results[3].message, /Unknown or inactive batch/);
            assert.equal(results[4].batch, "B4 Batch B", "batch names match without regard to case");
            await assert.rejects(async () => enrolments.parseEnrolmentFile("name,batch\nx,y"), errors.ValidationError);
            await assert.rejects(async () => enrolments.parseEmailList("   "), errors.ValidationError);
        } finally {
            spy.mock.restore();
        }
        const options = await enrolments.listEnrolBatches(actor(admin));
        assert.deepEqual(options.map((o) => o.name).sort(), ["B4 Batch A", "B4 Batch B"]);
        assert.equal(options.find((o) => o.name === "B4 Batch B")?.course, courseB.title);
    });

    test("learners: status is worked out from enrolments and can be filtered by course and batch", async () => {
        const batchId = await makeBatch();
        const asha = await createLearner("b4.asha@example.com");
        const ravi = await createLearner("b4.ravi@example.com", "Ravi Kumar");
        await createLearner("b4.gita@example.com", "Gita Devi");
        await enrolments.enrolByEmail({ email: asha.email, batchId, source: "ADMIN", commit: true }, actor(admin));
        await enrolments.enrolByEmail({ email: ravi.email, batchId, source: "ADMIN", commit: true }, actor(admin));
        await prisma.enrolment.updateMany({ where: { userId: ravi.id }, data: { status: "COMPLETED" } });

        const all = await learners().list(listQuery, ctx(admin));
        const status = Object.fromEntries(all.rows.map((r) => [r.name, r.status]));
        assert.deepEqual(status, { "Asha Rao": "Enrolled", "Ravi Kumar": "Completed", "Gita Devi": "Registered" });
        assert.deepEqual(all.tabCounts, { Registered: 1, Enrolled: 1, Completed: 1, "On leave": 0, Archived: 0 });
        assert.deepEqual((await learners().list({ ...listQuery, tab: "Enrolled" }, ctx(admin))).rows.map((r) => r.name), ["Asha Rao"]);
        assert.deepEqual((await learners().list({ ...listQuery, tab: "Completed" }, ctx(admin))).rows.map((r) => r.name), ["Ravi Kumar"]);
        assert.deepEqual((await learners().list({ ...listQuery, tab: "Registered" }, ctx(admin))).rows.map((r) => r.name), ["Gita Devi"]);
        assert.deepEqual((await learners().list({ ...listQuery, filters: { course: courseA.title } }, ctx(admin))).rows.map((r) => r.name).sort(), ["Asha Rao", "Ravi Kumar"]);
        assert.deepEqual((await learners().list({ ...listQuery, filters: { batch: "B4 Batch A" } }, ctx(admin))).rows.map((r) => r.name).sort(), ["Asha Rao", "Ravi Kumar"]);
        assert.equal((await learners().list({ ...listQuery, filters: { course: courseB.title } }, ctx(admin))).total, 0);
        assert.equal(all.rows.find((r) => r.name === "Asha Rao")?.batch, "B4 Batch A");

        // A manual state wins over enrolments, and an enrolled learner keeps their enrolments when put on leave.
        await learners().update!(asha.id, { standing: "On leave" }, ctx(admin));
        assert.equal((await learners().get!(asha.id, ctx(admin))).status, "On leave");
        assert.equal((await learners().get!(asha.id, ctx(admin))).standing, "On leave");
        const options = await learners().options!();
        assert.deepEqual(options.course, [courseA.title], "course choices are the ones with enrolments");
        assert.deepEqual(options.batch, ["B4 Batch A"]);
    });

    test("sessions: scheduled, repeated, rescheduled and cancelled with clash and holiday rules", async () => {
        const batchId = await makeBatch();
        const day = ist.addDays(today, 3);

        const single = await sessions.createSessions({ batchId, title: "Gita - Class 1", date: day, time: "19:00", durationMin: 60, link: "https://example.org/live", topics: "Chapter 1" }, actor(teacher));
        assert.equal(single.created.length, 1);
        const first = single.created[0];
        assert.deepEqual([first.date, first.time, first.durationMin, first.status, first.instructor], [day, "19:00", 60, "Scheduled", "b4-teacher"]);
        assert.equal(first.link, "https://example.org/live");

        await assert.rejects(sessions.createSessions({ batchId, title: "Clash", date: day, time: "19:30", durationMin: 60 }, actor(teacher)), errors.Conflict, "the same instructor cannot teach two at once");
        assert.equal((await sessions.createSessions({ batchId, title: "Back to back", date: day, time: "20:00", durationMin: 30 }, actor(teacher))).created.length, 1, "touching sessions are fine");
        await assert.rejects(sessions.createSessions({ batchId, title: "Too early", date: ist.addDays(today, -60), time: "10:00", durationMin: 60 }, actor(teacher)), errors.ValidationError, "inside the batch dates");
        await assert.rejects(sessions.createSessions({ batchId, title: "Bad time", date: day, time: "25:00", durationMin: 60 }, actor(teacher)), errors.ValidationError);
        await assert.rejects(sessions.createSessions({ batchId, title: "Bad link", date: day, time: "09:00", durationMin: 60, link: "javascript:alert(1)" }, actor(teacher)), errors.ValidationError);
        await assert.rejects(sessions.createSessions({ batchId, title: "Too short", date: day, time: "09:00", durationMin: 5 }, actor(teacher)), errors.ValidationError);

        // A weekly series stops at the batch end and skips holidays.
        const holidayDay = ist.addDays(day, 14);
        await sessions.markHoliday({ date: holidayDay, reason: "Festival", branch: punePune.name }, actor(admin));
        const series = await sessions.createSessions({ batchId, title: "Weekly class", date: ist.addDays(day, 1), time: "10:00", durationMin: 45, repeatWeeks: 3 }, actor(teacher));
        assert.equal(series.created.length, 4);
        assert.deepEqual(series.created.map((s) => s.date), [1, 8, 15, 22].map((n) => ist.addDays(day, n)));
        const onHoliday = await sessions.createSessions({ batchId, title: "Holiday skipper", date: ist.addDays(holidayDay, -7), time: "08:00", durationMin: 30, repeatWeeks: 2 }, actor(teacher));
        assert.deepEqual(onHoliday.skippedHolidays, [holidayDay]);
        assert.equal(onHoliday.created.length, 2);
        await assert.rejects(sessions.createSessions({ batchId, title: "On the holiday", date: holidayDay, time: "11:00", durationMin: 30 }, actor(teacher)), errors.BusinessRule);

        // Rescheduling keeps the clash check; cancelling needs a reason and is final.
        const moved = await sessions.updateSession(first.id, { date: ist.addDays(day, 2), time: "18:00", title: "Gita - Class 1 (moved)" }, actor(teacher));
        assert.deepEqual([moved.date, moved.time, moved.title], [ist.addDays(day, 2), "18:00", "Gita - Class 1 (moved)"]);
        assert.equal(moved.durationMin, 60, "unchanged fields stay");
        await assert.rejects(sessions.updateSession(first.id, { date: ist.addDays(day, 1), time: "10:15" }, actor(teacher)), errors.Conflict);
        await assert.rejects(sessions.cancelSession(first.id, { reason: "x" }, actor(teacher)), errors.ValidationError);
        const cancelled = await sessions.cancelSession(first.id, { reason: "Teacher unwell" }, actor(teacher));
        assert.deepEqual([cancelled.status, cancelled.cancelReason], ["Cancelled", "Teacher unwell"]);
        await assert.rejects(sessions.cancelSession(first.id, { reason: "Again" }, actor(teacher)), errors.BusinessRule);
        await assert.rejects(sessions.updateSession(first.id, { title: "Edited after cancel" }, actor(teacher)), errors.BusinessRule);
        // A cancelled slot is free again.
        assert.equal((await sessions.createSessions({ batchId, title: "Replacement", date: ist.addDays(day, 2), time: "18:00", durationMin: 60 }, actor(teacher))).created.length, 1);

        const listed = await sessions.listSessions({ from: day, to: ist.addDays(day, 30) }, actor(admin));
        assert.ok(listed.sessions.length >= 8);
        assert.deepEqual(listed.holidays.map((h) => [h.date, h.reason, h.branch]), [[holidayDay, "Festival", punePune.name]]);
        assert.deepEqual((await sessions.listSessions({ from: day, to: day, batchId: "other" }, actor(admin))).sessions, []);
        await assert.rejects(sessions.listSessions({ from: day, to: ist.addDays(day, 400) }, actor(admin)), errors.ValidationError, "ranges are capped");
        await assert.rejects(sessions.listSessions({ from: "2026-13-01", to: day }, actor(admin)), errors.ValidationError);
    });

    test("sessions: holidays cancel only the affected branch, and branch-scoped staff stay inside theirs", async () => {
        const puneBatch = await makeBatch({ name: "B4 Pune Batch" });
        const mumbaiBatch = await makeBatch({ name: "B4 Mumbai Batch", branch: mumbai.name, instructor: "b4-admin" });
        const day = ist.addDays(today, 5);
        await sessions.createSessions({ batchId: puneBatch, title: "Pune class", date: day, time: "09:00", durationMin: 60 }, actor(admin));
        await sessions.createSessions({ batchId: mumbaiBatch, title: "Mumbai class", date: day, time: "09:00", durationMin: 60 }, actor(admin));

        await assert.rejects(sessions.markHoliday({ date: day, reason: "Local festival" }, actor(scoped)), errors.ValidationError, "a branch member must name their branch");
        await assert.rejects(sessions.markHoliday({ date: day, reason: "Not mine", branch: mumbai.name }, actor(scoped)), errors.Forbidden);
        const local = await sessions.markHoliday({ date: day, reason: "Local festival", branch: punePune.name }, actor(scoped));
        assert.equal(local.cancelled, 1);
        await assert.rejects(sessions.markHoliday({ date: day, reason: "Again", branch: punePune.name }, actor(admin)), errors.Conflict);

        const view = await sessions.listSessions({ from: day, to: day }, actor(admin));
        assert.deepEqual(view.sessions.map((s) => [s.title, s.status]).sort(), [["Mumbai class", "Scheduled"], ["Pune class", "Cancelled"]]);
        assert.equal(view.sessions.find((s) => s.title === "Pune class")?.cancelReason, "Holiday: Local festival");

        const everywhere = await sessions.markHoliday({ date: day, reason: "National day" }, actor(admin));
        assert.equal(everywhere.cancelled, 1, "the remaining scheduled session is cancelled too");
        assert.equal((await sessions.listSessions({ from: day, to: day }, actor(scoped))).sessions.length, 1, "scoped staff see only their branch's sessions");
        assert.equal((await sessions.listSessions({ from: day, to: day }, actor(scoped))).holidays.length, 2, "and the holidays that apply to them");
        await sessions.removeHoliday(local.holiday.id, actor(scoped));
        await assert.rejects(sessions.removeHoliday(everywhere.holiday.id, actor(scoped)), errors.NotFound, "scoped staff cannot remove a holiday that is not theirs");
        await assert.rejects(sessions.getSessionDetail((await sessions.listSessions({ from: day, to: day }, actor(admin))).sessions.find((s) => s.title === "Mumbai class")!.id, actor(scoped)), errors.NotFound);
    });

    test("sessions: attendance covers enrolled learners once the session has started", async () => {
        const batchId = await makeBatch();
        const asha = await createLearner("b4.asha@example.com");
        const ravi = await createLearner("b4.ravi@example.com", "Ravi Kumar");
        const stranger = await createLearner("b4.stranger@example.com", "Stranger");
        const spy = quiet();
        try {
            for (const learner of [asha, ravi]) await enrolments.enrolByEmail({ email: learner.email, batchId, source: "ADMIN", commit: true }, actor(admin));
        } finally {
            spy.mock.restore();
        }
        const past = (await sessions.createSessions({ batchId, title: "Yesterday", date: ist.addDays(today, -1), time: "10:00", durationMin: 60 }, actor(teacher))).created[0];
        const future = (await sessions.createSessions({ batchId, title: "Next week", date: ist.addDays(today, 7), time: "10:00", durationMin: 60 }, actor(teacher))).created[0];
        assert.equal(past.status, "Completed");
        assert.equal(past.enrolled, 2);

        const before = await sessions.getSessionDetail(past.id, actor(teacher));
        assert.equal(before.canMarkAttendance, true);
        assert.deepEqual(before.roster.map((r) => r.mark), ["Not marked", "Not marked"]);
        assert.equal((await sessions.getSessionDetail(future.id, actor(teacher))).canMarkAttendance, false);
        await assert.rejects(sessions.markAttendance(future.id, { marks: [{ userId: asha.id, status: "PRESENT" }] }, actor(teacher)), errors.BusinessRule, "attendance opens at the start");
        await assert.rejects(sessions.markAttendance(past.id, { marks: [{ userId: stranger.id, status: "PRESENT" }] }, actor(teacher)), errors.ValidationError, "only enrolled learners");
        await assert.rejects(sessions.markAttendance(past.id, { marks: [] }, actor(teacher)), errors.ValidationError);
        await assert.rejects(sessions.markAttendance(past.id, { marks: [{ userId: asha.id, status: "LATE" }] }, actor(teacher)), errors.ValidationError);

        const marked = await sessions.markAttendance(past.id, { marks: [{ userId: asha.id, status: "PRESENT" }, { userId: ravi.id, status: "ABSENT" }] }, actor(teacher));
        assert.deepEqual(marked.roster.map((r) => [r.name, r.mark]), [["Asha Rao", "Present"], ["Ravi Kumar", "Absent"]]);
        const changed = await sessions.markAttendance(past.id, { marks: [{ userId: ravi.id, status: "PRESENT" }] }, actor(teacher));
        assert.deepEqual(changed.roster.map((r) => r.mark), ["Present", "Present"], "a mark can be corrected");
        assert.equal((await sessions.listSessions({ from: ist.addDays(today, -1), to: ist.addDays(today, -1) }, actor(admin))).sessions[0].attended, 2);

        await sessions.cancelSession(future.id, { reason: "Not needed" }, actor(teacher));
        await assert.rejects(sessions.markAttendance(future.id, { marks: [{ userId: asha.id, status: "PRESENT" }] }, actor(teacher)), errors.BusinessRule);
    });

    test("announcements: scheduled, targeted and ordered for learners; drafts and other batches stay hidden", async () => {
        const batchA = await makeBatch();
        const batchB = await makeBatch({ name: "B4 Batch B", course: courseB.title });
        const asha = await createLearner("b4.asha@example.com");
        const ravi = await createLearner("b4.ravi@example.com", "Ravi Kumar");
        const spy = quiet();
        try {
            await enrolments.enrolByEmail({ email: asha.email, batchId: batchA, source: "ADMIN", commit: true }, actor(admin));
            await enrolments.enrolByEmail({ email: ravi.email, batchId: batchB, source: "ADMIN", commit: true }, actor(admin));
        } finally {
            spy.mock.restore();
        }
        const at = (offsetDays: number, time = "09:00") => `${ist.addDays(today, offsetDays)}T${time}`;
        const make = (over: Record<string, unknown>) => notices().create!({ name: "Notice", audience: "All learners", urgency: "Low", date: at(-1), tags: ["General"], message: "A short message for learners.", status: "Published", ...over }, ctx(admin));

        const everyone = await make({ name: "For everyone", urgency: "Medium" });
        await make({ name: "Batch A only", audience: "B4 Batch A", urgency: "High" });
        await make({ name: "Batch B only", audience: "B4 Batch B" });
        await make({ name: "Scheduled for tomorrow", date: at(1) });
        await make({ name: "A draft", status: "Draft" });
        const retired = await make({ name: "Retired", status: "Archived" });
        assert.equal(everyone.date, at(-1), "the publish time round-trips as IST wall-clock");

        assert.deepEqual((await learning.listMyAnnouncements(asha.id)).map((a) => a.title), ["Batch A only", "For everyone"], "High urgency first, hidden ones absent");
        assert.deepEqual((await learning.listMyAnnouncements(ravi.id)).map((a) => a.title), ["For everyone", "Batch B only"]);
        assert.deepEqual((await learning.listMyAnnouncements(asha.id, new Date(Date.now() + 2 * 86_400_000))).map((a) => a.title), ["Batch A only", "For everyone", "Scheduled for tomorrow"], "scheduled notices appear at their time");

        const mine = await learning.listMyAnnouncements(asha.id);
        assert.deepEqual(mine.map((a) => a.read), [false, false]);
        await learning.markAnnouncementRead(asha.id, mine[1].id);
        await learning.markAnnouncementRead(asha.id, mine[1].id);
        assert.deepEqual((await learning.listMyAnnouncements(asha.id)).map((a) => a.read), [false, true], "reading is per learner and repeatable");
        assert.deepEqual((await learning.listMyAnnouncements(ravi.id)).map((a) => a.read), [false, false]);
        const batchANotice = mine[0].id;
        await assert.rejects(learning.markAnnouncementRead(ravi.id, batchANotice), errors.NotFound, "a notice for another batch looks absent");
        await assert.rejects(learning.markAnnouncementRead(asha.id, String(retired.id)), errors.NotFound);

        // Admin rules.
        await assert.rejects(make({ name: "x" }), errors.ValidationError);
        await assert.rejects(make({ audience: "Nowhere" }), errors.ValidationError);
        await assert.rejects(make({ tags: ["Nonsense"] }), errors.ValidationError);
        await assert.rejects(make({ date: "tomorrow" }), errors.ValidationError);
        await assert.rejects(make({ urgency: "Urgent" }), errors.ValidationError);
        await assert.rejects(notices().remove!(String(everyone.id), ctx(admin)), errors.BusinessRule, "published notices are archived, not deleted");
        const draft = (await notices().list({ ...listQuery, q: "draft" }, ctx(admin))).rows[0];
        await notices().remove!(String(draft.id), ctx(admin));
        const edited = await notices().update!(String(everyone.id), { name: "For everyone (updated)", audience: "B4 Batch B", urgency: "High", date: at(-1), tags: ["Exams"], message: "Changed message text.", status: "Published" }, ctx(admin));
        assert.equal(edited.audience, "B4 Batch B");
        assert.deepEqual((await learning.listMyAnnouncements(asha.id)).map((a) => a.title), ["Batch A only"], "retargeting takes effect at once");
        const tagged = await notices().list({ ...listQuery, filters: { tags: "Exams" } }, ctx(admin));
        assert.deepEqual(tagged.rows.map((r) => r.name), ["For everyone (updated)"], "filtering by tag works on the JSON column");
        const copy = await notices().actions!.duplicate(String(everyone.id), ctx(admin));
        assert.equal(copy.status, "Draft");
        assert.ok((await notices().options!()).audience.includes("B4 Batch A"));
    });

    test("the student's own courses, sessions and home summary", async () => {
        const batchId = await makeBatch();
        const sanskritBatch = await makeBatch({ name: "B4 Sanskrit A", course: courseB.title });
        const asha = await createLearner("b4.asha@example.com");
        const spy = quiet();
        try {
            await enrolments.enrolByEmail({ email: asha.email, batchId, source: "ADMIN", commit: true }, actor(admin));
            await enrolments.enrolByEmail({ email: asha.email, batchId: sanskritBatch, source: "ADMIN", commit: true }, actor(admin));
        } finally {
            spy.mock.restore();
        }
        await prisma.enrolment.updateMany({ where: { userId: asha.id, batchId: sanskritBatch }, data: { accessEndsAt: new Date(`${ist.addDays(today, -1)}T00:00:00Z`) } });

        const courses = await learning.listMyCourses(asha.id);
        assert.deepEqual(courses.map((c) => [c.title, c.status]).sort(), [[courseA.title, "Active"], [courseB.title, "Expired"]], "an enrolment past its access end is not active");
        assert.equal(courses.find((c) => c.title === courseA.title)?.batch, "B4 Batch A");
        assert.equal(courses.find((c) => c.title === courseA.title)?.collection, "B4 Category");
        assert.deepEqual(await learning.listMyCourses("someone-else"), []);

        const soon = new Date();
        const create = (title: string, date: string, time: string, link?: string) => sessions.createSessions({ batchId, title, date, time, durationMin: 60, ...(link ? { link } : {}) }, actor(teacher));
        const nowIst = ist.toIst(soon);
        const later = (await create("Today later", today, "23:30", "https://example.org/join")).created[0];
        const tomorrow = (await create("Tomorrow", ist.addDays(today, 1), "10:00", "https://example.org/tomorrow")).created[0];
        const cancelled = (await create("Cancelled one", ist.addDays(today, 2), "10:00")).created[0];
        await sessions.cancelSession(cancelled.id, { reason: "Unwell" }, actor(teacher));
        await sessions.createSessions({ batchId: sanskritBatch, title: "Sanskrit today", date: today, time: "07:00", durationMin: 30 }, actor(admin));

        const week = await learning.listMySessions(asha.id, { from: today, to: ist.addDays(today, 6) });
        assert.deepEqual(week.sessions.map((s) => s.title).sort(), ["Cancelled one", "Sanskrit today", "Today later", "Tomorrow"]);
        assert.equal(week.sessions.find((s) => s.title === "Tomorrow")?.joinUrl, null, "no join link until shortly before the start");
        assert.equal(week.sessions.find((s) => s.title === "Cancelled one")?.status, "Cancelled");
        assert.equal(week.sessions.find((s) => s.id === later.id)?.instructor, "b4-teacher");
        const nearStart = new Date(new Date(later.startsAt).getTime() - 10 * 60_000);
        const joinable = await learning.listMySessions(asha.id, { from: today, to: today }, nearStart);
        assert.equal(joinable.sessions.find((s) => s.id === later.id)?.joinUrl, "https://example.org/join", "the link opens 15 minutes before the start");
        const afterEnd = await learning.listMySessions(asha.id, { from: today, to: today }, new Date(new Date(later.endsAt).getTime() + 60_000));
        assert.equal(afterEnd.sessions.find((s) => s.id === later.id)?.joinUrl, null);
        assert.deepEqual((await learning.listMySessions("someone-else", { from: today, to: today })).sessions, [], "only the learner's own batches");
        await assert.rejects(learning.listMySessions(asha.id, { from: today, to: ist.addDays(today, 400) }), errors.ValidationError);
        await assert.rejects(learning.listMySessions(asha.id, { from: "bad", to: today }), errors.ValidationError);

        await notices().create!({ name: "Welcome", audience: "All learners", urgency: "Low", date: `${ist.addDays(today, -1)}T09:00`, tags: [], message: "Welcome to the platform.", status: "Published" }, ctx(admin));
        const home = await learning.getHomeSummary(asha.id, soon);
        assert.equal(home.today, nowIst.date);
        assert.equal(home.activeCourses, 1);
        assert.equal(home.completedCourses, 0);
        assert.equal(home.unreadAnnouncements, 1);
        assert.deepEqual(home.continueLearning.map((c) => c.title), [courseA.title]);
        assert.ok(home.todaysSessions.every((s) => ist.toIst(new Date(s.startsAt)).date === today));
        assert.equal(home.sessionsThisWeek, 3, "cancelled sessions are not counted");
        assert.ok(tomorrow.id);
    });

    test("the roles around learning operations", async () => {
        const { can } = await import("@/server/auth/permissions");
        assert.ok(can("INSTRUCTOR", "sessions:write") && can("INSTRUCTOR", "batches:read") && !can("INSTRUCTOR", "batches:write"));
        assert.ok(can("SUPPORT", "enrolments:write") && can("SUPPORT", "sessions:read") && !can("SUPPORT", "sessions:write"));
        assert.ok(!can("INSTRUCTOR", "enrolments:write"));
        assert.ok(!can("CONTENT_EDITOR", "batches:read") && !can("FINANCE", "sessions:read"));
        assert.ok(can("ADMIN", "announcements:publish"));
    });
});
