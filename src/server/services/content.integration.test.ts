import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

type SessionUser = import("@/server/auth/session").SessionUser;
type Lesson = { id: string; title: string; type: string; minutes: string; content: string; url: string };

describe("B4b modules, course content and lesson progress (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let registration: typeof import("@/server/services/registration");
    let content: typeof import("@/server/services/learner-content");
    let learning: typeof import("@/server/services/learner-learning");
    let resources: typeof import("@/server/admin/resources");
    let permissions: typeof import("@/server/auth/permissions");
    let ist: typeof import("@/lib/ist");
    let errors: typeof import("@/server/http/errors");

    let admin: SessionUser;
    let editor: SessionUser;
    let today: string;

    const ctx = (user: SessionUser) => ({ user, ip: "127.0.0.1" });
    const listQuery = { q: "", filters: {}, page: 1, pageSize: 25, skip: 0, take: 25 };
    const modules = () => resources.getResource("learning/module-library");
    const courses = () => resources.getResource("products/courses");
    const batches = () => resources.getResource("learning/batches");

    async function createStaff(email: string, role: SessionUser["role"]): Promise<SessionUser> {
        const user = await prisma.user.create({ data: { email, kind: "STAFF", role, emailVerifiedAt: new Date(), staffProfile: { create: { displayName: email.split("@")[0] } } } });
        return { id: user.id, email, name: email, role, kind: "STAFF", branchIds: [] };
    }

    async function createLearner(email: string, name = "Asha Rao") {
        const user = await prisma.$transaction(async (tx) =>
            tx.user.create({
                data: { email, kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), learnerProfile: { create: { name, registrationNo: await registration.nextRegistrationNo(tx) } } },
            }),
        );
        return user.id;
    }

    const text = (title: string, body = `Text of ${title}.`) => ({ title, type: "Text", minutes: "", content: body, url: "" });
    const moduleInput = (name: string, lessons: Array<Record<string, string>>, over: Record<string, unknown> = {}) => ({ name, description: "", status: "Published", ...over, lessons: JSON.stringify(lessons) });
    const lessonsOf = (row: Record<string, unknown>) => JSON.parse(String(row.lessons)) as Lesson[];
    const courseInput = (title: string, over: Record<string, unknown> = {}) => ({
        title,
        category: "CT Category",
        summary: "A short summary for the tests.",
        officialUrl: "https://example.org/ct",
        status: "Published",
        ...over,
    });

    async function makeModule(name: string, lessons: Array<Record<string, string>>, over: Record<string, unknown> = {}) {
        const row = await modules().create!(moduleInput(name, lessons, over), ctx(editor));
        return { id: String(row.id), lessons: lessonsOf(row) };
    }

    async function makeCourse(title: string, moduleNames: string[], over: Record<string, unknown> = {}) {
        const row = await courses().create!(courseInput(title, { ...over, modules: JSON.stringify(moduleNames.map((module) => ({ module }))) }), ctx(editor));
        return { id: String(row.id), slug: String(row.slug) };
    }

    const enrol = (userId: string, courseId: string, over: Record<string, unknown> = {}) => prisma.enrolment.create({ data: { userId, courseId, source: "ADMIN", ...over } });
    const fieldError = (field: string, pattern?: RegExp) => (error: unknown) =>
        error instanceof errors.ValidationError && Boolean(error.fields?.[field]) && (!pattern || pattern.test(error.fields?.[field] ?? ""));

    async function wipe() {
        await prisma.enrolment.deleteMany({ where: { user: { email: { startsWith: "ct." } } } });
        await prisma.batch.deleteMany({ where: { name: { startsWith: "CT " } } });
        await prisma.course.deleteMany({ where: { slug: { startsWith: "ct-" } } });
        await prisma.module.deleteMany({ where: { name: { startsWith: "CT " } } });
        await prisma.auditEvent.deleteMany();
        await prisma.counter.deleteMany();
        await prisma.user.deleteMany({ where: { email: { startsWith: "ct." } } });
    }

    before(async () => {
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        registration = await import("@/server/services/registration");
        content = await import("@/server/services/learner-content");
        learning = await import("@/server/services/learner-learning");
        resources = await import("@/server/admin/resources");
        permissions = await import("@/server/auth/permissions");
        ist = await import("@/lib/ist");
        errors = await import("@/server/http/errors");
        today = ist.istToday();

        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "ct-" } } });
        await prisma.category.deleteMany({ where: { slug: "ct-cat" } });
        await prisma.category.create({ data: { slug: "ct-cat", title: "CT Category", description: "Test category", status: "PUBLISHED" } });
        admin = await createStaff("ct-admin@ibmv.test", "ADMIN");
        editor = await createStaff("ct-editor@ibmv.test", "CONTENT_EDITOR");
    });

    beforeEach(wipe);

    after(async () => {
        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "ct-" } } });
        await prisma.category.deleteMany({ where: { slug: "ct-cat" } });
        await prisma.$disconnect();
    });

    test("modules: lessons are checked by type, saved in order, and keep their ids when edited", async () => {
        const lessons = [
            { title: "Welcome", type: "Text", minutes: "5", content: "# Hello\n\nWelcome **all**.", url: "" },
            { title: "Watch this", type: "Video", minutes: "", content: "", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
            { title: "Read more", type: "Link", minutes: "10", content: "", url: "https://example.org/read" },
        ];
        const created = await modules().create!(moduleInput("CT Intro", lessons, { description: "Start here" }), ctx(editor));
        assert.equal(created.content, "3 lessons · 1 video · 1 link");
        assert.equal(created.usedIn, "Not used yet");
        const saved = lessonsOf(created);
        assert.deepEqual(saved.map((l) => [l.title, l.type, l.minutes]), [["Welcome", "Text", "5"], ["Watch this", "Video", ""], ["Read more", "Link", "10"]]);
        assert.equal(saved[1].url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");

        // A lesson that does not fit its type is refused, with the item named.
        const bad = (lesson: Record<string, string>) => modules().create!(moduleInput("CT Bad", [lesson]), ctx(editor));
        await assert.rejects(bad({ ...text("No text"), content: "   " }), fieldError("lessons"));
        await assert.rejects(bad({ title: "Vimeo", type: "Video", minutes: "", content: "", url: "https://vimeo.com/123456789" }), fieldError("lessons", /Item 1/));
        await assert.rejects(bad({ title: "Insecure", type: "Link", minutes: "", content: "", url: "http://example.org" }), fieldError("lessons"));
        await assert.rejects(bad({ title: "Script", type: "Link", minutes: "", content: "", url: "javascript:alert(1)" }), fieldError("lessons"));
        await assert.rejects(bad({ ...text("Zero minutes"), minutes: "0" }), fieldError("lessons"));
        await assert.rejects(bad({ ...text("Odd type"), type: "Quiz" }), fieldError("lessons"));
        await assert.rejects(bad({ ...text(""), title: "" }), fieldError("lessons"));
        await assert.rejects(modules().create!(moduleInput("CT Many", Array.from({ length: 101 }, (_, i) => text(`Lesson ${i}`))), ctx(editor)), fieldError("lessons"));
        await assert.rejects(modules().create!({ name: "X", lessons: "[]" }, ctx(editor)), fieldError("name"));
        await assert.rejects(modules().create!(moduleInput("CT Status", [], { status: "Live" }), ctx(editor)), fieldError("status"));
        await assert.rejects(modules().create!(moduleInput("CT Intro", []), ctx(editor)), errors.Conflict, "module names are unique");
        assert.equal(await prisma.module.count({ where: { name: { in: ["CT Bad", "CT Many", "CT Status"] } } }), 0, "a refused module leaves nothing behind");

        // Editing keeps the lessons that stay, drops the ones left out and adds new ones.
        const [welcome, watch, read] = saved;
        const updated = await modules().update!(String(created.id), moduleInput("CT Intro", [read, { ...welcome, title: "Welcome (edited)" }, text("Brand new")], { description: "Start here" }), ctx(editor));
        const after = lessonsOf(updated);
        assert.deepEqual(after.map((l) => l.title), ["Read more", "Welcome (edited)", "Brand new"]);
        assert.equal(after[0].id, read.id);
        assert.equal(after[1].id, welcome.id);
        assert.ok(![welcome.id, watch.id, read.id].includes(after[2].id), "a new lesson gets its own id");
        assert.equal(await prisma.moduleContent.count({ where: { id: watch.id } }), 0, "a lesson left out is removed");
        assert.equal(updated.content, "3 lessons · 1 link");

        // An id from another module is never taken over.
        const other = await makeModule("CT Other", [text("Theirs")]);
        const stolen = await modules().update!(String(created.id), moduleInput("CT Intro", [...after, { ...other.lessons[0] }]), ctx(editor));
        assert.equal(lessonsOf(stolen).length, 4);
        assert.equal(await prisma.moduleContent.count({ where: { moduleId: other.id } }), 1, "the other module keeps its lesson");
        assert.ok(!lessonsOf(stolen).some((l) => l.id === other.lessons[0].id));

        const events = await prisma.auditEvent.findMany({ where: { entity: "Module" } });
        assert.ok(events.some((e) => e.action === "module.create") && events.some((e) => e.action === "module.update"));
    });

    test("modules: listed with tabs and search; copied, archived and deleted under the usage rules", async () => {
        const intro = await makeModule("CT Intro", [text("One"), { title: "Clip", type: "Video", minutes: "", content: "", url: "https://youtu.be/dQw4w9WgXcQ" }], { description: "Basics" });
        await makeModule("CT Advanced", [text("Deep")], { status: "Draft" });
        await makeModule("CT Empty", []);

        const all = await modules().list(listQuery, ctx(editor));
        assert.deepEqual(all.rows.map((r) => r.name), ["CT Advanced", "CT Empty", "CT Intro"]);
        assert.deepEqual(all.tabCounts, { Published: 2, Draft: 1, Archived: 0 });
        assert.equal(all.rows.find((r) => r.name === "CT Empty")?.content, "0 lessons");
        assert.equal(all.rows.find((r) => r.name === "CT Intro")?.content, "2 lessons · 1 video");
        assert.equal(all.rows.find((r) => r.name === "CT Intro")?.lessons, undefined, "lesson bodies are not sent with the list");
        assert.deepEqual((await modules().list({ ...listQuery, tab: "Draft" }, ctx(editor))).rows.map((r) => r.name), ["CT Advanced"]);
        assert.deepEqual((await modules().list({ ...listQuery, q: "basics" }, ctx(editor))).rows.map((r) => r.name), ["CT Intro"], "search covers the description");

        const copy = await modules().actions!.duplicate(intro.id, ctx(editor));
        assert.equal(copy.name, "CT Intro (copy)");
        assert.equal(copy.status, "Draft");
        const copied = lessonsOf(await modules().get!(String(copy.id), ctx(editor)));
        assert.deepEqual(copied.map((l) => l.title), ["One", "Clip"]);
        assert.ok(copied.every((l) => !intro.lessons.some((o) => o.id === l.id)), "the copy has its own lessons");
        assert.equal((await modules().actions!.duplicate(intro.id, ctx(editor))).name, "CT Intro (copy 2)");

        await courses().create!(courseInput("CT Course A", { modules: JSON.stringify([{ module: "CT Intro" }]) }), ctx(editor));
        assert.equal((await modules().get!(intro.id, ctx(editor))).usedIn, "Used in 1 course");
        await assert.rejects(modules().remove!(intro.id, ctx(editor)), errors.Conflict, "a module in use cannot be deleted");
        assert.equal(await prisma.module.count({ where: { id: intro.id } }), 1);
        assert.equal((await modules().actions!.archive(intro.id, ctx(editor))).status, "Archived");
        await modules().remove!(String(copy.id), ctx(editor));
        assert.equal(await prisma.module.count({ where: { id: String(copy.id) } }), 0);
        await assert.rejects(modules().get!("missing", ctx(editor)), errors.NotFound);

        assert.ok(permissions.can("CONTENT_EDITOR", "modules:write") && permissions.can("CONTENT_EDITOR", "modules:delete"));
        assert.ok(permissions.can("INSTRUCTOR", "modules:read") && !permissions.can("INSTRUCTOR", "modules:write"));
        assert.ok(!permissions.can("SUPPORT", "modules:read") && !permissions.can("FINANCE", "modules:read"));
    });

    test("courses: modules are attached in order, checked before anything is saved, and copied", async () => {
        await makeModule("CT Intro", [text("One")]);
        await makeModule("CT Practice", [text("Two")]);
        const refs = (...names: string[]) => JSON.stringify(names.map((module) => ({ module })));

        const course = await courses().create!(courseInput("CT Course A", { modules: refs("CT Practice", "CT Intro") }), ctx(editor));
        assert.deepEqual(JSON.parse(String(course.modules)), [{ module: "CT Practice" }, { module: "CT Intro" }]);

        const row = await courses().get!(String(course.id), ctx(editor));
        const reordered = await courses().update!(String(course.id), { ...row, modules: refs("CT Intro", "CT Practice") }, ctx(editor));
        assert.deepEqual(JSON.parse(String(reordered.modules)), [{ module: "CT Intro" }, { module: "CT Practice" }]);

        await assert.rejects(courses().update!(String(course.id), { ...row, title: "CT Course A renamed", modules: refs("CT Intro", "CT Nowhere") }, ctx(editor)), fieldError("modules"));
        await assert.rejects(courses().update!(String(course.id), { ...row, modules: refs("CT Intro", "CT Intro") }, ctx(editor)), fieldError("modules", /only once/));
        await assert.rejects(courses().create!(courseInput("CT Course Rejected", { modules: refs("CT Nowhere") }), ctx(editor)), fieldError("modules"));
        assert.equal(await prisma.course.count({ where: { title: "CT Course Rejected" } }), 0, "a refused course is not created");
        const unchanged = await courses().get!(String(course.id), ctx(editor));
        assert.equal(unchanged.title, "CT Course A", "a refused edit changes nothing");
        assert.deepEqual(JSON.parse(String(unchanged.modules)), [{ module: "CT Intro" }, { module: "CT Practice" }]);

        const copy = await courses().actions!.duplicate(String(course.id), ctx(editor));
        assert.deepEqual(JSON.parse(String(copy.modules)), [{ module: "CT Intro" }, { module: "CT Practice" }]);
        const cleared = await courses().update!(String(course.id), { ...row, modules: "" }, ctx(editor));
        assert.deepEqual(JSON.parse(String(cleared.modules)), []);
        assert.ok((await courses().options!())["modules.module"].includes("CT Intro"), "the course form offers the library's modules");
    });

    test("course content: only enrolled learners open it, and only its published modules", async () => {
        await makeModule("CT Intro", [text("One"), { title: "Clip", type: "Video", minutes: "7", content: "", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, { title: "Site", type: "Link", minutes: "", content: "", url: "https://example.org/read" }]);
        await makeModule("CT Hidden", [text("Draft lesson")], { status: "Draft" });
        await makeModule("CT Elsewhere", [text("Other course lesson")]);
        const course = await makeCourse("CT Course A", ["CT Hidden", "CT Intro"]);
        await makeCourse("CT Course B", ["CT Elsewhere"]);
        const learnerId = await createLearner("ct.asha@example.com");
        const strangerId = await createLearner("ct.stranger@example.com", "Stranger");

        await assert.rejects(content.getCourseOutline(learnerId, course.slug), errors.NotFound, "not enrolled");
        const enrolment = await enrol(learnerId, course.id);
        const outline = await content.getCourseOutline(learnerId, course.slug);
        assert.deepEqual(outline.modules.map((m) => m.name), ["CT Intro"], "draft modules stay hidden");
        assert.deepEqual(outline.modules[0].lessons.map((l) => [l.title, l.type, l.minutes, l.completed]), [["One", "Text", null, false], ["Clip", "Video", 7, false], ["Site", "Link", null, false]]);
        assert.equal(outline.title, "CT Course A");
        assert.deepEqual([outline.totalLessons, outline.completedLessons, outline.progressPercent, outline.status], [3, 0, 0, "Active"]);
        assert.equal(outline.resumeLessonId, outline.modules[0].lessons[0].id);

        const [one, clip, site] = outline.modules[0].lessons;
        assert.deepEqual((({ title, type, body, url, completed }) => ({ title, type, body, url, completed }))(await content.getLesson(learnerId, one.id)), { title: "One", type: "Text", body: "Text of One.", url: "", completed: false });
        const video = await content.getLesson(learnerId, clip.id);
        assert.equal(video.url, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
        assert.equal(video.body, "");
        assert.equal((await content.getLesson(learnerId, site.id)).url, "https://example.org/read");

        const hidden = await prisma.moduleContent.findFirstOrThrow({ where: { title: "Draft lesson" } });
        const elsewhere = await prisma.moduleContent.findFirstOrThrow({ where: { title: "Other course lesson" } });
        for (const id of [hidden.id, elsewhere.id, "missing"]) await assert.rejects(content.getLesson(learnerId, id), errors.NotFound, id);
        await assert.rejects(content.getLesson(strangerId, one.id), errors.NotFound, "someone else's course");
        await assert.rejects(content.completeLesson(strangerId, one.id), errors.NotFound);
        await assert.rejects(content.completeLesson(learnerId, elsewhere.id), errors.NotFound);

        // Access follows the enrolment: status and dates.
        const set = (data: Record<string, unknown>) => prisma.enrolment.update({ where: { id: enrolment.id }, data });
        const yesterday = new Date(`${ist.addDays(today, -1)}T00:00:00Z`);
        const tomorrow = new Date(`${ist.addDays(today, 1)}T00:00:00Z`);
        for (const [label, data] of [
            ["cancelled", { status: "CANCELLED" }],
            ["expired", { status: "EXPIRED" }],
            ["access ended yesterday", { status: "ACTIVE", accessEndsAt: yesterday }],
            ["access starts tomorrow", { status: "ACTIVE", accessEndsAt: null, accessStartsAt: tomorrow }],
        ] as const) {
            await set(data);
            await assert.rejects(content.getCourseOutline(learnerId, course.slug), errors.NotFound, label);
            await assert.rejects(content.getLesson(learnerId, one.id), errors.NotFound, label);
        }
        await set({ status: "COMPLETED", accessStartsAt: null });
        assert.equal((await content.getCourseOutline(learnerId, course.slug)).status, "Completed", "a completed course can be reviewed");
        await set({ status: "ACTIVE", accessEndsAt: new Date(`${today}T00:00:00Z`) });
        assert.equal((await content.getCourseOutline(learnerId, course.slug)).totalLessons, 3, "the last day of access still counts");

        // Archiving a module hides it as well.
        await prisma.module.updateMany({ where: { name: "CT Intro" }, data: { status: "ARCHIVED" } });
        assert.deepEqual((await content.getCourseOutline(learnerId, course.slug)).modules, []);
        await assert.rejects(content.getLesson(learnerId, one.id), errors.NotFound);
        await assert.rejects(content.getCourseOutline(learnerId, "no-such-course"), errors.NotFound);
    });

    test("lesson progress: explicit, per learner, repeatable, and it completes the enrolment at 100%", async () => {
        const intro = await makeModule("CT Intro", [text("One"), text("Two"), text("Three"), text("Four")]);
        const course = await makeCourse("CT Course A", ["CT Intro"]);
        const asha = await createLearner("ct.asha@example.com");
        const ravi = await createLearner("ct.ravi@example.com", "Ravi Kumar");
        const ashaEnrolment = await enrol(asha, course.id);
        const raviEnrolment = await enrol(ravi, course.id);
        const [one, two, three, four] = intro.lessons;
        const stored = async (id: string) => prisma.enrolment.findUniqueOrThrow({ where: { id }, select: { progressPercent: true, status: true } });

        await content.getLesson(asha, one.id);
        assert.equal((await content.getCourseOutline(asha, course.slug)).completedLessons, 0, "opening a lesson never completes it");

        let progress = await content.completeLesson(asha, one.id);
        assert.deepEqual([progress.progressPercent, progress.completedLessons, progress.totalLessons, progress.status, progress.lessonId], [25, 1, 4, "Active", one.id]);
        progress = await content.completeLesson(asha, one.id);
        assert.equal(progress.completedLessons, 1, "completing again changes nothing");
        assert.equal(await prisma.lessonProgress.count({ where: { enrolmentId: ashaEnrolment.id } }), 1);
        assert.deepEqual(await stored(ashaEnrolment.id), { progressPercent: 25, status: "ACTIVE" });

        let outline = await content.getCourseOutline(asha, course.slug);
        assert.equal(outline.modules[0].lessons[0].completed, true);
        assert.equal(outline.resumeLessonId, two.id, "resume at the next lesson to do");
        assert.equal((await content.getLesson(asha, one.id)).completed, true);
        assert.equal((await content.getCourseOutline(ravi, course.slug)).completedLessons, 0, "progress is per learner");

        await content.completeLesson(asha, two.id);
        await content.completeLesson(asha, three.id);
        assert.equal((await content.completeLesson(asha, four.id)).status, "Completed");
        assert.deepEqual(await stored(ashaEnrolment.id), { progressPercent: 100, status: "COMPLETED" });
        outline = await content.getCourseOutline(asha, course.slug);
        assert.equal(outline.resumeLessonId, four.id, "when everything is done the last lesson is offered");

        await content.completeLesson(ravi, one.id);
        await content.completeLesson(ravi, two.id);
        const mine = await learning.listMyCourses(asha);
        assert.deepEqual([mine[0].lessons, mine[0].completedLessons, mine[0].progressPercent, mine[0].status], [4, 4, 100, "Completed"]);
        const theirs = await learning.listMyCourses(ravi);
        assert.deepEqual([theirs[0].lessons, theirs[0].completedLessons, theirs[0].progressPercent, theirs[0].status], [4, 2, 50, "Active"]);

        // The admin's batch list shows the average of what learners have done.
        const batchRecord = await prisma.batch.create({ data: { name: "CT Batch", courseId: course.id, startDate: new Date(`${ist.addDays(today, -1)}T00:00:00Z`), endDate: new Date(`${ist.addDays(today, 60)}T00:00:00Z`) } });
        await prisma.enrolment.updateMany({ where: { id: { in: [ashaEnrolment.id, raviEnrolment.id] } }, data: { batchId: batchRecord.id } });
        const batch = (await batches().list({ ...listQuery, q: "CT Batch" }, ctx(admin))).rows[0];
        assert.equal(batch.learners, 2);
        assert.equal(batch.progress, 75, "the average of 100% and 50%");
    });

    test("lesson progress: editing a module keeps what learners completed", async () => {
        const intro = await makeModule("CT Intro", [text("One"), text("Two")]);
        const course = await makeCourse("CT Course A", ["CT Intro"]);
        const asha = await createLearner("ct.asha@example.com");
        const enrolment = await enrol(asha, course.id);
        await content.completeLesson(asha, intro.lessons[0].id);
        await content.completeLesson(asha, intro.lessons[1].id);
        assert.equal((await prisma.enrolment.findUniqueOrThrow({ where: { id: enrolment.id } })).status, "COMPLETED");

        // Reordering and renaming keep every completed lesson.
        await modules().update!(intro.id, moduleInput("CT Intro", [{ ...intro.lessons[1], title: "Two (renamed)" }, intro.lessons[0]]), ctx(editor));
        let outline = await content.getCourseOutline(asha, course.slug);
        assert.deepEqual(outline.modules[0].lessons.map((l) => [l.title, l.completed]), [["Two (renamed)", true], ["One", true]]);
        assert.equal(outline.progressPercent, 100);

        // A lesson added later is simply not done yet; the course stays completed, and the stored percentage follows.
        await modules().update!(intro.id, moduleInput("CT Intro", [{ ...intro.lessons[1], title: "Two (renamed)" }, intro.lessons[0], text("Three")]), ctx(editor));
        outline = await content.getCourseOutline(asha, course.slug);
        assert.deepEqual([outline.totalLessons, outline.completedLessons, outline.progressPercent, outline.status], [3, 2, 66, "Completed"]);
        assert.equal(outline.resumeLessonId, outline.modules[0].lessons[2].id);
        assert.deepEqual(await prisma.enrolment.findUniqueOrThrow({ where: { id: enrolment.id }, select: { progressPercent: true, status: true } }), { progressPercent: 66, status: "COMPLETED" });

        // A lesson removed from the module no longer counts.
        await modules().update!(intro.id, moduleInput("CT Intro", [intro.lessons[0]]), ctx(editor));
        outline = await content.getCourseOutline(asha, course.slug);
        assert.deepEqual([outline.totalLessons, outline.completedLessons, outline.progressPercent], [1, 1, 100]);
        assert.equal(await prisma.lessonProgress.count({ where: { contentId: intro.lessons[1].id } }), 0, "progress on a removed lesson goes with it");
    });

    test("lesson progress: a course with no published lessons shows nothing to do", async () => {
        const course = await makeCourse("CT Course A", []);
        const asha = await createLearner("ct.asha@example.com");
        await enrol(asha, course.id);
        const outline = await content.getCourseOutline(asha, course.slug);
        assert.deepEqual([outline.modules.length, outline.totalLessons, outline.progressPercent, outline.resumeLessonId, outline.status], [0, 0, 0, null, "Active"]);
        const [mine] = await learning.listMyCourses(asha);
        assert.deepEqual([mine.lessons, mine.completedLessons, mine.progressPercent], [0, 0, 0]);
    });
});
