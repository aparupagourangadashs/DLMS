import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

describe("B8 global search (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let search: typeof import("@/server/services/search");
    let shared: typeof import("@/lib/admin/search");

    type Viewer = { role: "SUPER_ADMIN" | "ADMIN" | "INSTRUCTOR" | "CONTENT_EDITOR" | "FINANCE" | "SUPPORT"; branchIds: string[] };
    let main: { id: string };
    let north: { id: string };
    let scoped: Viewer;
    const as = (role: Viewer["role"], branchIds: string[] = []): Viewer => ({ role, branchIds });
    const keys = async (viewer: Viewer, text = "Quokka") => (await search.searchRecords(text, viewer)).map((group) => group.key);
    const hits = async (viewer: Viewer, key: string, text = "Quokka") => (await search.searchRecords(text, viewer)).find((group) => group.key === key)?.hits ?? [];

    const ALL = ["learners", "team", "courses", "batches", "events", "announcements", "blogs", "leads", "support", "assets", "modules", "banners", "testimonials", "books", "people"];

    async function wipe() {
        await prisma.banner.deleteMany();
        await prisma.asset.deleteMany();
        await prisma.event.deleteMany();
        await prisma.announcement.deleteMany();
        await prisma.blog.deleteMany();
        await prisma.lead.deleteMany();
        await prisma.supportRequest.deleteMany();
        await prisma.testimonial.deleteMany();
        await prisma.person.deleteMany();
        await prisma.book.deleteMany();
        await prisma.batch.deleteMany();
        await prisma.course.deleteMany({ where: { slug: { startsWith: "sr-" } } });
        await prisma.category.deleteMany({ where: { slug: "sr-cat" } });
        await prisma.module.deleteMany({ where: { name: { startsWith: "SR " } } });
        await prisma.user.deleteMany({ where: { email: { startsWith: "sr" } } });
        await prisma.branch.deleteMany({ where: { name: { startsWith: "SR " } } });
    }

    before(async () => {
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        search = await import("@/server/services/search");
        shared = await import("@/lib/admin/search");
        await wipe();

        main = await prisma.branch.create({ data: { name: "SR Main" } });
        north = await prisma.branch.create({ data: { name: "SR North" } });
        scoped = as("ADMIN", [main.id]);

        const staff = (email: string, name: string, role: Viewer["role"], branchId?: string) =>
            prisma.user.create({ data: { email, kind: "STAFF", role, emailVerifiedAt: new Date(), staffProfile: { create: { displayName: name, branchId } }, ...(branchId ? { branches: { create: [{ branchId }] } } : {}) } });
        const teacher = await staff("sr-teacher@ibmv.test", "SR Teacher", "INSTRUCTOR");
        await staff("sr-quokka-staff@ibmv.test", "Quokka Staff", "SUPPORT", north.id);

        const learner = (email: string, name: string, reg: string, branchId?: string) =>
            prisma.user.create({ data: { email, kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), phone: "+91 90000 0000" + reg.slice(-1), learnerProfile: { create: { name, registrationNo: reg, branchId } } } });
        await learner("sr.main@example.com", "Quokka Learner", "SR-Q1", main.id);
        await learner("sr.north@example.com", "Quokka North", "SR-Q2", north.id);
        await learner("sr.free@example.com", "Quokka Free", "SR-Q3");
        await learner("sr.other@example.com", "Someone Else", "SR-Q4", main.id);

        const category = await prisma.category.create({ data: { slug: "sr-cat", title: "SR Category", description: "Test category", status: "PUBLISHED" } });
        const course = (n: number | string) => prisma.course.create({ data: { slug: `sr-quokka-course-${n}`, title: `SR Quokka Course ${n}`, summary: "A test course.", categoryId: category.id, officialUrl: "https://example.org/c", status: "PUBLISHED" } });
        const first = await course(1);
        const batch = (name: string, branchId: string | null) => prisma.batch.create({ data: { name, courseId: first.id, branchId, instructorId: teacher.id, status: "ACTIVE", startDate: new Date("2026-10-01T00:00:00Z"), endDate: new Date("2027-03-01T00:00:00Z") } });
        await batch("SR Quokka Batch Main", main.id);
        await batch("SR Quokka Batch North", north.id);
        await batch("SR Quokka Batch None", null);

        const image = await prisma.asset.create({ data: { type: "IMAGE", name: "SR Quokka Image", status: "READY" } });
        await prisma.banner.create({ data: { name: "SR Quokka Banner", imageAssetId: image.id, placement: "WEBSITE_HOME" } });
        await prisma.event.create({ data: { name: "SR Quokka Event", description: "x", platform: "ZOOM", category: "Festival", membershipEligibility: "Everyone", startsAt: new Date("2026-12-01T05:00:00Z"), endsAt: new Date("2026-12-01T07:00:00Z") } });
        await prisma.announcement.create({ data: { title: "SR Quokka Notice", body: "x", publishAt: new Date("2026-11-01T00:00:00Z") } });
        await prisma.blog.create({ data: { slug: "sr-quokka-story", title: "SR Quokka Story", body: "A story about a quokka." } });
        await prisma.lead.create({ data: { name: "Quokka Lead", email: "quokka.lead@example.com", source: "CONTACT_FORM" } });
        await prisma.supportRequest.create({ data: { name: "Quokka Asker", email: "asker@example.com", message: "A question about a quokka that is long enough to be clipped for the list.".repeat(3) } });
        await prisma.module.create({ data: { name: "SR Quokka Module", status: "PUBLISHED" } });
        await prisma.testimonial.create({ data: { name: "SR Quokka Fan", quote: "Lovely.", city: "Pune" } });
        await prisma.book.create({ data: { title: "SR Quokka Book", language: "English" } });
        await prisma.person.create({ data: { name: "SR Quokka Person", roleTitle: "Advisor", group: "ADVISORY" } });
    });

    after(async () => {
        await wipe();
        await prisma.$disconnect();
    });

    test("a Super Admin or Administrator finds a record on every screen, in a fixed order", async () => {
        assert.deepEqual(await keys(as("SUPER_ADMIN")), ALL);
        assert.deepEqual(await keys(as("ADMIN")), ALL);
    });

    test("each role finds only what its screens show", async () => {
        assert.deepEqual(await keys(as("FINANCE")), ["learners"]);
        assert.deepEqual(await keys(as("SUPPORT")), ["learners", "courses", "batches", "announcements", "leads", "support"]);
        assert.deepEqual(await keys(as("INSTRUCTOR")), ["learners", "courses", "batches", "announcements", "assets", "modules"]);
        assert.deepEqual(await keys(as("CONTENT_EDITOR")), ["courses", "events", "blogs", "leads", "assets", "modules", "banners", "testimonials", "books", "people"]);
    });

    test("staff tied to a branch reach only their branch's learners, staff and batches, and the unassigned batches", async () => {
        assert.deepEqual((await hits(as("SUPER_ADMIN"), "learners")).map((hit) => hit.title), ["Quokka Free", "Quokka Learner", "Quokka North"]);
        assert.deepEqual((await hits(scoped, "learners")).map((hit) => hit.title), ["Quokka Learner"]);
        assert.deepEqual((await hits(as("ADMIN", [north.id]), "learners")).map((hit) => hit.title), ["Quokka North"]);
        assert.deepEqual((await hits(as("SUPER_ADMIN"), "team")).map((hit) => hit.title), ["Quokka Staff"]);
        assert.deepEqual(await hits(scoped, "team"), [], "the staff member is in the other branch");
        assert.deepEqual((await hits(as("ADMIN", [north.id]), "team")).map((hit) => hit.title), ["Quokka Staff"]);
        assert.deepEqual((await hits(as("ADMIN"), "batches")).map((hit) => hit.title), ["SR Quokka Batch Main", "SR Quokka Batch None", "SR Quokka Batch North"]);
        assert.deepEqual((await hits(scoped, "batches")).map((hit) => hit.title), ["SR Quokka Batch Main", "SR Quokka Batch None"]);
        assert.deepEqual((await hits(as("SUPER_ADMIN", [main.id]), "learners")).length, 3, "a Super Admin is never held to a branch");
    });

    test("every hit names the record, says a little about it, and opens it", async () => {
        const [learner] = await hits(as("SUPER_ADMIN"), "learners", "SR-Q1");
        assert.deepEqual([learner.title, learner.subtitle, learner.href], ["Quokka Learner", "SR-Q1 \u00b7 sr.main@example.com", "/admin/users/learners?q=SR-Q1"]);
        const [batch] = await hits(as("ADMIN"), "batches", "Batch Main");
        assert.deepEqual([batch.title, batch.subtitle, batch.href], ["SR Quokka Batch Main", "SR Quokka Course 1 \u00b7 Active", "/admin/learning/batches?q=SR%20Quokka%20Batch%20Main"]);
        const [lead] = await hits(as("ADMIN"), "leads");
        assert.deepEqual([lead.title, lead.subtitle, lead.href], ["Quokka Lead", "quokka.lead@example.com \u00b7 Contact form", "/admin/marketing/leads?q=quokka.lead%40example.com"]);
        const [request] = await hits(as("ADMIN"), "support");
        assert.match(request.href, /^\/admin\/engage\/support\?open=[a-z0-9]+$/);
        assert.equal(request.subtitle.length, 81, "a long message is cut for the list");
        const [person] = await hits(as("ADMIN"), "people");
        assert.deepEqual([person.title, person.subtitle, person.href], ["SR Quokka Person", "Advisory", "/admin/website/people?q=SR%20Quokka%20Person"]);
        const [member] = await hits(as("ADMIN"), "team");
        assert.deepEqual([member.subtitle, member.href], ["Support \u00b7 sr-quokka-staff@ibmv.test", "/admin/users/team?q=sr-quokka-staff%40ibmv.test"]);
    });

    test("a learner is found by name, registration number, email or phone", async () => {
        const viewer = as("ADMIN");
        for (const text of ["Quokka Learner", "SR-Q1", "sr.main@", "+91 90000 00001"]) assert.deepEqual((await hits(viewer, "learners", text)).map((hit) => hit.title), ["Quokka Learner"], text);
    });

    test("short text, blanks and nothing found give nothing, and a group shows at most five", async () => {
        assert.deepEqual(await search.searchRecords("Q", as("ADMIN")), []);
        assert.deepEqual(await search.searchRecords("   ", as("ADMIN")), []);
        assert.deepEqual(await search.searchRecords("", as("ADMIN")), []);
        assert.equal(shared.MIN_QUERY, 2);
        assert.equal((await search.searchRecords(" Qu ", as("ADMIN"))).length > 0, true, "spaces around the text do not count");
        assert.deepEqual(await search.searchRecords("zzz-nothing-here", as("SUPER_ADMIN")), []);
        for (let n = 2; n <= 8; n += 1) await prisma.course.create({ data: { slug: `sr-quokka-course-${n}`, title: `SR Quokka Course ${n}`, summary: "x", categoryId: (await prisma.category.findFirstOrThrow({ where: { slug: "sr-cat" } })).id, officialUrl: "https://example.org/c", status: "PUBLISHED" } });
        const courses = await hits(as("ADMIN"), "courses");
        assert.equal(courses.length, 5);
        assert.deepEqual(courses.map((hit) => hit.title), ["SR Quokka Course 1", "SR Quokka Course 2", "SR Quokka Course 3", "SR Quokka Course 4", "SR Quokka Course 5"], "in order of name");
        assert.equal((await search.searchRecords("x".repeat(300), as("ADMIN"))).length, 0, "long text is cut, not refused");
    });
});
