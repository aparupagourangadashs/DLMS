import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

type SessionUser = import("@/server/auth/session").SessionUser;

describe("B4b session recordings (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let registration: typeof import("@/server/services/registration");
    let sessions: typeof import("@/server/services/sessions");
    let learning: typeof import("@/server/services/learner-learning");
    let resources: typeof import("@/server/admin/resources");
    let permissions: typeof import("@/server/auth/permissions");
    let ist: typeof import("@/lib/ist");
    let errors: typeof import("@/server/http/errors");

    let admin: SessionUser;
    let teacher: SessionUser;
    let scoped: SessionUser;
    let pune: { id: string; name: string };
    let mumbai: { id: string; name: string };
    let courseId: string;
    let today: string;

    const ctx = (user: SessionUser) => ({ user, ip: "127.0.0.1" });
    const actor = (user: SessionUser) => ({ id: user.id, ip: "127.0.0.1", role: user.role, branchIds: user.branchIds });
    const listQuery = { q: "", filters: {}, page: 1, pageSize: 25, skip: 0, take: 25 };
    const recordings = () => resources.getResource("learning/session-recordings");
    const fieldError = (field: string) => (error: unknown) => error instanceof errors.ValidationError && Boolean(error.fields?.[field]);

    async function createStaff(email: string, role: SessionUser["role"], branchIds: string[] = []): Promise<SessionUser> {
        const user = await prisma.user.create({ data: { email, kind: "STAFF", role, emailVerifiedAt: new Date(), staffProfile: { create: { displayName: email.split("@")[0] } } } });
        return { id: user.id, email, name: email, role, kind: "STAFF", branchIds };
    }

    async function createLearner(email: string) {
        return prisma.$transaction(async (tx) =>
            tx.user.create({
                data: { email, kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), learnerProfile: { create: { name: "Asha Rao", registrationNo: await registration.nextRegistrationNo(tx) } } },
            }),
        );
    }

    const makeBatch = (name: string, over: Record<string, unknown> = {}) =>
        prisma.batch.create({
            data: { name, courseId, startDate: new Date(`${ist.addDays(today, -30)}T00:00:00Z`), endDate: new Date(`${ist.addDays(today, 30)}T00:00:00Z`), instructorId: teacher.id, branchId: pune.id, ...over },
        });

    /** A class on a fixed IST day (negative = past), so the tests do not depend on the time of day they run. */
    const makeSession = (batchId: string, title: string, dayOffset: number, over: Record<string, unknown> = {}) => {
        const startsAt = ist.fromIst(ist.addDays(today, dayOffset), "10:00");
        return prisma.session.create({ data: { batchId, title, startsAt, endsAt: new Date(startsAt.getTime() + 3_600_000), ...over } });
    };

    const labelOf = (session: { title: string; startsAt: Date }, batch: string) => {
        const when = ist.toIst(session.startsAt);
        return `${when.date} ${when.time} · ${batch} · ${session.title}`;
    };

    const input = (session: string, over: Record<string, unknown> = {}) => ({ session, title: "", url: "https://example.org/recording", status: "Available", ...over });

    async function wipe() {
        await prisma.enrolment.deleteMany({ where: { user: { email: { startsWith: "rc." } } } });
        await prisma.batch.deleteMany({ where: { name: { startsWith: "RC " } } });
        await prisma.course.deleteMany({ where: { slug: { startsWith: "rc-" } } });
        await prisma.auditEvent.deleteMany();
        await prisma.counter.deleteMany();
        await prisma.user.deleteMany({ where: { email: { startsWith: "rc." } } });
    }

    before(async () => {
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        registration = await import("@/server/services/registration");
        sessions = await import("@/server/services/sessions");
        learning = await import("@/server/services/learner-learning");
        resources = await import("@/server/admin/resources");
        permissions = await import("@/server/auth/permissions");
        ist = await import("@/lib/ist");
        errors = await import("@/server/http/errors");
        today = ist.istToday();

        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "rc-" } } });
        await prisma.branch.deleteMany({ where: { name: { startsWith: "RC " } } });
        await prisma.category.deleteMany({ where: { slug: "rc-cat" } });
        pune = await prisma.branch.create({ data: { name: "RC Pune" } });
        mumbai = await prisma.branch.create({ data: { name: "RC Mumbai" } });
        await prisma.category.create({ data: { slug: "rc-cat", title: "RC Category", description: "Test category", status: "PUBLISHED" } });
        courseId = (await prisma.course.create({ data: { slug: "rc-course", title: "RC Course", summary: "Summary", officialUrl: "https://example.org/rc", status: "PUBLISHED", category: { connect: { slug: "rc-cat" } } } })).id;
        admin = await createStaff("rc-admin@ibmv.test", "ADMIN");
        teacher = await createStaff("rc-teacher@ibmv.test", "INSTRUCTOR");
        scoped = await createStaff("rc-scoped@ibmv.test", "ADMIN", [pune.id]);
    });

    beforeEach(async () => {
        await prisma.batch.deleteMany({ where: { name: { startsWith: "RC " } } });
        await prisma.auditEvent.deleteMany();
    });

    after(async () => {
        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "rc-" } } });
        await prisma.branch.deleteMany({ where: { name: { startsWith: "RC " } } });
        await prisma.category.deleteMany({ where: { slug: "rc-cat" } });
        await prisma.$disconnect();
    });

    test("form: offers started, live classes of open batches; checks the input; saves and audits", async () => {
        const batch = await makeBatch("RC Live");
        const archived = await makeBatch("RC Old", { status: "ARCHIVED" });
        const one = await makeSession(batch.id, "RC Class 1", -3);
        const two = await makeSession(batch.id, "RC Class 2", -2);
        const cancelled = await makeSession(batch.id, "RC Cancelled", -1, { status: "CANCELLED", cancelReason: "Rain" });
        const future = await makeSession(batch.id, "RC Future", 2);
        const old = await makeSession(archived.id, "RC Old class", -4);

        const options = await recordings().options!(ctx(admin));
        assert.deepEqual(options.session, [labelOf(two, "RC Live"), labelOf(one, "RC Live")], "newest first; no cancelled, future or archived-batch classes");
        assert.ok(options.batch.includes("RC Live") && options.batch.includes("RC Old"));
        assert.deepEqual(await recordings().options!(), {}, "without a staff member there is nothing to offer");

        const created = await recordings().create!(input(labelOf(one, "RC Live")), ctx(teacher));
        assert.equal(created.name, "RC Class 1", "without a title the class title is shown");
        assert.deepEqual([created.status, created.batch, created.date, created.url, created.batchStatus], ["Available", "RC Live", ist.toIst(one.startsAt).date, "https://example.org/recording", "Active"]);
        assert.equal(created.instructor, "rc-teacher");
        const titled = await recordings().create!(input(labelOf(one, "RC Live"), { title: "Part 2", status: "Processing" }), ctx(admin));
        assert.equal(titled.name, "Part 2");
        assert.equal(titled.status, "Processing");

        const bad = (over: Record<string, unknown>, session = labelOf(two, "RC Live")) => recordings().create!(input(session, over), ctx(admin));
        for (const url of ["http://example.org/x", "javascript:alert(1)", "example.org", "", "https://has space.org"]) await assert.rejects(bad({ url }), fieldError("url"), url);
        await assert.rejects(bad({ status: "Live" }), fieldError("status"));
        await assert.rejects(bad({ title: "x".repeat(301) }), fieldError("title"));
        for (const session of ["", "Nowhere", labelOf(cancelled, "RC Live"), labelOf(future, "RC Live"), labelOf(old, "RC Old")]) await assert.rejects(bad({}, session), fieldError("session"), session || "empty");
        assert.equal(await prisma.recording.count({ where: { session: { batchId: { in: [batch.id, archived.id] } } } }), 2, "refused recordings leave nothing behind");

        const audit = await prisma.auditEvent.findMany({ where: { entity: "Recording" } });
        assert.equal(audit.filter((e) => e.action === "recording.create").length, 2);

        for (let i = 0; i < 10; i++) await recordings().create!(input(labelOf(two, "RC Live"), { title: `Take ${i + 1}` }), ctx(admin));
        await assert.rejects(bad({}), errors.BusinessRule, "a class holds at most ten recordings");
        assert.ok(permissions.can("INSTRUCTOR", "recordings:read") && permissions.can("INSTRUCTOR", "recordings:write"));
        assert.ok(!permissions.can("INSTRUCTOR", "recordings:delete") && permissions.can("ADMIN", "recordings:delete"));
        assert.ok(!permissions.can("SUPPORT", "recordings:read") && !permissions.can("CONTENT_EDITOR", "recordings:read"));
    });

    test("list: newest class first, with tabs, filters, search, dates and sorting", async () => {
        const live = await makeBatch("RC Live");
        const done = await makeBatch("RC Done", { status: "COMPLETED" });
        const closed = await makeBatch("RC Closed", { status: "ARCHIVED" });
        const alpha = await makeSession(live.id, "RC Alpha", -5);
        const beta = await makeSession(live.id, "RC Beta", -3);
        const gamma = await makeSession(done.id, "RC Gamma", -4);
        const delta = await makeSession(closed.id, "RC Delta", -6);
        await recordings().create!(input(labelOf(alpha, "RC Live")), ctx(admin));
        await recordings().create!(input(labelOf(beta, "RC Live"), { title: "Beta, the recording" }), ctx(admin));
        await recordings().create!(input(labelOf(gamma, "RC Done")), ctx(admin));
        await prisma.recording.create({ data: { sessionId: delta.id, url: "https://example.org/old" } });

        const names = async (query: Record<string, unknown> = {}) => (await recordings().list({ ...listQuery, ...query }, ctx(admin))).rows.map((r) => r.name);
        const all = await recordings().list(listQuery, ctx(admin));
        assert.deepEqual(all.rows.map((r) => r.name), ["Beta, the recording", "RC Gamma", "RC Alpha", "RC Delta"]);
        assert.deepEqual(all.tabCounts, { Active: 2, Completed: 1, Archived: 1 });
        assert.equal(all.total, 4);
        assert.deepEqual(await names({ tab: "Active" }), ["Beta, the recording", "RC Alpha"]);
        assert.deepEqual(await names({ tab: "Archived" }), ["RC Delta"]);
        assert.deepEqual(await names({ filters: { batch: "RC Done" } }), ["RC Gamma"]);
        assert.deepEqual(await names({ q: "gamma" }), ["RC Gamma"], "search covers the class title");
        assert.deepEqual(await names({ q: "the recording" }), ["Beta, the recording"], "and the recording title");
        assert.deepEqual(await names({ q: "RC Done" }), ["RC Gamma"], "and the batch name");
        assert.deepEqual(await names({ from: ist.addDays(today, -4), to: ist.addDays(today, -3) }), ["Beta, the recording", "RC Gamma"], "date range follows the class date");
        assert.deepEqual(await names({ sort: { key: "name", dir: "asc" } }), ["RC Alpha", "Beta, the recording", "RC Delta", "RC Gamma"], "sorted by the class title");
        assert.deepEqual(await names({ sort: { key: "date", dir: "asc" } }), ["RC Delta", "RC Alpha", "RC Gamma", "Beta, the recording"]);
        assert.deepEqual(await names({ page: 2, pageSize: 3, skip: 3, take: 3 }), ["RC Delta"]);

        const row = all.rows.find((r) => r.name === "RC Gamma")!;
        assert.deepEqual([row.batchStatus, row.batch, row.date], ["Completed", "RC Done", ist.toIst(gamma.startsAt).date]);
    });

    test("update, publish and delete: changes are audited and keep the one-class rules", async () => {
        const batch = await makeBatch("RC Live");
        const one = await makeSession(batch.id, "RC Class 1", -3);
        const two = await makeSession(batch.id, "RC Class 2", -2);
        const created = await recordings().create!(input(labelOf(one, "RC Live")), ctx(admin));
        const id = String(created.id);

        const form = await recordings().get!(id, ctx(admin));
        assert.deepEqual([form.session, form.title, form.url, form.status], [labelOf(one, "RC Live"), "", "https://example.org/recording", "Available"]);

        const processing = await recordings().update!(id, { ...form, status: "Processing" }, ctx(admin));
        assert.equal(processing.status, "Processing");
        const republished = await recordings().update!(id, { ...form, title: "Renamed", status: "Available", url: "https://example.org/new" }, ctx(teacher));
        assert.deepEqual([republished.name, republished.url, republished.status], ["Renamed", "https://example.org/new", "Available"]);
        const moved = await recordings().update!(id, { ...form, session: labelOf(two, "RC Live") }, ctx(admin));
        assert.equal(moved.date, ist.toIst(two.startsAt).date, "a recording can move to another class");
        await assert.rejects(recordings().update!(id, { ...form, url: "http://insecure.example" }, ctx(admin)), fieldError("url"));
        await assert.rejects(recordings().update!(id, { ...form, session: "Nowhere" }, ctx(admin)), fieldError("session"));
        await assert.rejects(recordings().update!("missing", form, ctx(admin)), errors.NotFound);

        const actions = (await prisma.auditEvent.findMany({ where: { entity: "Recording", entityId: id }, orderBy: { createdAt: "asc" } })).map((e) => e.action);
        assert.deepEqual(actions, ["recording.create", "recording.unpublish", "recording.publish", "recording.update"]);

        // A recording whose class later left the form (cancelled) can still be edited without moving it.
        await prisma.session.update({ where: { id: two.id }, data: { status: "CANCELLED", cancelReason: "Moved" } });
        const still = await recordings().get!(id, ctx(admin));
        assert.equal((await recordings().update!(id, { ...still, title: "Kept" }, ctx(admin))).name, "Kept");

        await recordings().remove!(id, ctx(admin));
        assert.equal(await prisma.recording.count({ where: { id } }), 0);
        assert.ok((await prisma.auditEvent.findMany({ where: { entity: "Recording", entityId: id } })).some((e) => e.action === "recording.delete"));
        await assert.rejects(recordings().remove!(id, ctx(admin)), errors.NotFound);
        await assert.rejects(recordings().get!(id, ctx(admin)), errors.NotFound);
    });

    test("scope: branch-scoped staff reach only their own branch's recordings", async () => {
        const punes = await makeBatch("RC Pune Batch");
        const mumbais = await makeBatch("RC Mumbai Batch", { branchId: mumbai.id });
        const free = await makeBatch("RC No Branch", { branchId: null });
        const p = await makeSession(punes.id, "RC Pune class", -2);
        const m = await makeSession(mumbais.id, "RC Mumbai class", -2, { startsAt: ist.fromIst(ist.addDays(today, -2), "12:00"), endsAt: ist.fromIst(ist.addDays(today, -2), "13:00") });
        const f = await makeSession(free.id, "RC Free class", -2, { startsAt: ist.fromIst(ist.addDays(today, -2), "14:00"), endsAt: ist.fromIst(ist.addDays(today, -2), "15:00") });
        await recordings().create!(input(labelOf(p, "RC Pune Batch")), ctx(admin));
        const mumbaiRecording = await recordings().create!(input(labelOf(m, "RC Mumbai Batch")), ctx(admin));
        await recordings().create!(input(labelOf(f, "RC No Branch")), ctx(admin));

        const seen = (await recordings().list(listQuery, ctx(scoped))).rows.map((r) => r.name).sort();
        assert.deepEqual(seen, ["RC Free class", "RC Pune class"]);
        assert.equal((await recordings().list(listQuery, ctx(admin))).total, 3);
        assert.deepEqual((await recordings().list(listQuery, ctx(scoped))).tabCounts, { Active: 2, Completed: 0, Archived: 0 });

        const options = await recordings().options!(ctx(scoped));
        assert.ok(!options.session.some((label) => label.includes("RC Mumbai")) && !options.batch.includes("RC Mumbai Batch"));
        assert.equal(options.session.length, 2);
        const id = String(mumbaiRecording.id);
        await assert.rejects(recordings().get!(id, ctx(scoped)), errors.NotFound);
        await assert.rejects(recordings().update!(id, { ...mumbaiRecording, title: "Hijack" }, ctx(scoped)), errors.NotFound);
        await assert.rejects(recordings().remove!(id, ctx(scoped)), errors.NotFound);
        await assert.rejects(recordings().create!(input(labelOf(m, "RC Mumbai Batch")), ctx(scoped)), fieldError("session"));
        assert.equal(await prisma.recording.count({ where: { id } }), 1);
    });

    test("learners see only Available recordings of their own batches' classes; staff see all in the class detail", async () => {
        const batch = await makeBatch("RC Live");
        const other = await makeBatch("RC Other");
        const first = await makeSession(batch.id, "RC Class 1", -2);
        const second = await makeSession(batch.id, "RC Class 2", -1);
        const elsewhere = await makeSession(other.id, "RC Elsewhere", -2, { startsAt: ist.fromIst(ist.addDays(today, -2), "16:00"), endsAt: ist.fromIst(ist.addDays(today, -2), "17:00") });
        await recordings().create!(input(labelOf(first, "RC Live")), ctx(admin));
        await recordings().create!(input(labelOf(first, "RC Live"), { title: "Part 2", url: "https://example.org/part-2" }), ctx(admin));
        await recordings().create!(input(labelOf(first, "RC Live"), { title: "Draft cut", status: "Processing" }), ctx(admin));
        await recordings().create!(input(labelOf(first, "RC Live"), { title: "Broken", status: "Failed" }), ctx(admin));
        await recordings().create!(input(labelOf(elsewhere, "RC Other")), ctx(admin));
        await prisma.recording.create({ data: { sessionId: second.id, url: "https://example.org/after-cancel" } });
        await prisma.session.update({ where: { id: second.id }, data: { status: "CANCELLED", cancelReason: "Unwell" } });

        const asha = await createLearner("rc.asha@example.com");
        const stranger = await createLearner("rc.stranger@example.com");
        await prisma.enrolment.create({ data: { userId: asha.id, courseId, batchId: batch.id, source: "ADMIN" } });

        const range = { from: ist.addDays(today, -3), to: today };
        const mine = (await learning.listMySessions(asha.id, range)).sessions;
        const byTitle = new Map(mine.map((s) => [s.title, s]));
        assert.deepEqual(byTitle.get("RC Class 1")?.recordings.map((r) => [r.title, r.url]), [["RC Class 1", "https://example.org/recording"], ["Part 2", "https://example.org/part-2"]], "only Available recordings, titled by the class when untitled");
        assert.deepEqual(byTitle.get("RC Class 2")?.recordings, [], "a cancelled class shows none");
        assert.ok(!byTitle.has("RC Elsewhere"), "other batches' classes are not shown");
        assert.deepEqual((await learning.listMySessions(stranger.id, range)).sessions, []);

        const detail = await sessions.getSessionDetail(first.id, actor(admin));
        assert.deepEqual(detail.recordings.map((r) => [r.title, r.status]), [["RC Class 1", "Available"], ["Part 2", "Available"], ["Draft cut", "Processing"], ["Broken", "Failed"]]);
        await assert.rejects(sessions.getSessionDetail(first.id, actor({ ...scoped, branchIds: [mumbai.id] })), errors.NotFound);

        // Deleting a class's batch removes its recordings with it.
        await prisma.batch.delete({ where: { id: other.id } });
        assert.equal(await prisma.recording.count({ where: { sessionId: elsewhere.id } }), 0);
    });
});
