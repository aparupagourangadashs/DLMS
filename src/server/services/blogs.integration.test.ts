import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

type SessionUser = import("@/server/auth/session").SessionUser;
type BlogData = import("@/generated/prisma/client").Prisma.BlogUncheckedCreateInput;

const png = (extra = 64) => Buffer.concat([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"), Buffer.alloc(extra, 7)]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("B2b blogs (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let assets: typeof import("@/server/services/assets");
    let blogs: typeof import("@/server/services/public/blogs");
    let resources: typeof import("@/server/admin/resources");
    let permissions: typeof import("@/server/auth/permissions");
    let rateLimits: typeof import("@/server/http/rate-limit");
    let ist: typeof import("@/lib/ist");
    let errors: typeof import("@/server/http/errors");

    let storageDir = "";
    let admin: SessionUser;
    let editor: SessionUser;
    let author: SessionUser;

    const ctx = (user: SessionUser) => ({ user, ip: "127.0.0.1" });
    const listQuery = { q: "", filters: {} as Record<string, string>, page: 1, pageSize: 25, skip: 0, take: 25 };
    const blogScreen = () => resources.getResource("marketing/blogs");
    const library = () => resources.getResource("learning/asset-library");
    const fieldError = (field: string) => (error: unknown) => error instanceof errors.ValidationError && Boolean(error.fields?.[field]);

    async function createStaff(email: string, role: SessionUser["role"]): Promise<SessionUser> {
        const user = await prisma.user.create({ data: { email, kind: "STAFF", role, emailVerifiedAt: new Date(), staffProfile: { create: { displayName: email.split("@")[0] } } } });
        return { id: user.id, email, name: email, role, kind: "STAFF", branchIds: [] };
    }

    /** Uploads an image the way the form does and returns what the form field then holds. */
    async function upload(user: SessionUser, name = "picture.png", bytes = png()) {
        const uploaded = await assets.uploadAsset({ file: new File([new Uint8Array(bytes)], name), type: "Image" }, user);
        return JSON.stringify(uploaded);
    }

    const imageId = (field: unknown) => (JSON.parse(String(field)) as { id: string }).id;

    /** A blog written straight to the database, for the public pages and the list. */
    const make = (title: string, over: Partial<BlogData> = {}) =>
        prisma.blog.create({ data: { slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title, body: `Text of ${title}.`, status: "PUBLISHED", publishedAt: new Date("2026-11-10T06:00:00Z"), ...over } });

    async function wipe() {
        await prisma.blog.deleteMany();
        await prisma.asset.deleteMany();
        await prisma.auditEvent.deleteMany();
        await prisma.user.deleteMany({ where: { email: { startsWith: "bl-gone" } } });
        fs.rmSync(storageDir, { recursive: true, force: true });
    }

    before(async () => {
        storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "ibmv-blogs-"));
        process.env.STORAGE_LOCAL_DIR = storageDir;
        process.env.UPLOAD_MAX_MB = "1";
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        assets = await import("@/server/services/assets");
        blogs = await import("@/server/services/public/blogs");
        resources = await import("@/server/admin/resources");
        permissions = await import("@/server/auth/permissions");
        rateLimits = await import("@/server/http/rate-limit");
        ist = await import("@/lib/ist");
        errors = await import("@/server/http/errors");

        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "bl-" } } });
        admin = await createStaff("bl-admin@ibmv.test", "ADMIN");
        editor = await createStaff("bl-editor@ibmv.test", "CONTENT_EDITOR");
        author = await createStaff("bl-author@ibmv.test", "INSTRUCTOR");
    });

    beforeEach(async () => {
        await wipe();
        rateLimits.resetRateLimits();
    });

    after(async () => {
        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "bl-" } } });
        await prisma.$disconnect();
    });

    const form = (over: Record<string, unknown> = {}) => ({
        name: "BL Why study the Gita today?",
        slug: "",
        summary: "",
        cover: "",
        author: "",
        status: "Draft",
        body: "The Gita is studied for its clarity.\n\n- First point\n- Second point",
        ...over,
    });

    test("blogs: the form is checked before anything is saved; the web address is made from the title and stays unique", async () => {
        const bad = (over: Record<string, unknown>) => blogScreen().create!(form(over), ctx(editor));
        await assert.rejects(bad({ name: "ab" }), fieldError("name"));
        await assert.rejects(bad({ body: "" }), fieldError("body"));
        await assert.rejects(bad({ body: "too short" }), fieldError("body"));
        await assert.rejects(bad({ body: "x".repeat(100_001) }), fieldError("body"));
        for (const slug of ["Has Capitals", "double--hyphen", "-leading", "trailing-", "with space", "../x", "under_score"]) await assert.rejects(bad({ slug }), fieldError("slug"), slug);
        await assert.rejects(bad({ slug: "a".repeat(151) }), fieldError("slug"));
        await assert.rejects(bad({ summary: "s".repeat(401) }), fieldError("summary"));
        await assert.rejects(bad({ status: "Live" }), fieldError("status"));
        await assert.rejects(bad({ author: "Nobody" }), fieldError("author"));
        await assert.rejects(bad({ cover: await upload(admin) }), fieldError("cover"), "someone else's upload cannot be used");
        await assert.rejects(bad({ cover: JSON.stringify({ id: "missing" }) }), fieldError("cover"));
        assert.equal(await prisma.blog.count(), 0, "refused articles leave nothing behind");

        const created = await blogScreen().create!(form(), ctx(editor));
        assert.deepEqual(
            [created.slug, created.status, created.author, created.byline, created.publishedOn, created.views, created.createdOn, created.thumbnail],
            ["bl-why-study-the-gita-today", "Draft", "bl-editor", "bl-editor", "", 0, ist.istToday(), ""],
            "the author is the person who wrote it unless the form names someone else",
        );

        const second = await blogScreen().create!(form(), ctx(editor));
        const third = await blogScreen().create!(form(), ctx(editor));
        assert.deepEqual([second.slug, third.slug], ["bl-why-study-the-gita-today-2", "bl-why-study-the-gita-today-3"]);
        await assert.rejects(bad({ slug: "bl-why-study-the-gita-today-2" }), (error: unknown) => error instanceof errors.Conflict && Boolean(error.fields?.slug), "a chosen address cannot be taken twice");
        assert.equal((await blogScreen().create!(form({ name: "BL Second thing", slug: "my-own-address" }), ctx(editor))).slug, "my-own-address");

        const devanagari = await blogScreen().create!(form({ name: "\u092d\u0915\u094d\u0924\u093f \u092f\u094b\u0917" }), ctx(editor));
        const another = await blogScreen().create!(form({ name: "\u092d\u0915\u094d\u0924\u093f \u092f\u094b\u0917" }), ctx(editor));
        assert.deepEqual([devanagari.slug, another.slug], ["article", "article-2"], "a title with no Latin letters still gets a web address");

        const picked = await blogScreen().create!(form({ name: "BL Named author", author: "bl-author" }), ctx(editor));
        assert.deepEqual([picked.author, picked.byline], ["bl-author", "bl-author"]);

        // A cover is claimed from the editor's own upload, named after the article, and keeps the image in use.
        const withCover = await blogScreen().create!(form({ name: "BL With cover", cover: await upload(editor, "cover.png", png(80)) }), ctx(editor));
        const coverId = imageId(withCover.cover);
        assert.equal(withCover.thumbnail, `/api/assets/${coverId}/file`);
        const asset = await prisma.asset.findUniqueOrThrow({ where: { id: coverId } });
        assert.deepEqual([asset.status, asset.name], ["READY", "BL With cover"]);
        assert.equal((await library().get!(coverId, ctx(admin))).usage, "Used");
        await assert.rejects(library().remove!(coverId, ctx(admin)), errors.Conflict, "an image in use cannot be deleted");

        assert.ok(permissions.can("CONTENT_EDITOR", "blogs:write") && permissions.can("CONTENT_EDITOR", "blogs:delete"));
        for (const role of ["INSTRUCTOR", "SUPPORT", "FINANCE"] as const) assert.equal(permissions.can(role, "blogs:read"), false, role);
        await assert.rejects(blogScreen().get!("missing", ctx(editor)), errors.NotFound);
    });

    test("blogs: the first publication date is kept; the address, author and cover can be changed; only unpublished articles are deleted", async () => {
        const row = await blogScreen().create!(form({ name: "BL Lifecycle" }), ctx(editor));
        const id = String(row.id);
        const edit = async (over: Record<string, unknown>) => blogScreen().update!(id, { ...(await blogScreen().get!(id, ctx(editor))), ...over }, ctx(editor));
        const stored = () => prisma.blog.findUniqueOrThrow({ where: { id } });

        const published = await edit({ status: "Published" });
        const first = (await stored()).publishedAt;
        assert.ok(first, "publishing stamps the date");
        assert.equal(published.publishedOn, ist.toIst(first).date);
        const hidden = await edit({ status: "Hidden" });
        assert.deepEqual([hidden.status, hidden.publishedOn], ["Hidden", published.publishedOn], "hiding keeps the date");
        await sleep(5);
        await edit({ status: "Published" });
        assert.equal((await stored()).publishedAt?.getTime(), first.getTime(), "publishing again does not move it");
        await edit({ status: "Draft" });
        const actions = (await prisma.auditEvent.findMany({ where: { entity: "Blog", entityId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] })).map((event) => event.action);
        assert.deepEqual(actions, ["blog.create", "blog.publish", "blog.hide", "blog.publish", "blog.unpublish"]);

        // The web address.
        assert.equal((await edit({ slug: "bl-renamed-address" })).slug, "bl-renamed-address");
        assert.equal((await edit({ slug: "" })).slug, "bl-renamed-address", "an empty address keeps the current one");
        await blogScreen().create!(form({ name: "BL Other", slug: "bl-other" }), ctx(editor));
        await assert.rejects(edit({ slug: "bl-other" }), errors.Conflict);

        // The author: a named person, the current one when the field is empty, and a departed one keeps the byline.
        const byAuthor = await edit({ author: "bl-author" });
        assert.deepEqual([byAuthor.author, byAuthor.byline], ["bl-author", "bl-author"]);
        await assert.rejects(edit({ author: "Nobody" }), fieldError("author"));
        assert.equal((await edit({ author: "" })).author, "bl-author", "an empty author keeps the current one");
        const gone = await createStaff("bl-gone@ibmv.test", "CONTENT_EDITOR");
        const old = await make("BL Old article", { authorId: gone.id, status: "DRAFT", publishedAt: null });
        await prisma.user.update({ where: { id: gone.id }, data: { status: "ARCHIVED" } });
        const oldRow = await blogScreen().get!(old.id, ctx(editor));
        assert.deepEqual([oldRow.author, oldRow.byline], ["", "bl-gone"], "a departed author is not offered but keeps the byline");
        assert.equal((await blogScreen().update!(old.id, { ...oldRow, summary: "Edited." }, ctx(editor))).byline, "bl-gone", "saving without choosing an author keeps them");

        // The cover.
        const withCover = await edit({ cover: await upload(editor, "a.png", png(70)) });
        const firstCover = imageId(withCover.cover);
        assert.equal((await library().get!(firstCover, ctx(admin))).usage, "Used");
        const swapped = await edit({ cover: await upload(editor, "b.png", png(90)) });
        const secondCover = imageId(swapped.cover);
        assert.notEqual(secondCover, firstCover);
        assert.equal((await library().get!(firstCover, ctx(admin))).usage, "Unused", "the old cover is free again");
        assert.equal(imageId((await edit({})).cover), secondCover, "saving without choosing a file keeps the cover");
        const without = await edit({ cover: "" });
        assert.deepEqual([without.cover, without.thumbnail], ["", ""]);
        assert.equal((await library().get!(secondCover, ctx(admin))).usage, "Unused");

        // Deleting.
        await edit({ status: "Published" });
        await assert.rejects(blogScreen().remove!(id, ctx(editor)), errors.BusinessRule, "a published article cannot be deleted");
        await edit({ status: "Hidden" });
        await blogScreen().remove!(id, ctx(editor));
        assert.equal(await prisma.blog.count({ where: { id } }), 0);
        assert.ok(await prisma.auditEvent.findFirst({ where: { entity: "Blog", entityId: id, action: "blog.delete" } }), "the deletion is audited");
    });

    test("blogs: listed with search, visibility, dates and sorting; the list leaves out the text; a copy starts as a draft", async () => {
        await make("BL Kirtan notes", { views: 50, authorId: author.id, createdAt: new Date("2026-11-02T18:00:00Z"), publishedAt: new Date("2026-11-02T18:30:00Z") });
        await make("BL Sanskrit tips", { views: 300, summary: "How to learn Sanskrit with kirtan.", createdAt: new Date("2026-11-02T19:00:00Z"), publishedAt: new Date("2026-11-05T06:00:00Z") });
        await make("BL Student story", { status: "DRAFT", publishedAt: null, createdAt: new Date("2026-11-10T06:00:00Z") });
        await make("BL Class guide", { status: "HIDDEN", views: 900, createdAt: new Date("2026-11-20T06:00:00Z"), publishedAt: new Date("2026-11-12T06:00:00Z") });
        const names = async (query: Record<string, unknown> = {}) => (await blogScreen().list({ ...listQuery, ...query }, ctx(editor))).rows.map((row) => row.name);

        const all = await blogScreen().list(listQuery, ctx(editor));
        assert.equal(all.total, 4);
        assert.deepEqual(all.rows.map((row) => row.name), ["BL Class guide", "BL Student story", "BL Sanskrit tips", "BL Kirtan notes"], "the newest comes first");
        assert.ok(all.rows.every((row) => !("body" in row)), "the list does not carry the article text");
        const kirtan = all.rows.find((row) => row.name === "BL Kirtan notes")!;
        assert.deepEqual([kirtan.createdOn, kirtan.publishedOn, kirtan.byline, kirtan.author, kirtan.views], ["2026-11-02", "2026-11-03", "bl-author", "bl-author", 50], "dates are IST days");
        assert.match(String((await blogScreen().get!(String(kirtan.id), ctx(editor))).body), /Text of BL Kirtan notes/);

        assert.deepEqual(await names({ q: "kirtan" }), ["BL Sanskrit tips", "BL Kirtan notes"], "search looks at the title and the summary");
        assert.deepEqual(await names({ q: "bl-student" }), ["BL Student story"], "and at the web address");
        assert.deepEqual(await names({ filters: { status: "Hidden" } }), ["BL Class guide"]);
        assert.deepEqual(await names({ filters: { status: "Published" } }), ["BL Sanskrit tips", "BL Kirtan notes"]);
        assert.deepEqual(await names({ filters: { status: "Nope" } }), []);
        assert.deepEqual(await names({ from: "2026-11-03", to: "2026-11-03" }), ["BL Sanskrit tips"], "00:30 IST on the 3rd is in, 23:30 IST on the 2nd is out");
        assert.deepEqual(await names({ to: "2026-11-02" }), ["BL Kirtan notes"]);
        assert.deepEqual(await names({ from: "2026-11-10" }), ["BL Class guide", "BL Student story"]);
        assert.deepEqual(await names({ sort: { key: "views", dir: "desc" } }), ["BL Class guide", "BL Sanskrit tips", "BL Kirtan notes", "BL Student story"]);
        assert.deepEqual(await names({ sort: { key: "views", dir: "asc" } }), ["BL Student story", "BL Kirtan notes", "BL Sanskrit tips", "BL Class guide"]);
        assert.deepEqual(await names({ sort: { key: "name", dir: "asc" } }), ["BL Class guide", "BL Kirtan notes", "BL Sanskrit tips", "BL Student story"]);
        assert.deepEqual(await names({ sort: { key: "publishedOn", dir: "desc" } }), ["BL Class guide", "BL Sanskrit tips", "BL Kirtan notes", "BL Student story"]);
        assert.deepEqual(await names({ page: 2, pageSize: 3, skip: 3, take: 3 }), ["BL Kirtan notes"]);
        const authors = (await blogScreen().options!()).author;
        assert.ok(["bl-admin", "bl-editor", "bl-author"].every((label) => authors.includes(label)), "any active staff member can be the author");

        const source = await blogScreen().create!(form({ name: "BL Original", status: "Published", summary: "A summary.", author: "bl-author", cover: await upload(editor, "o.png", png(75)) }), ctx(editor));
        const copy = await blogScreen().actions!.duplicate(String(source.id), ctx(editor));
        assert.deepEqual(
            [copy.name, copy.slug, copy.status, copy.views, copy.publishedOn, copy.byline, copy.summary],
            ["BL Original (copy)", "bl-original-copy", "Draft", 0, "", "bl-author", "A summary."],
            "a copy starts as a draft",
        );
        assert.equal(imageId(copy.cover), imageId(source.cover), "and shares the cover");
        assert.equal((await blogScreen().actions!.duplicate(String(source.id), ctx(editor))).slug, "bl-original-copy-2");
    });

    test("public blogs: only published articles, newest first and paged; covers, bylines and IST dates; drafts and hidden ones are not found", async () => {
        const cover = await prisma.asset.create({ data: { type: "IMAGE", name: "BL cover", status: "READY" } });
        const pending = await prisma.asset.create({ data: { type: "IMAGE", name: "BL pending", status: "STAGED" } });
        await make("BL A", { slug: "bl-a", body: "Opening paragraph of A.\n\nMore text.", authorId: author.id, publishedAt: new Date("2026-11-10T06:00:00Z") });
        await make("BL B", { slug: "bl-b", summary: "Written summary for B.", body: "# Heading\n\nBody of B.", coverAssetId: cover.id, authorId: author.id, publishedAt: new Date("2026-11-19T20:00:00Z") });
        await make("BL C", { slug: "bl-c", coverAssetId: pending.id, publishedAt: new Date("2026-11-15T06:00:00Z") });
        await make("BL F", { slug: "bl-f", publishedAt: new Date("2026-11-01T06:00:00Z") });
        await make("BL Draft", { slug: "bl-draft", status: "DRAFT", publishedAt: null });
        await make("BL Hidden", { slug: "bl-hidden", status: "HIDDEN" });

        const everything = await blogs.listBlogs();
        assert.deepEqual(everything.items.map((item) => item.slug), ["bl-b", "bl-c", "bl-a", "bl-f"], "newest first, without the draft and the hidden one");
        assert.deepEqual([everything.total, everything.page, everything.pages], [4, 1, 1]);
        const [b, c, a, f] = everything.items;
        assert.deepEqual(
            b,
            { id: b.id, slug: "bl-b", title: "BL B", excerpt: "Written summary for B.", coverUrl: `/api/assets/${cover.id}/file`, author: "bl-author", publishedOn: "2026-11-20", minutes: 1 },
            "01:30 IST on the 20th is that day",
        );
        assert.equal(a.excerpt, "Opening paragraph of A.", "without a summary the opening paragraph is used");
        assert.equal(c.coverUrl, null, "a cover that is not ready is left out");
        assert.equal(f.author, null);

        const first = await blogs.listBlogs(1, 3);
        assert.deepEqual([first.items.map((item) => item.slug), first.pages], [["bl-b", "bl-c", "bl-a"], 2]);
        assert.deepEqual((await blogs.listBlogs(2, 3)).items.map((item) => item.slug), ["bl-f"]);
        assert.equal((await blogs.listBlogs(9, 3)).page, 2, "a page past the end gives the last one");
        assert.equal((await blogs.listBlogs(Number.NaN, 3)).page, 1);
        assert.equal((await blogs.listBlogs(-4, 3)).page, 1);

        const detail = await blogs.getBlog("bl-b");
        assert.deepEqual([detail?.title, detail?.summary, detail?.body], ["BL B", "Written summary for B.", "# Heading\n\nBody of B."]);
        assert.equal((await blogs.getBlog("bl-a"))?.summary, "");
        for (const slug of ["bl-draft", "bl-hidden", "missing"]) assert.equal(await blogs.getBlog(slug), null, slug);

        assert.equal(await blogs.hasPublishedBlogs(), true);
        await prisma.blog.updateMany({ where: { status: "PUBLISHED" }, data: { status: "HIDDEN" } });
        assert.equal(await blogs.hasPublishedBlogs(), false, "the menu leaves the link out when nothing is published");
        assert.deepEqual(await blogs.listBlogs(), { items: [], total: 0, page: 1, pages: 1 });
    });

    test("blog views: counted for published articles, once per visitor per hour, without touching the edit time", async () => {
        const created = await make("BL View A", { slug: "bl-view-a" });
        await make("BL View B", { slug: "bl-view-b" });
        await make("BL View Draft", { slug: "bl-view-draft", status: "DRAFT", publishedAt: null });
        const views = async (slug: string) => (await prisma.blog.findUniqueOrThrow({ where: { slug } })).views;

        assert.deepEqual(await blogs.recordBlogView("bl-view-a", "10.0.0.1"), { counted: true });
        assert.deepEqual(await blogs.recordBlogView("bl-view-a", "10.0.0.1"), { counted: false }, "the same visitor again within the hour");
        assert.equal(await views("bl-view-a"), 1);
        assert.deepEqual(await blogs.recordBlogView("bl-view-a", "10.0.0.2"), { counted: true }, "another visitor");
        assert.deepEqual(await blogs.recordBlogView("bl-view-b", "10.0.0.1"), { counted: true }, "another article");
        assert.deepEqual([await views("bl-view-a"), await views("bl-view-b")], [2, 1]);
        const stored = await prisma.blog.findUniqueOrThrow({ where: { slug: "bl-view-a" } });
        assert.equal(stored.updatedAt.getTime(), created.updatedAt.getTime(), "counting a view is not an edit");

        await assert.rejects(blogs.recordBlogView("bl-view-draft", "10.0.0.3"), errors.NotFound);
        await assert.rejects(blogs.recordBlogView("missing", "10.0.0.3"), errors.NotFound);
        assert.equal(await views("bl-view-draft"), 0);
    });
});
