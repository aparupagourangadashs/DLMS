import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, mock, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

type SessionUser = import("@/server/auth/session").SessionUser;

describe("B2 catalog, public content, legal pages and leads (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let categories: typeof import("@/server/services/categories");
    let siteSettings: typeof import("@/server/services/site-settings");
    let leadsService: typeof import("@/server/services/leads");
    let leadValidators: typeof import("@/server/validators/leads");
    let catalog: typeof import("@/server/services/public/catalog");
    let publications: typeof import("@/server/services/public/publications");
    let community: typeof import("@/server/services/public/community");
    let site: typeof import("@/server/services/public/site");
    let resources: typeof import("@/server/admin/resources");
    let permissions: typeof import("@/server/auth/permissions");
    let errors: typeof import("@/server/http/errors");

    let admin: SessionUser;
    let editor: SessionUser;
    let support: SessionUser;

    const ctx = (user: SessionUser) => ({ user, ip: "127.0.0.1" });
    const actorOf = (user: SessionUser) => ({ id: user.id, ip: "127.0.0.1" });
    const listQuery = { q: "", filters: {}, page: 1, pageSize: 25, skip: 0, take: 25 };

    async function createStaff(email: string, role: SessionUser["role"]): Promise<SessionUser> {
        const user = await prisma.user.create({
            data: { email, kind: "STAFF", role, emailVerifiedAt: new Date(), staffProfile: { create: { displayName: email.split("@")[0] } } },
        });
        return { id: user.id, email, name: email, role, kind: "STAFF", branchIds: [] };
    }

    async function wipeContent() {
        await prisma.lead.deleteMany();
        await prisma.course.deleteMany();
        await prisma.category.deleteMany({ where: { parentId: { not: null } } });
        await prisma.category.deleteMany();
        await prisma.book.deleteMany();
        await prisma.testimonial.deleteMany();
        await prisma.video.deleteMany();
        await prisma.person.deleteMany();
        await prisma.magazine.deleteMany();
        await prisma.siteSetting.deleteMany();
        await prisma.legalDocument.deleteMany();
        await prisma.auditEvent.deleteMany();
    }

    async function publishedCategory(title = "Self Study") {
        return categories.createCategory({ title, description: "Study at your own pace.", color: "teal", status: "Published" }, actorOf(admin));
    }

    const courseInput = (category: string, over: Record<string, unknown> = {}) => ({
        title: "Bhagavad Gita Essentials",
        category,
        summary: "A guided introduction to the Bhagavad Gita.",
        officialUrl: "https://example.org/courses/gita",
        status: "Draft",
        ...over,
    });

    const course = () => resources.getResource("products/courses");
    const auditActions = async (entity: string) => (await prisma.auditEvent.findMany({ where: { entity } })).map((event) => event.action).sort();

    before(async () => {
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        categories = await import("@/server/services/categories");
        siteSettings = await import("@/server/services/site-settings");
        leadsService = await import("@/server/services/leads");
        leadValidators = await import("@/server/validators/leads");
        catalog = await import("@/server/services/public/catalog");
        publications = await import("@/server/services/public/publications");
        community = await import("@/server/services/public/community");
        site = await import("@/server/services/public/site");
        resources = await import("@/server/admin/resources");
        permissions = await import("@/server/auth/permissions");
        errors = await import("@/server/http/errors");
        await prisma.user.deleteMany({ where: { email: { startsWith: "b2-" } } });
        await wipeContent();
        admin = await createStaff("b2-admin@ibmv.test", "ADMIN");
        editor = await createStaff("b2-editor@ibmv.test", "CONTENT_EDITOR");
        support = await createStaff("b2-support@ibmv.test", "SUPPORT");
    });

    beforeEach(wipeContent);

    after(async () => {
        await wipeContent();
        await prisma.user.deleteMany({ where: { email: { startsWith: "b2-" } } });
        await prisma.$disconnect();
    });

    test("categories: tree rules, reserved names, ordering and guarded deletion", async () => {
        const actor = actorOf(admin);
        const top = await publishedCategory("Self Study");
        assert.equal(top.slug, "self-study", "the URL name is generated from the title");

        await assert.rejects(categories.createCategory({ title: "No description" }, actor), errors.ValidationError, "collections need website copy");
        await assert.rejects(categories.createCategory({ title: "Books", slug: "books", description: "Clashes with a fixed page." }, actor), errors.ValidationError, "reserved slug");
        await assert.rejects(categories.createCategory({ title: "Self Study", description: "Same name." }, actor), errors.Conflict);
        await assert.rejects(categories.createCategory({ title: "Odd", slug: "Not A Slug", description: "x" }, actor), errors.ValidationError);

        const sub = await categories.createCategory({ title: "Introductory", parentId: top.id }, actor);
        assert.equal(sub.parentId, top.id);
        await assert.rejects(categories.createCategory({ title: "Too deep", parentId: sub.id }, actor), errors.ValidationError, "only two levels");
        await assert.rejects(categories.createCategory({ title: "Orphan", parentId: "does-not-exist" }, actor), errors.ValidationError);

        const second = await categories.createCategory({ title: "Live Classes", description: "Scheduled classes.", status: "Published" }, actor);
        const tree = await categories.reorderCategories({ parentId: null, ids: [second.id, top.id] }, actor);
        assert.deepEqual(tree.map((c) => c.title), ["Live Classes", "Self Study"]);
        assert.equal(tree[1].children.length, 1);
        await assert.rejects(categories.reorderCategories({ parentId: null, ids: [top.id] }, actor), errors.ValidationError, "must list every sibling");
        await assert.rejects(categories.reorderCategories({ parentId: null, ids: [top.id, top.id] }, actor), errors.ValidationError);

        await assert.rejects(categories.deleteCategory(top.id, actor), errors.BusinessRule, "a category with sub-categories stays");
        await categories.deleteCategory(sub.id, actor);

        await course().create!(courseInput("Self Study"), ctx(editor));
        await assert.rejects(categories.deleteCategory(top.id, actor), errors.BusinessRule, "a category used by courses stays");
        await categories.deleteCategory(second.id, actor);
        assert.deepEqual(await auditActions("Category"), ["category.create", "category.create", "category.create", "category.delete", "category.delete", "category.reorder"]);
    });

    test("courses: drafts stay private, publishing is audited and unpublishing hides them", async () => {
        const category = await publishedCategory();
        const row = await course().create!(courseInput(category.title), ctx(editor));
        assert.equal(row.status, "Draft");
        assert.equal(row.slug, "bhagavad-gita-essentials");
        assert.equal((await catalog.listCourses()).length, 0, "drafts are not public");
        assert.equal(await catalog.getCourseDetail("bhagavad-gita-essentials"), null);

        const faqs = JSON.stringify([{ question: "Is it free?", answer: "Fees are on the official page." }]);
        await course().update!(String(row.id), courseInput(category.title, { status: "Published", price: 1500, certificateOffered: "Yes", faqs }), ctx(editor));
        const detail = await catalog.getCourseDetail("bhagavad-gita-essentials");
        assert.equal(detail?.title, "Bhagavad Gita Essentials");
        assert.equal(detail?.priceLabel, "₹1,500");
        assert.equal(detail?.certificateOffered, true);
        assert.deepEqual(detail?.faqs, [{ question: "Is it free?", answer: "Fees are on the official page." }]);
        assert.deepEqual((await catalog.listCourses(category.slug)).map((c) => c.slug), ["bhagavad-gita-essentials"]);
        assert.deepEqual((await catalog.listCollections()).map((c) => c.slug), [category.slug]);

        await course().actions!.archive(String(row.id), ctx(editor));
        assert.equal((await catalog.listCourses()).length, 0, "archived courses disappear from the website");
        assert.deepEqual(await auditActions("Course"), ["course.create", "course.publish", "course.unpublish"]);
    });

    test("courses: validation, unique URL names, filters and guarded deletion", async () => {
        const category = await publishedCategory();
        const first = await course().create!(courseInput(category.title), ctx(editor));
        const second = await course().create!(courseInput(category.title), ctx(editor));
        assert.equal(second.slug, "bhagavad-gita-essentials-2");

        await assert.rejects(course().create!(courseInput(category.title, { slug: "bhagavad-gita-essentials" }), ctx(editor)), errors.Conflict);
        await assert.rejects(course().create!(courseInput("No such category"), ctx(editor)), errors.ValidationError);
        await assert.rejects(course().create!(courseInput(category.title, { isFree: "Yes", price: 500 }), ctx(editor)), errors.ValidationError, "a free course has no price");
        await assert.rejects(course().create!(courseInput(category.title, { startDate: "2027-02-01", endDate: "2027-01-01" }), ctx(editor)), errors.ValidationError);
        await assert.rejects(course().create!(courseInput(category.title, { officialUrl: "javascript:alert(1)" }), ctx(editor)), errors.ValidationError);
        await assert.rejects(course().create!(courseInput(category.title, { imageUrl: "//evil.example/x.png" }), ctx(editor)), errors.ValidationError);
        await assert.rejects(course().create!(courseInput(category.title, { faqs: "{not json" }), ctx(editor)), errors.ValidationError);

        const copy = await course().actions!.duplicate(String(first.id), ctx(editor));
        assert.equal(copy.status, "Draft");
        assert.equal(copy.title, "Bhagavad Gita Essentials (copy)");

        await course().update!(String(first.id), courseInput(category.title, { status: "Published" }), ctx(editor));
        await assert.rejects(course().remove!(String(first.id), ctx(editor)), errors.BusinessRule, "published courses are archived, not deleted");
        await course().remove!(String(second.id), ctx(editor));

        const published = await course().list({ ...listQuery, tab: "Published" }, ctx(editor));
        assert.equal(published.total, 1);
        assert.deepEqual(published.tabCounts, { Published: 1, Draft: 1, Archived: 0 });
        const filtered = await course().list({ ...listQuery, filters: { category: category.title }, q: "copy" }, ctx(editor));
        assert.deepEqual(filtered.rows.map((r) => r.title), ["Bhagavad Gita Essentials (copy)"]);
        assert.deepEqual((await course().options!()).category, [category.title]);
    });

    test("courses: only published courses in published top-level categories are public", async () => {
        const hidden = await categories.createCategory({ title: "Hidden Shelf", description: "Not live yet.", status: "Draft" }, actorOf(admin));
        await course().create!(courseInput(hidden.title, { status: "Published" }), ctx(editor));
        assert.equal((await catalog.listCourses()).length, 0, "a draft category hides its courses");
        assert.equal(await catalog.getCourseDetail("bhagavad-gita-essentials"), null);
        assert.equal((await catalog.listCollections()).length, 0);

        await categories.updateCategory(hidden.id, { title: "Hidden Shelf", description: "Now live.", status: "Published" }, actorOf(admin));
        assert.equal((await catalog.listCourses()).length, 1);

        const sub = await categories.createCategory({ title: "Nested", parentId: hidden.id }, actorOf(admin));
        await assert.rejects(course().create!(courseInput(sub.title, { title: "Nested Course" }), ctx(editor)), errors.ValidationError, "courses belong to a top-level collection");
    });

    test("website content: only published books, testimonials, videos and people are public", async () => {
        const books = resources.getResource("website/books");
        await books.create!({ title: "Draft Book", language: "English", status: "Draft" }, ctx(editor));
        await books.create!({
            title: "Live Book", language: "English", status: "Published",
            links: JSON.stringify([{ format: "Print", retailer: "Example Shop", url: "https://example.org/shop" }]),
        }, ctx(editor));
        await assert.rejects(books.create!({ title: "Bad Link", language: "English", links: JSON.stringify([{ format: "Print", retailer: "X", url: "javascript:alert(1)" }]) }, ctx(editor)), errors.ValidationError);
        assert.deepEqual((await publications.listBooks()).map((b) => b.title), ["Live Book"]);

        const testimonials = resources.getResource("marketing/testimonials");
        await testimonials.create!({ name: "Asha", format: "Text", quote: "A very clear and gentle course.", status: "Hidden" }, ctx(editor));
        await testimonials.create!({ name: "Ravi", format: "Text", quote: "I finished the course in two months.", status: "Published" }, ctx(editor));
        assert.deepEqual((await community.listTestimonials()).map((t) => t.name), ["Ravi"]);
        assert.equal((await testimonials.list({ ...listQuery, tab: "Hidden" }, ctx(editor))).total, 1, "Hidden is how the screen labels drafts");

        const videos = resources.getResource("website/videos");
        await videos.create!({ youtubeId: "https://youtu.be/dQw4w9WgXcQ", speaker: "Guest speaker", title: "A talk", status: "Published" }, ctx(editor));
        await assert.rejects(videos.create!({ youtubeId: "https://evil.example/watch?v=dQw4w9WgXcQ", speaker: "Guest", title: "Bad host" }, ctx(editor)), errors.ValidationError);
        assert.deepEqual((await community.listVideos()).map((v) => v.youtubeId), ["dQw4w9WgXcQ"]);

        const people = resources.getResource("website/people");
        await people.create!({ name: "Board Member", roleTitle: "Advisor", group: "Advisory Board", status: "Published" }, ctx(editor));
        await people.create!({ name: "Team Member", roleTitle: "Coordinator", group: "Team", status: "Draft" }, ctx(editor));
        assert.deepEqual((await community.listPeople("ADVISORY")).map((p) => p.name), ["Board Member"]);
        assert.deepEqual(await community.listPeople("TEAM"), []);

        const magazines = resources.getResource("website/magazines");
        await magazines.create!({ title: "Issue 1", issueLabel: "January", language: "English", status: "Published" }, ctx(editor));
        assert.deepEqual((await publications.listMagazines()).map((m) => m.title), ["Issue 1"]);
    });

    test("legal pages: only administrators publish, published text is immutable and versions replace each other", async () => {
        const legal = resources.getResource("website/legal-pages");
        const body = "These are the terms of use for the learning platform.";
        const draft = await legal.create!({ type: "Terms", title: "Terms of use", body, status: "Draft" }, ctx(editor));
        assert.equal(draft.version, 1);
        assert.equal(await site.getLegalDocument("TERMS"), null, "drafts are not public");

        const publish = (id: string, user: SessionUser, title = "Terms of use") => legal.update!(id, { type: "Terms", title, body, status: "Published" }, ctx(user));
        await assert.rejects(publish(String(draft.id), editor), errors.Forbidden, "a content editor cannot publish legal text");
        await assert.rejects(legal.create!({ type: "Terms", title: "Terms of use", body, status: "Published" }, ctx(editor)), errors.Forbidden);
        assert.equal((await publish(String(draft.id), admin)).status, "Published");
        await assert.rejects(publish(String(draft.id), admin), errors.BusinessRule, "published text is not edited in place");
        await assert.rejects(legal.remove!(String(draft.id), ctx(admin)), errors.BusinessRule);

        const next = await legal.actions!.duplicate(String(draft.id), ctx(editor));
        assert.equal(next.version, 2);
        assert.equal(next.status, "Draft");
        await publish(String(next.id), admin, "Terms of use (2027)");

        const current = await site.getLegalDocument("TERMS");
        assert.equal(current?.version, 2);
        assert.equal(current?.title, "Terms of use (2027)");
        assert.equal((await prisma.legalDocument.findUniqueOrThrow({ where: { id: String(draft.id) } })).status, "ARCHIVED", "the previous version is archived");
        assert.equal(await site.getLegalDocument("PRIVACY"), null);
    });

    test("site settings: defaults, validation and audited saves", async () => {
        const actor = actorOf(admin);
        const current = await site.getSiteSettings();
        assert.ok(current.contact.email.includes("@"), "defaults are served before anything is stored");

        const next = structuredClone(current);
        next.contact.email = "hello@ibmv.example";
        next.hero.reportedLearners = "40,000+";
        const saved = await siteSettings.saveSiteSettings(next, actor);
        assert.equal(saved.contact.email, "hello@ibmv.example");
        const reread = await site.getSiteSettings();
        assert.equal(reread.hero.reportedLearners, "40,000+");
        assert.deepEqual(reread.links, current.links, "untouched sections keep their values");

        await assert.rejects(siteSettings.saveSiteSettings({ ...next, contact: { ...next.contact, email: "not-an-email" } }, actor), errors.ValidationError);
        await assert.rejects(siteSettings.saveSiteSettings({ ...next, links: { ...next.links, donate: "javascript:alert(1)" } }, actor), errors.ValidationError);
        await assert.rejects(siteSettings.saveSiteSettings({ ...next, social: Array.from({ length: 13 }, () => next.social[0]) }, actor), errors.ValidationError);

        const event = await prisma.auditEvent.findFirstOrThrow({ where: { action: "settings.website" } });
        assert.deepEqual([...(event.after as { changed: string[] }).changed].sort(), ["contact", "hero"]);
    });

    test("bulk book enquiries: bots are discarded silently and people create a lead the team can see", async () => {
        await resources.getResource("website/books").create!({ title: "Live Book", language: "English", status: "Published" }, ctx(editor));
        const valid = {
            firstName: "Asha", lastName: "Rao", email: "Asha.Rao@Example.com", countryCode: "+91", mobile: "98765 43210",
            address: "12 Temple Road", city: "Pune", pincode: "411001", book: "Live Book", quantity: 25, consent: true,
            website: "", startedAt: Date.now() - 10_000,
        };
        const parse = (over: Record<string, unknown> = {}) => leadValidators.bulkBookEnquirySchema.parse({ ...valid, ...over });

        assert.throws(() => parse({ consent: false }), "consent is required");
        assert.throws(() => parse({ quantity: 0 }));
        assert.throws(() => parse({ email: "nope" }));

        const spy = mock.method(console, "info", () => undefined);
        try {
            assert.equal(await leadsService.createBulkBookEnquiry(parse({ website: "https://spam.example" })), false, "honeypot filled");
            assert.equal(await leadsService.createBulkBookEnquiry(parse({ startedAt: Date.now() - 400 })), false, "submitted too quickly");
            assert.equal(await prisma.lead.count(), 0, "discarded requests leave no trace");
            await assert.rejects(leadsService.createBulkBookEnquiry(parse({ book: "Unknown Title" })), errors.ValidationError);
            assert.equal(await prisma.lead.count(), 0);
            assert.equal(await leadsService.createBulkBookEnquiry(parse(), "10.0.0.9"), true);
        } finally {
            spy.mock.restore();
        }

        const lead = await prisma.lead.findFirstOrThrow({ include: { bulkBook: true } });
        assert.equal(lead.email, "asha.rao@example.com");
        assert.equal(lead.source, "BULK_BOOK");
        assert.equal(lead.consent, true);
        assert.equal(lead.bulkBook?.quantity, 25);
        assert.deepEqual(await auditActions("Lead"), ["lead.create"]);

        const leads = resources.getResource("marketing/leads");
        const listed = await leads.list(listQuery, ctx(support));
        assert.equal(listed.total, 1);
        assert.equal(listed.rows[0].stage, "New");
        assert.equal(listed.rows[0].source, "Bulk book enquiry");
        assert.match(String(listed.rows[0].details), /25 copies of Live Book/);

        await leads.update!(String(listed.rows[0].id), { name: "Asha Rao", email: "asha.rao@example.com", stage: "Contacted" }, ctx(support));
        assert.equal((await leads.list({ ...listQuery, tab: "Contacted" }, ctx(support))).total, 1);
        assert.deepEqual(await auditActions("Lead"), ["lead.create", "lead.stage"]);
    });

    test("every registered admin resource is marked as a live screen", async () => {
        const { liveScreens } = await import("@/lib/admin/live-screens");
        for (const key of resources.resourceKeys()) assert.ok(liveScreens.has(key), `${key} is registered but missing from liveScreens`);
    });

    test("role matrix for catalog, site content and leads", () => {
        const { can } = permissions;
        assert.ok(can("CONTENT_EDITOR", "courses:publish"));
        assert.ok(can("CONTENT_EDITOR", "siteContent:write"));
        assert.ok(can("CONTENT_EDITOR", "leads:read"));
        assert.ok(!can("CONTENT_EDITOR", "leads:write"));
        assert.ok(can("SUPPORT", "leads:write"));
        assert.ok(!can("SUPPORT", "courses:write"));
        assert.ok(!can("FINANCE", "courses:write"));
        assert.ok(!can("INSTRUCTOR", "siteContent:write"));
        assert.ok(!can("LEARNER", "courses:read"));
    });
});
