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

const png = (extra = 64) => Buffer.concat([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"), Buffer.alloc(extra, 7)]);
const pdf = (text = "hello") => Buffer.from(`%PDF-1.4\n${text}\n%%EOF`);
const mp4 = () => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.alloc(32, 1)]);
const zip = () => Buffer.concat([Buffer.from("PK\u0003\u0004", "latin1"), Buffer.alloc(32, 2)]);

describe("B2b asset library, uploads and file lessons (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let registration: typeof import("@/server/services/registration");
    let assets: typeof import("@/server/services/assets");
    let content: typeof import("@/server/services/learner-content");
    let serve: typeof import("@/server/storage/serve");
    let resources: typeof import("@/server/admin/resources");
    let permissions: typeof import("@/server/auth/permissions");
    let errors: typeof import("@/server/http/errors");

    let storageDir = "";
    let admin: SessionUser;
    let editor: SessionUser;
    let teacher: SessionUser;

    const ctx = (user: SessionUser) => ({ user, ip: "127.0.0.1" });
    const listQuery = { q: "", filters: {} as Record<string, string>, page: 1, pageSize: 25, skip: 0, take: 25 };
    const library = () => resources.getResource("learning/asset-library");
    const modules = () => resources.getResource("learning/module-library");
    const file = (name: string, bytes: Buffer) => new File([new Uint8Array(bytes)], name, { type: "application/octet-stream" });
    const fieldError = (field: string) => (error: unknown) => error instanceof errors.ValidationError && Boolean(error.fields?.[field]);
    const invalid = (pattern: RegExp) => (error: unknown) => error instanceof errors.AppError && error.status === 400 && pattern.test(error.message);
    const storedFiles = () => (fs.existsSync(storageDir) ? fs.readdirSync(storageDir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).length : 0);

    async function createStaff(email: string, role: SessionUser["role"]): Promise<SessionUser> {
        const user = await prisma.user.create({ data: { email, kind: "STAFF", role, emailVerifiedAt: new Date(), staffProfile: { create: { displayName: email.split("@")[0] } } } });
        return { id: user.id, email, name: email, role, kind: "STAFF", branchIds: [] };
    }

    /** Uploads a file and saves it from the form, as the Asset Library does. */
    async function addAsset(user: SessionUser, type: string, name: string, upload: File) {
        const uploaded = await assets.uploadAsset({ file: upload, type }, user);
        return library().create!({ type, name, description: "", localFile: JSON.stringify(uploaded), link: "" }, ctx(user));
    }

    async function wipe() {
        await prisma.enrolment.deleteMany({ where: { user: { email: { startsWith: "as." } } } });
        await prisma.courseModule.deleteMany({ where: { module: { name: { startsWith: "AS " } } } });
        await prisma.module.deleteMany({ where: { name: { startsWith: "AS " } } });
        await prisma.course.deleteMany({ where: { slug: { startsWith: "as-" } } });
        await prisma.asset.deleteMany();
        await prisma.auditEvent.deleteMany();
        await prisma.counter.deleteMany();
        await prisma.user.deleteMany({ where: { email: { startsWith: "as." } } });
        fs.rmSync(storageDir, { recursive: true, force: true });
    }

    before(async () => {
        storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "ibmv-assets-"));
        process.env.STORAGE_LOCAL_DIR = storageDir;
        process.env.UPLOAD_MAX_MB = "1";
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        registration = await import("@/server/services/registration");
        assets = await import("@/server/services/assets");
        content = await import("@/server/services/learner-content");
        serve = await import("@/server/storage/serve");
        resources = await import("@/server/admin/resources");
        permissions = await import("@/server/auth/permissions");
        errors = await import("@/server/http/errors");

        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "as-" } } });
        await prisma.category.deleteMany({ where: { slug: "as-cat" } });
        await prisma.category.create({ data: { slug: "as-cat", title: "AS Category", description: "Test category", status: "PUBLISHED" } });
        admin = await createStaff("as-admin@ibmv.test", "ADMIN");
        editor = await createStaff("as-editor@ibmv.test", "CONTENT_EDITOR");
        teacher = await createStaff("as-teacher@ibmv.test", "INSTRUCTOR");
    });

    beforeEach(wipe);

    after(async () => {
        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "as-" } } });
        await prisma.category.deleteMany({ where: { slug: "as-cat" } });
        await prisma.$disconnect();
    });

    test("upload: the extension, the content and the size must fit the type; identical files are stored once", async () => {
        const uploaded = await assets.uploadAsset({ file: file("Cover.PNG", png()), type: "Image" }, admin);
        assert.equal(uploaded.name, "Cover.PNG");
        assert.equal(uploaded.size, png().length);
        const staged = await prisma.asset.findUniqueOrThrow({ where: { id: uploaded.id } });
        assert.deepEqual([staged.status, staged.type, staged.mimeType, staged.uploadedById], ["STAGED", "IMAGE", "image/png", admin.id]);
        assert.match(staged.storageKey ?? "", /^[a-f0-9]{2}\/[a-f0-9]{32}$/, "the stored name is random and says nothing about the file");
        assert.equal(storedFiles(), 1);

        await assert.rejects(assets.uploadAsset({ file: file("notes.pdf", pdf()), type: "Image" }, admin), invalid(/must be \.png/), "wrong extension for the type");
        await assert.rejects(assets.uploadAsset({ file: file("evil.png", Buffer.from("MZ\u0090\u0000\u0003\u0000\u0000\u0000executable")), type: "Image" }, admin), invalid(/does not look like a real \.png/), "content must match the extension");
        await assert.rejects(assets.uploadAsset({ file: file("page.html", Buffer.from("<p>\u0000</p>")), type: "Text/HTML" }, admin), invalid(/real \.html/), "text files may not hold binary data");
        await assert.rejects(assets.uploadAsset({ file: file("empty.pdf", Buffer.alloc(0)), type: "PDF" }, admin), invalid(/empty/));
        await assert.rejects(assets.uploadAsset({ file: file("watch.webm", Buffer.alloc(10)), type: "YouTube" }, admin), invalid(/no file/), "link types take no file");
        await assert.rejects(assets.uploadAsset({ file: file("x.png", png()), type: "Nonsense" }, admin), invalid(/Choose a file type/));
        await assert.rejects(
            assets.uploadAsset({ file: file("big.pdf", Buffer.concat([pdf(), Buffer.alloc(1_100_000)])), type: "PDF" }, admin),
            (error) => error instanceof errors.AppError && error.status === 413,
            "larger than UPLOAD_MAX_MB",
        );
        assert.equal(storedFiles(), 1, "refused files leave nothing behind");

        const twin = await assets.uploadAsset({ file: file("copy-of-cover.png", png()), type: "Image" }, admin);
        const rows = await prisma.asset.findMany({ where: { id: { in: [uploaded.id, twin.id] } } });
        assert.equal(new Set(rows.map((r) => r.storageKey)).size, 1, "two assets with the same content share one stored file");
        assert.equal(storedFiles(), 1);

        const tricky = await assets.uploadAsset({ file: file("..\\..\\secret/../x.png", png(10)), type: "Image" }, admin);
        assert.equal(tricky.name, "x.png", "paths in a file name are dropped");
        for (const [name, bytes, type] of [["a.mp4", mp4(), "Video"], ["b.zip", zip(), "Zip"], ["c.pdf", pdf("c"), "PDF"], ["d.zip", zip(), "SCORM Zip"]] as const) {
            await assert.doesNotReject(assets.uploadAsset({ file: file(name, bytes), type }, admin), name);
        }
    });

    test("library: an upload becomes an asset when the form is saved, and only its uploader can save it", async () => {
        const upload = await assets.uploadAsset({ file: file("Lesson notes.pdf", pdf("notes")), type: "PDF" }, editor);
        const form = { type: "PDF", name: "AS Lesson notes", description: "Week one", localFile: JSON.stringify(upload), link: "" };

        await assert.rejects(library().create!(form, ctx(admin)), fieldError("localFile"), "someone else's upload cannot be saved");
        await assert.rejects(library().create!({ ...form, type: "Image" }, ctx(editor)), fieldError("type"), "the uploaded file is not an image");
        await assert.rejects(library().create!({ ...form, localFile: "" }, ctx(editor)), fieldError("localFile"));
        await assert.rejects(library().create!({ ...form, localFile: JSON.stringify({ id: "missing" }) }, ctx(editor)), fieldError("localFile"));
        await assert.rejects(library().create!({ ...form, type: "Hologram" }, ctx(editor)), fieldError("type"));
        await assert.rejects(library().create!({ ...form, name: "" }, ctx(editor)), fieldError("name"));
        assert.equal((await library().list(listQuery, ctx(editor))).total, 0, "a staged upload is not in the library yet");

        const saved = await library().create!(form, ctx(editor));
        assert.deepEqual([saved.name, saved.type, saved.usage, saved.fileName, saved.downloads, saved.uploadedBy], ["AS Lesson notes", "PDF", "Unused", "Lesson notes.pdf", 0, "as-editor"]);
        assert.equal(JSON.parse(String(saved.localFile)).id, saved.id, "the form later sends the asset's own id back");
        assert.equal((await library().list(listQuery, ctx(editor))).total, 1);
        await assert.rejects(library().create!(form, ctx(editor)), fieldError("localFile"), "an upload is used once");

        const youtube = await library().create!({ type: "YouTube", name: "AS Talk", description: "", localFile: "", link: "https://youtu.be/dQw4w9WgXcQ" }, ctx(editor));
        assert.equal(youtube.link, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "a YouTube address is stored in one form");
        const site = await library().create!({ type: "Link/Embed", name: "AS Reading", description: "", localFile: "", link: "https://example.org/read" }, ctx(editor));
        assert.equal(site.fileName, "example.org");
        for (const link of ["", "http://example.org", "javascript:alert(1)"]) await assert.rejects(library().create!({ type: "Link/Embed", name: "AS Bad", description: "", localFile: "", link }, ctx(editor)), fieldError("link"), link || "empty");
        await assert.rejects(library().create!({ type: "YouTube", name: "AS Bad", description: "", localFile: "", link: "https://example.org/video" }, ctx(editor)), fieldError("link"));

        const events = await prisma.auditEvent.findMany({ where: { entity: "Asset" } });
        assert.equal(events.filter((e) => e.action === "asset.create").length, 3);
        assert.ok(permissions.can("CONTENT_EDITOR", "assets:write") && permissions.can("CONTENT_EDITOR", "assets:delete"));
        assert.ok(permissions.can("INSTRUCTOR", "assets:read") && !permissions.can("INSTRUCTOR", "assets:write"));
        assert.ok(!permissions.can("SUPPORT", "assets:read") && !permissions.can("FINANCE", "assets:read"));
        assert.ok(permissions.can(teacher.role, "assets:read") && !permissions.can(teacher.role, "assets:write"));
    });

    test("library: edit, replace the file, filter, summarise and delete", async () => {
        const cover = await addAsset(admin, "Image", "AS Cover", file("cover.png", png()));
        const notes = await addAsset(admin, "PDF", "AS Notes", file("notes.pdf", pdf("one")));
        const duplicate = await addAsset(admin, "Image", "AS Cover again", file("same.png", png()));
        const talk = await library().create!({ type: "YouTube", name: "AS Talk", description: "", localFile: "", link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, ctx(admin));

        const all = await library().list(listQuery, ctx(admin));
        assert.deepEqual(all.rows.map((r) => r.name).sort(), ["AS Cover", "AS Cover again", "AS Notes", "AS Talk"]);
        const cards = new Map(all.summary!.map((c) => [c.label, c]));
        assert.equal(cards.get("Total assets")?.value, "4");
        assert.equal(cards.get("Unused assets")?.value, "4");
        assert.equal(cards.get("Storage used")?.hint, "2 stored files", "the duplicate cover is stored once");
        assert.equal(cards.get("Storage saved")?.value, `${png().length} B`, "and the saving is what the second copy would have taken");
        assert.ok(["AS Cover", "AS Cover again"].includes(String(cards.get("Largest asset")?.hint)), "the two covers are the same size");
        assert.deepEqual((await library().list({ ...listQuery, filters: { type: "PDF" } }, ctx(admin))).rows.map((r) => r.name), ["AS Notes"]);
        assert.deepEqual((await library().list({ ...listQuery, filters: { type: "Nope" } }, ctx(admin))).rows, []);
        assert.deepEqual((await library().list({ ...listQuery, q: "again" }, ctx(admin))).rows.map((r) => r.name), ["AS Cover again"]);
        assert.deepEqual((await library().list({ ...listQuery, q: "notes.pdf" }, ctx(admin))).rows.map((r) => r.name), ["AS Notes"], "search covers the file name");

        // A name and description can change; the file stays.
        const renamed = await library().update!(String(notes.id), { ...notes, name: "AS Notes (final)", description: "Reviewed" }, ctx(editor));
        assert.deepEqual([renamed.name, renamed.description, renamed.sizeLabel], ["AS Notes (final)", "Reviewed", notes.sizeLabel]);

        // Choosing a new file replaces the old one under the same asset.
        const before = await prisma.asset.findUniqueOrThrow({ where: { id: String(notes.id) } });
        const replacement = await assets.uploadAsset({ file: file("notes-v2.pdf", pdf("two, a little longer")), type: "PDF" }, admin);
        const replaced = await library().update!(String(notes.id), { ...renamed, localFile: JSON.stringify(replacement) }, ctx(admin));
        assert.equal(replaced.id, notes.id);
        assert.equal(replaced.fileName, "notes-v2.pdf");
        const after = await prisma.asset.findUniqueOrThrow({ where: { id: String(notes.id) } });
        assert.notEqual(after.storageKey, before.storageKey);
        assert.equal(await prisma.asset.count({ where: { id: replacement.id } }), 0, "the staged copy is folded into the asset");
        assert.equal(storedFiles(), 2, "the old file is removed once nothing uses it");

        // What cannot change.
        await assert.rejects(library().update!(String(notes.id), { ...replaced, type: "Doc" }, ctx(admin)), fieldError("type"), "a file keeps its type");
        await assert.rejects(library().update!(String(notes.id), { ...replaced, type: "Link/Embed", link: "https://example.org" }, ctx(admin)), fieldError("type"), "a file does not become a link");
        const moved = await library().update!(String(talk.id), { ...talk, type: "Link/Embed", link: "https://example.org/talk" }, ctx(admin));
        assert.equal(moved.type, "Link/Embed", "one kind of link can become the other");
        await assert.rejects(library().get!("missing", ctx(admin)), errors.NotFound);

        // Deleting keeps a file another asset still uses, and removes it when the last one goes.
        await library().remove!(String(cover.id), ctx(admin));
        assert.equal(storedFiles(), 2, "the duplicate still points at the cover's file");
        await library().remove!(String(duplicate.id), ctx(admin));
        assert.equal(storedFiles(), 1);
        await library().remove!(String(notes.id), ctx(admin));
        assert.equal(storedFiles(), 0);
        assert.ok((await prisma.auditEvent.findMany({ where: { entity: "Asset", action: "asset.delete" } })).length >= 3);
    });

    test("staged uploads that were never saved are removed after a day", async () => {
        const stale = await assets.uploadAsset({ file: file("old.png", png(5)), type: "Image" }, admin);
        const fresh = await assets.uploadAsset({ file: file("new.pdf", pdf("new")), type: "PDF" }, admin);
        await prisma.asset.update({ where: { id: stale.id }, data: { createdAt: new Date(Date.now() - 2 * 86_400_000) } });
        await assets.purgeStaged();
        assert.equal(await prisma.asset.count({ where: { id: stale.id } }), 0);
        assert.equal(await prisma.asset.count({ where: { id: fresh.id } }), 1);
        assert.equal(storedFiles(), 1);
        const kept = await addAsset(admin, "PDF", "AS Kept", file("kept.pdf", pdf("kept")));
        await prisma.asset.update({ where: { id: String(kept.id) }, data: { createdAt: new Date(Date.now() - 9 * 86_400_000) } });
        await assets.purgeStaged();
        assert.equal(await prisma.asset.count({ where: { id: String(kept.id) } }), 1, "a saved asset is never purged");
    });

    test("serving: ranges for seeking, caching for public images, and what only staff may fetch", async () => {
        assert.deepEqual(serve.parseRange("bytes=0-9", 100), { start: 0, end: 9 });
        assert.deepEqual(serve.parseRange("bytes=90-", 100), { start: 90, end: 99 });
        assert.deepEqual(serve.parseRange("bytes=-10", 100), { start: 90, end: 99 });
        assert.deepEqual(serve.parseRange("bytes=50-500", 100), { start: 50, end: 99 }, "an end past the file is cut to it");
        for (const header of ["bytes=100-", "bytes=9-3", "bytes=-0"]) assert.equal(serve.parseRange(header, 100), "unsatisfiable", header);
        for (const header of ["items=0-5", "bytes=", "bytes=a-b", "bytes=0-1,5-9"]) assert.equal(serve.parseRange(header, 100), null, header);

        const body = pdf("0123456789".repeat(10));
        const saved = await addAsset(admin, "PDF", "AS Streamed", file("streamed.pdf", body));
        const stored = (await assets.findStoredAsset(String(saved.id)))!;
        const send = (headers: Record<string, string> = {}, method = "GET", over: Partial<Parameters<typeof serve.fileResponse>[1]> = {}) =>
            serve.fileResponse(new Request("http://localhost/file", { method, headers }), { key: stored.storageKey, size: stored.sizeBytes, mime: "application/pdf", fileName: "streamed.pdf", inline: true, ...over });

        const whole = send();
        assert.equal(whole.status, 200);
        assert.equal(Buffer.from(await whole.arrayBuffer()).equals(body), true);
        assert.deepEqual([whole.headers.get("content-length"), whole.headers.get("accept-ranges"), whole.headers.get("x-content-type-options"), whole.headers.get("cache-control")], [String(body.length), "bytes", "nosniff", "private, no-store"]);
        assert.match(String(whole.headers.get("content-disposition")), /^inline; filename="streamed.pdf"/);
        const part = send({ range: "bytes=2-5" });
        assert.equal(part.status, 206);
        assert.equal(part.headers.get("content-range"), `bytes 2-5/${body.length}`);
        assert.equal(Buffer.from(await part.arrayBuffer()).toString(), body.subarray(2, 6).toString());
        const beyond = send({ range: `bytes=${body.length}-` });
        assert.equal(beyond.status, 416);
        assert.equal(beyond.headers.get("content-range"), `bytes */${body.length}`);
        assert.equal(send({}, "HEAD").status, 200);
        assert.equal(send({}, "GET", { inline: false, fileName: "R\u00e9sum\u00e9 \"1\".pdf" }).headers.get("content-disposition"), `attachment; filename="R_sum_ _1_.pdf"; filename*=UTF-8''R%C3%A9sum%C3%A9%20%221%22.pdf`);
        const cached = send({}, "GET", { publicCache: { etag: "abc" } });
        assert.deepEqual([cached.headers.get("etag"), cached.headers.get("cache-control")], ['"abc"', "public, max-age=3600"]);
        assert.equal(send({ "if-none-match": '"abc"' }, "GET", { publicCache: { etag: "abc" } }).status, 304);

        assert.equal(assets.isPublicAsset("IMAGE"), true);
        for (const type of ["PDF", "VIDEO", "AUDIO", "ZIP", "TEXT_HTML", "DOC"] as const) assert.equal(assets.isPublicAsset(type), false, type);
        assert.equal(assets.showsInline("TEXT_HTML"), false, "html is never shown in the browser");
        assert.equal(assets.showsInline("PDF"), true);
        assert.equal(await assets.findStoredAsset("missing"), null);
        const link = await library().create!({ type: "Link/Embed", name: "AS Site", description: "", localFile: "", link: "https://example.org" }, ctx(admin));
        assert.equal(await assets.findStoredAsset(String(link.id)), null, "a link has no file to serve");
        const pending = await assets.uploadAsset({ file: file("pending.pdf", pdf("p")), type: "PDF" }, admin);
        assert.equal(await assets.findStoredAsset(pending.id), null, "a staged upload is not served");
        await assets.recordDownload(stored.id);
        assert.equal((await prisma.asset.findUniqueOrThrow({ where: { id: stored.id } })).downloads, 1);
        assert.equal(assets.fileKind("PDF"), "pdf");
        assert.equal(assets.fileKind("ZIP"), "download");
    });

    test("file lessons: a module uses library files; learners open them only through an enrolled course", async () => {
        const notes = await addAsset(admin, "PDF", "AS Notes", file("notes.pdf", pdf("notes")));
        await addAsset(admin, "Video", "AS Talk", file("talk.mp4", mp4()));
        const offered = (await modules().options!())["lessons.asset"];
        assert.deepEqual([...offered].sort(), ["AS Notes (PDF)", "AS Talk (Video)"]);

        const lesson = (title: string, over: Record<string, string> = {}) => ({ title, type: "File", minutes: "", content: "", url: "", asset: "AS Notes (PDF)", ...over });
        const form = (lessons: unknown[], over: Record<string, unknown> = {}) => ({ name: "AS Reading", description: "", status: "Published", lessons: JSON.stringify(lessons), ...over });
        await assert.rejects(modules().create!(form([lesson("No file", { asset: "" })]), ctx(editor)), fieldError("lessons"));
        await assert.rejects(modules().create!(form([lesson("Gone", { asset: "AS Nothing (PDF)" })]), ctx(editor)), (e) => fieldError("lessons")(e) && /not in the Asset Library/.test((e as { fields: Record<string, string> }).fields.lessons));
        assert.equal(await prisma.module.count({ where: { name: "AS Reading" } }), 0, "a refused module is not created");

        const created = await modules().create!(form([lesson("Read the notes"), lesson("Watch the talk", { asset: "AS Talk (Video)", minutes: "12" })]), ctx(editor));
        assert.equal(created.content, "2 lessons \u00b7 2 files");
        const saved = JSON.parse(String(created.lessons)) as Array<Record<string, string>>;
        assert.deepEqual(saved.map((l) => [l.type, l.asset]), [["File", "AS Notes (PDF)"], ["File", "AS Talk (Video)"]]);
        assert.equal((await library().get!(String(notes.id), ctx(admin))).usage, "Used");
        const used = await library().list({ ...listQuery, filters: { usage: "Used" } }, ctx(admin));
        assert.deepEqual(used.rows.map((r) => r.name).sort(), ["AS Notes", "AS Talk"]);
        assert.equal(used.summary?.find((c) => c.label === "Unused assets")?.value, "0");

        await assert.rejects(library().remove!(String(notes.id), ctx(admin)), errors.Conflict, "an asset in a lesson cannot be deleted");
        await assert.rejects(prisma.asset.delete({ where: { id: String(notes.id) } }), "and the database refuses it too");
        const copy = await modules().actions!.duplicate(String(created.id), ctx(editor));
        assert.deepEqual((JSON.parse(String((await modules().get!(String(copy.id), ctx(editor))).lessons)) as Array<Record<string, string>>).map((l) => l.asset), ["AS Notes (PDF)", "AS Talk (Video)"], "a copied module keeps its files");

        // A learner enrolled in a course that includes the module.
        const course = await prisma.course.create({ data: { slug: "as-course", title: "AS Course", summary: "Summary", officialUrl: "https://example.org/as", status: "PUBLISHED", category: { connect: { slug: "as-cat" } } } });
        await prisma.courseModule.create({ data: { courseId: course.id, moduleId: String(created.id) } });
        const learner = await prisma.$transaction(async (tx) =>
            tx.user.create({ data: { email: "as.asha@example.com", kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), learnerProfile: { create: { name: "Asha Rao", registrationNo: await registration.nextRegistrationNo(tx) } } } }),
        );
        const stranger = await prisma.$transaction(async (tx) =>
            tx.user.create({ data: { email: "as.stranger@example.com", kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), learnerProfile: { create: { name: "Stranger", registrationNo: await registration.nextRegistrationNo(tx) } } } }),
        );
        const enrolment = await prisma.enrolment.create({ data: { userId: learner.id, courseId: course.id, source: "ADMIN" } });

        const outline = await content.getCourseOutline(learner.id, "as-course");
        const [readLesson, talkLesson] = outline.modules[0].lessons;
        assert.deepEqual([readLesson.type, talkLesson.type, talkLesson.minutes], ["File", "File", 12]);
        const detail = await content.getLesson(learner.id, readLesson.id);
        assert.deepEqual(detail.file, { name: "notes.pdf", kind: "pdf", size: `${pdf("notes").length} B`, url: `/api/student/lessons/${readLesson.id}/file` });
        assert.deepEqual([detail.body, detail.url], ["", ""]);
        assert.equal((await content.getLesson(learner.id, talkLesson.id)).file?.kind, "video");
        assert.equal((await content.openLessonFile(learner.id, readLesson.id)).id, String(notes.id));

        await assert.rejects(content.openLessonFile(stranger.id, readLesson.id), errors.NotFound, "not enrolled");
        await assert.rejects(content.getLesson(stranger.id, readLesson.id), errors.NotFound);
        await assert.rejects(content.openLessonFile(learner.id, "missing"), errors.NotFound);
        await prisma.module.update({ where: { id: String(created.id) }, data: { status: "DRAFT" } });
        await assert.rejects(content.openLessonFile(learner.id, readLesson.id), errors.NotFound, "a draft module is hidden");
        await prisma.module.update({ where: { id: String(created.id) }, data: { status: "PUBLISHED" } });
        await prisma.enrolment.update({ where: { id: enrolment.id }, data: { status: "CANCELLED" } });
        await assert.rejects(content.openLessonFile(learner.id, readLesson.id), errors.NotFound, "access follows the enrolment");
        await prisma.enrolment.update({ where: { id: enrolment.id }, data: { status: "ACTIVE" } });

        // A lesson whose asset was turned back into a draft upload no longer serves anything.
        await prisma.asset.update({ where: { id: String(notes.id) }, data: { status: "STAGED" } });
        assert.equal((await content.getLesson(learner.id, readLesson.id)).file, null);
        await assert.rejects(content.openLessonFile(learner.id, readLesson.id), errors.NotFound);
    });
});
