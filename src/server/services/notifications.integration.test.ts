import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, mock, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

describe("B8 notification bell (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let notifications: typeof import("@/server/services/notifications");
    let supportService: typeof import("@/server/services/support");
    let leadsService: typeof import("@/server/services/leads");
    let leadValidators: typeof import("@/server/validators/leads");
    let resources: typeof import("@/server/admin/resources");
    let errors: typeof import("@/server/http/errors");

    type Person = { id: string; email: string; name: string };
    let boss: Person;
    let admin: Person;
    let support: Person;
    let editor: Person;
    let finance: Person;
    let teacher: Person;
    let blocked: Person;
    let archived: Person;
    let asha: Person;

    const quiet = () => mock.method(console, "info", () => undefined);

    async function person(email: string, role: "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "CONTENT_EDITOR" | "FINANCE" | "INSTRUCTOR", status: "ACTIVE" | "BLOCKED" | "ARCHIVED" = "ACTIVE"): Promise<Person> {
        const user = await prisma.user.create({ data: { email, kind: "STAFF", role, status, emailVerifiedAt: new Date(), staffProfile: { create: { displayName: email.split("@")[0] } } } });
        return { id: user.id, email, name: email.split("@")[0] };
    }

    const bell = async (who: Person) => notifications.listNotifications(who.id);
    const kinds = async (who: Person) => (await bell(who)).items.map((item) => item.kind);
    const everyone = () => [boss, admin, support, editor, finance, teacher, blocked, archived, asha];
    /** Who has at least one message of this kind. */
    const reached = async (kind: string) => {
        const holders = await prisma.inAppNotification.findMany({ where: { kind }, select: { userId: true } });
        return everyone().filter((who) => holders.some((holder) => holder.userId === who.id)).map((who) => who.name).sort();
    };

    async function wipe() {
        await prisma.inAppNotification.deleteMany();
        await prisma.supportRequest.deleteMany();
        await prisma.lead.deleteMany();
    }

    before(async () => {
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        notifications = await import("@/server/services/notifications");
        supportService = await import("@/server/services/support");
        leadsService = await import("@/server/services/leads");
        leadValidators = await import("@/server/validators/leads");
        resources = await import("@/server/admin/resources");
        errors = await import("@/server/http/errors");

        await prisma.user.deleteMany({ where: { email: { startsWith: "nt-" } } });
        await prisma.book.deleteMany({ where: { title: { startsWith: "NT " } } });
        boss = await person("nt-boss@ibmv.test", "SUPER_ADMIN");
        admin = await person("nt-admin@ibmv.test", "ADMIN");
        support = await person("nt-support@ibmv.test", "SUPPORT");
        editor = await person("nt-editor@ibmv.test", "CONTENT_EDITOR");
        finance = await person("nt-finance@ibmv.test", "FINANCE");
        teacher = await person("nt-teacher@ibmv.test", "INSTRUCTOR");
        blocked = await person("nt-blocked@ibmv.test", "ADMIN", "BLOCKED");
        archived = await person("nt-archived@ibmv.test", "SUPPORT", "ARCHIVED");
        const learner = await prisma.user.create({ data: { email: "nt-asha@example.com", kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), learnerProfile: { create: { name: "Asha Rao", registrationNo: "NT-001" } } } });
        asha = { id: learner.id, email: learner.email, name: "Asha Rao" };
    });

    beforeEach(wipe);

    after(async () => {
        await wipe();
        await prisma.book.deleteMany({ where: { title: { startsWith: "NT " } } });
        await prisma.user.deleteMany({ where: { email: { startsWith: "nt-" } } });
        await prisma.$disconnect();
    });

    test("staff are told by what their role may do, and only while their account is active", async () => {
        const count = await notifications.notifyStaff("supportRequests:read", { kind: "t.one", title: "Hello" });
        assert.equal(count, 3);
        assert.deepEqual(await reached("t.one"), ["nt-admin", "nt-boss", "nt-support"], "not the editor, finance, instructor, learner, or a blocked or archived account");
        await notifications.notifyStaff("leads:write", { kind: "t.two", title: "Lead" });
        assert.deepEqual(await reached("t.two"), ["nt-admin", "nt-boss", "nt-support"], "an editor may read leads but not change them");
        await notifications.notifyStaff("orders:refund", { kind: "t.three", title: "Refund" });
        assert.deepEqual(await reached("t.three"), ["nt-admin", "nt-boss", "nt-finance"]);
        assert.equal(await notifications.notifyStaff("supportRequests:read", { kind: "t.four", title: "Skip me" }, { exceptUserId: boss.id }), 2);
        assert.deepEqual(await reached("t.four"), ["nt-admin", "nt-support"]);
    });

    test("the bell lists the newest twenty, counts every unread one, and shows only its owner's", async () => {
        for (let n = 1; n <= 25; n += 1) await notifications.notifyUser(boss.id, { kind: "t.many", title: `Message ${String(n).padStart(2, "0")}` });
        await notifications.notifyUser(admin.id, { kind: "t.other", title: "Not for the boss" });
        const list = await bell(boss);
        assert.equal(list.items.length, 20);
        assert.equal(list.unread, 25, "all of them, not only the twenty shown");
        assert.equal(list.items[0].title, "Message 25", "newest first");
        assert.equal(list.items.every((item) => item.kind === "t.many" && !item.read), true);
        assert.deepEqual((await bell(admin)).items.map((item) => item.title), ["Not for the boss"]);
        assert.deepEqual(await bell(teacher), { unread: 0, items: [] });
    });

    test("marking read: chosen ones, all of them, and never another person's", async () => {
        await notifications.notifyUser(boss.id, { kind: "t.a", title: "A" });
        await notifications.notifyUser(boss.id, { kind: "t.b", title: "B" });
        await notifications.notifyUser(boss.id, { kind: "t.c", title: "C" });
        await notifications.notifyUser(admin.id, { kind: "t.d", title: "For the admin" });
        const [c] = (await bell(boss)).items;
        const adminItem = (await bell(admin)).items[0];

        assert.deepEqual(await notifications.markNotificationsRead(boss.id, { ids: [c.id, adminItem.id] }), { marked: 1, unread: 2 }, "the admin's message is not the boss's to mark");
        assert.equal((await bell(admin)).unread, 1);
        assert.deepEqual((await bell(boss)).items.map((item) => item.read), [true, false, false]);
        assert.deepEqual(await notifications.markNotificationsRead(boss.id, { ids: [c.id] }), { marked: 0, unread: 2 }, "marking twice changes nothing");
        assert.deepEqual(await notifications.markNotificationsRead(boss.id, { ids: [] }), { marked: 0, unread: 2 }, "an empty list marks nothing");
        assert.deepEqual(await notifications.markNotificationsRead(boss.id, {}), { marked: 2, unread: 0 }, "no list marks them all");
        assert.equal((await bell(boss)).items.every((item) => item.read), true);
        assert.equal((await bell(admin)).unread, 1, "and still not the admin's");

        await assert.rejects(notifications.markNotificationsRead(boss.id, { ids: "all" }), errors.ValidationError);
        await assert.rejects(notifications.markNotificationsRead(boss.id, { ids: Array.from({ length: 51 }, (_, n) => `id-${n}`) }), errors.ValidationError);
    });

    test("a message opens only a page of this site, and long text is cut", async () => {
        const spy = mock.method(console, "error", () => undefined);
        try {
            for (const [kind, href] of [["h.ok", "/admin/engage/support?open=abc"], ["h.web", "https://evil.example/x"], ["h.proto", "//evil.example"], ["h.js", "javascript:alert(1)"], ["h.space", "/admin/a b"]] as const) {
                await notifications.notifyUser(boss.id, { kind, title: kind, href });
            }
            await notifications.notifyUser(boss.id, { kind: "h.long", title: "T".repeat(300), body: "B".repeat(600) });
        } finally {
            spy.mock.restore();
        }
        const items = Object.fromEntries((await bell(boss)).items.map((item) => [item.kind, item]));
        assert.equal(items["h.ok"].href, "/admin/engage/support?open=abc");
        for (const kind of ["h.web", "h.proto", "h.js", "h.space"]) assert.equal(items[kind].href, null, kind);
        assert.equal(items["h.long"].title.length, 200);
        assert.equal(items["h.long"].body?.length, 500);
        assert.equal(items["h.long"].href, null);
    });

    test("old messages are dropped as new ones arrive", async () => {
        const day = 86_400_000;
        await prisma.inAppNotification.create({ data: { userId: boss.id, kind: "old.read", title: "Old", readAt: new Date(), createdAt: new Date(Date.now() - 100 * day) } });
        await prisma.inAppNotification.create({ data: { userId: boss.id, kind: "old.unread", title: "Old and unread", createdAt: new Date(Date.now() - 95 * day) } });
        await prisma.inAppNotification.create({ data: { userId: boss.id, kind: "recent", title: "Recent", createdAt: new Date(Date.now() - 10 * day) } });
        await notifications.notifyUser(boss.id, { kind: "fresh", title: "Fresh" });
        assert.deepEqual((await kinds(boss)).sort(), ["fresh", "recent"]);
    });

    test("telling someone can fail without failing the work that caused it", async () => {
        const spy = mock.method(console, "error", () => undefined);
        try {
            // An id too long for the column makes the insert fail.
            assert.equal(await notifications.notifyUser("x".repeat(300), { kind: "t.fail", title: "Nobody" }), 0);
            assert.equal(spy.mock.calls.length, 1, "the failure is logged");
        } finally {
            spy.mock.restore();
        }
    });

    test("a support request tells the team that can answer it, and an assignment tells the assignee", async () => {
        const spy = quiet();
        try {
            const request = await supportService.createSupportRequest({ id: asha.id, name: asha.name, email: asha.email }, { message: "I cannot see my course in My Learning." });
            assert.deepEqual(await reached("support.request"), ["nt-admin", "nt-boss", "nt-support"]);
            const item = (await bell(support)).items[0];
            assert.deepEqual([item.title, item.body, item.href], ["New support request from Asha Rao", "I cannot see my course in My Learning.", `/admin/engage/support?open=${request.id}`]);
            assert.deepEqual(await bell(asha), { unread: 0, items: [] }, "the learner is not told about their own request");

            await supportService.updateSupportRequest(request.id, { status: "In progress" }, { id: admin.id });
            assert.deepEqual(await reached("support.assigned"), [], "a status change tells nobody");
            await supportService.updateSupportRequest(request.id, { assignedToId: admin.id }, { id: admin.id });
            assert.deepEqual(await reached("support.assigned"), [], "assigning it to yourself tells nobody");
            await supportService.updateSupportRequest(request.id, { assignedToId: support.id }, { id: admin.id });
            assert.deepEqual(await reached("support.assigned"), ["nt-support"]);
            const assigned = (await bell(support)).items[0];
            assert.deepEqual([assigned.kind, assigned.title, assigned.href], ["support.assigned", "A support request was assigned to you", `/admin/engage/support?open=${request.id}`]);
            await supportService.updateSupportRequest(request.id, { assignedToId: support.id }, { id: admin.id });
            assert.equal((await prisma.inAppNotification.count({ where: { kind: "support.assigned" } })), 1, "assigning it to the same person again tells nobody");
            await supportService.updateSupportRequest(request.id, { assignedToId: null }, { id: admin.id });
            assert.equal((await prisma.inAppNotification.count({ where: { kind: "support.assigned" } })), 1, "taking the assignment away tells nobody");
        } finally {
            spy.mock.restore();
        }
    });

    test("a bulk book enquiry tells those who work the leads", async () => {
        await resources.getResource("website/books").create!({ title: "NT Book", language: "English", status: "Published" }, { user: { id: boss.id, email: boss.email, name: boss.name, role: "SUPER_ADMIN", kind: "STAFF", branchIds: [] }, ip: "127.0.0.1" });
        const input = leadValidators.bulkBookEnquirySchema.parse({
            firstName: "Asha", lastName: "Rao", email: "Asha.Rao@Example.com", countryCode: "+91", mobile: "98765 43210", address: "12 Temple Road", city: "Pune", pincode: "411001",
            book: "NT Book", quantity: 25, consent: true, website: "", startedAt: Date.now() - 10_000,
        });
        const spy = quiet();
        try {
            assert.equal(await leadsService.createBulkBookEnquiry(input, "10.0.0.9"), true);
            assert.equal(await leadsService.createBulkBookEnquiry({ ...input, website: "https://spam.example" }), false);
        } finally {
            spy.mock.restore();
        }
        assert.deepEqual(await reached("lead.new"), ["nt-admin", "nt-boss", "nt-support"], "the content editor may read leads but does not work them");
        const item = (await bell(admin)).items[0];
        assert.deepEqual([item.title, item.body, item.href], ["New bulk book enquiry from Asha Rao", "25 copies of NT Book", "/admin/marketing/leads?q=asha.rao%40example.com"]);
        assert.equal(await prisma.inAppNotification.count({ where: { kind: "lead.new", userId: admin.id } }), 1, "a discarded enquiry tells nobody");
    });
});
