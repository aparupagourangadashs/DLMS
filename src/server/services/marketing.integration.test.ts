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

describe("B2b banners and events (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let registration: typeof import("@/server/services/registration");
    let assets: typeof import("@/server/services/assets");
    let banners: typeof import("@/server/services/public/banners");
    let learning: typeof import("@/server/services/learner-learning");
    let resources: typeof import("@/server/admin/resources");
    let permissions: typeof import("@/server/auth/permissions");
    let ist: typeof import("@/lib/ist");
    let errors: typeof import("@/server/http/errors");

    let storageDir = "";
    let admin: SessionUser;
    let editor: SessionUser;

    const ctx = (user: SessionUser) => ({ user, ip: "127.0.0.1" });
    const listQuery = { q: "", filters: {} as Record<string, string>, page: 1, pageSize: 25, skip: 0, take: 25 };
    const bannerScreen = () => resources.getResource("marketing/marketing-banners");
    const eventScreen = () => resources.getResource("products/events");
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

    async function wipe() {
        await prisma.banner.deleteMany();
        await prisma.event.deleteMany();
        await prisma.asset.deleteMany();
        await prisma.enrolment.deleteMany({ where: { user: { email: { startsWith: "mk." } } } });
        await prisma.auditEvent.deleteMany();
        await prisma.counter.deleteMany();
        await prisma.user.deleteMany({ where: { email: { startsWith: "mk." } } });
        fs.rmSync(storageDir, { recursive: true, force: true });
    }

    before(async () => {
        storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "ibmv-marketing-"));
        process.env.STORAGE_LOCAL_DIR = storageDir;
        process.env.UPLOAD_MAX_MB = "1";
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        registration = await import("@/server/services/registration");
        assets = await import("@/server/services/assets");
        banners = await import("@/server/services/public/banners");
        learning = await import("@/server/services/learner-learning");
        resources = await import("@/server/admin/resources");
        permissions = await import("@/server/auth/permissions");
        ist = await import("@/lib/ist");
        errors = await import("@/server/http/errors");

        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "mk-" } } });
        admin = await createStaff("mk-admin@ibmv.test", "ADMIN");
        editor = await createStaff("mk-editor@ibmv.test", "CONTENT_EDITOR");
    });

    beforeEach(wipe);

    after(async () => {
        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "mk-" } } });
        await prisma.$disconnect();
    });

    const bannerForm = (image: string, over: Record<string, unknown> = {}) => ({
        name: "MK Admissions open",
        description: "Apply now",
        placement: "Website home",
        image,
        link: "https://example.org/apply",
        startDate: "",
        endDate: "",
        sortOrder: "",
        status: "Published",
        ...over,
    });

    test("banners: need an image, a safe link and a sensible window; keep the image in use; audited", async () => {
        const image = await upload(editor);
        const bad = (over: Record<string, unknown>, picture = image) => bannerScreen().create!(bannerForm(picture, over), ctx(editor));
        await assert.rejects(bad({}, ""), fieldError("image"), "an image is required");
        await assert.rejects(bad({}, await upload(admin)), fieldError("image"), "someone else's upload cannot be used");
        await assert.rejects(bad({}, JSON.stringify({ id: "missing" })), fieldError("image"));
        for (const link of ["javascript:alert(1)", "http://example.org", "//evil.example/x", "/\\evil.example", "example.org", "https://has space.org"]) await assert.rejects(bad({ link }), fieldError("link"), link);
        await assert.rejects(bad({ startDate: "2026-12-10", endDate: "2026-12-01" }), fieldError("endDate"));
        await assert.rejects(bad({ startDate: "not a date" }), fieldError("startDate"));
        await assert.rejects(bad({ placement: "Nowhere" }), fieldError("placement"));
        await assert.rejects(bad({ status: "Live" }), fieldError("status"));
        await assert.rejects(bad({ name: "x" }), fieldError("name"));
        await assert.rejects(bad({ description: "d".repeat(401) }), fieldError("description"));
        assert.equal(await prisma.banner.count(), 0, "refused banners leave nothing behind");

        const created = await bannerScreen().create!(bannerForm(image), ctx(editor));
        const assetId = imageId(created.image);
        assert.deepEqual([created.placement, created.status, created.showing, created.window, created.thumbnail], ["Website home", "Published", "Showing now", "Always", `/api/assets/${assetId}/file`]);
        const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
        assert.deepEqual([asset.status, asset.name], ["READY", "MK Admissions open"], "the upload becomes a library asset named after the banner");
        assert.equal((await library().get!(assetId, ctx(admin))).usage, "Used");
        await assert.rejects(library().remove!(assetId, ctx(admin)), errors.Conflict, "an image in use cannot be deleted");

        const relative = await bannerScreen().create!(bannerForm(await upload(editor, "b.png", png(80)), { name: "MK Open My Learning", placement: "Student portal home", link: "/student/my-learning", sortOrder: "3" }), ctx(editor));
        assert.deepEqual([relative.link, relative.sortOrder, relative.placement], ["/student/my-learning", 3, "Student portal home"]);

        // Editing: the same image stays, a new one replaces it, and the image cannot be removed.
        const row = await bannerScreen().get!(String(created.id), ctx(editor));
        const renamed = await bannerScreen().update!(String(created.id), { ...row, name: "MK Admissions now open", status: "Draft" }, ctx(editor));
        assert.deepEqual([renamed.name, renamed.status, renamed.showing, imageId(renamed.image)], ["MK Admissions now open", "Draft", "Not published", assetId]);
        await assert.rejects(bannerScreen().update!(String(created.id), { ...row, image: "" }, ctx(editor)), fieldError("image"));
        const swapped = await bannerScreen().update!(String(created.id), { ...row, image: await upload(editor, "c.png", png(90)) }, ctx(editor));
        assert.notEqual(imageId(swapped.image), assetId);
        assert.equal((await library().get!(assetId, ctx(admin))).usage, "Unused", "the old image is back to unused and can be deleted");

        const actions = (await prisma.auditEvent.findMany({ where: { entity: "Banner", entityId: String(created.id) }, orderBy: { createdAt: "asc" } })).map((e) => e.action);
        assert.deepEqual(actions, ["banner.create", "banner.unpublish", "banner.publish"]);
        assert.ok(permissions.can("CONTENT_EDITOR", "banners:write") && permissions.can("CONTENT_EDITOR", "banners:delete"));
        for (const role of ["INSTRUCTOR", "SUPPORT", "FINANCE"] as const) assert.equal(permissions.can(role, "banners:read"), false, role);
    });

    test("banners: listed with tabs, filters and the window they show in; copied, archived and deleted", async () => {
        const make = async (name: string, over: Record<string, unknown> = {}) => bannerScreen().create!(bannerForm(await upload(editor, `${name}.png`, png(20 + name.length)), { name, ...over }), ctx(editor));
        const today = ist.istToday();
        await make("MK Always");
        await make("MK Soon", { startDate: ist.addDays(today, 3) });
        await make("MK Over", { endDate: ist.addDays(today, -2) });
        await make("MK Draft", { status: "Draft", placement: "Student portal home", sortOrder: "1" });
        const all = await bannerScreen().list(listQuery, ctx(editor));
        assert.deepEqual(all.tabCounts, { Published: 3, Draft: 1, Archived: 0 });
        const showing = new Map(all.rows.map((r) => [r.name, [r.showing, r.window]]));
        assert.deepEqual(showing.get("MK Always"), ["Showing now", "Always"]);
        assert.equal(showing.get("MK Soon")?.[0], "Scheduled");
        assert.match(String(showing.get("MK Soon")?.[1]), /^From /);
        assert.equal(showing.get("MK Over")?.[0], "Ended");
        assert.match(String(showing.get("MK Over")?.[1]), /^Until /);
        assert.equal(showing.get("MK Draft")?.[0], "Not published");
        const names = async (query: Record<string, unknown> = {}) => (await bannerScreen().list({ ...listQuery, ...query }, ctx(editor))).rows.map((r) => r.name);
        assert.deepEqual(await names({ tab: "Draft" }), ["MK Draft"]);
        assert.deepEqual(await names({ filters: { placement: "Student portal home" } }), ["MK Draft"]);
        assert.deepEqual(await names({ filters: { placement: "Elsewhere" } }), []);
        assert.deepEqual(await names({ q: "soon" }), ["MK Soon"]);
        assert.deepEqual(await names({ sort: { key: "name", dir: "asc" } }), ["MK Always", "MK Draft", "MK Over", "MK Soon"]);

        const source = all.rows.find((r) => r.name === "MK Always")!;
        const copy = await bannerScreen().actions!.duplicate(String(source.id), ctx(editor));
        assert.deepEqual([copy.name, copy.status, imageId(copy.image) === imageId(source.image)], ["MK Always (copy)", "Draft", true], "a copy starts as a draft and shares the image");
        assert.equal((await bannerScreen().actions!.archive(String(source.id), ctx(editor))).status, "Archived");
        await bannerScreen().remove!(String(copy.id), ctx(editor));
        assert.equal(await prisma.banner.count({ where: { id: String(copy.id) } }), 0);
        assert.equal((await library().get!(imageId(source.image), ctx(admin))).usage, "Used", "the archived banner still holds its image");
        await assert.rejects(bannerScreen().get!("missing", ctx(editor)), errors.NotFound);
    });

    test("public banners: published, inside their dates, in order; the student home gets its own", async () => {
        const image = await prisma.asset.create({ data: { type: "IMAGE", name: "MK public image", status: "READY" } });
        const pending = await prisma.asset.create({ data: { type: "IMAGE", name: "MK staged image", status: "STAGED" } });
        const now = ist.fromIst("2026-12-01", "12:00");
        const day = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);
        const add = (name: string, over: Record<string, unknown> = {}) =>
            prisma.banner.create({ data: { name, imageAssetId: image.id, placement: "WEBSITE_HOME", status: "PUBLISHED", linkUrl: null, ...over } as Parameters<typeof prisma.banner.create>[0]["data"] });
        await add("MK Second", { sortOrder: 5, linkUrl: "https://example.org/second" });
        await add("MK First", { sortOrder: 1, startsOn: day("2026-12-01"), endsOn: day("2026-12-01"), linkUrl: "/website/contact", description: "Today only" });
        await add("MK Not yet", { startsOn: day("2026-12-02") });
        await add("MK Gone", { endsOn: day("2026-11-30") });
        await add("MK Draft", { status: "DRAFT" });
        await add("MK Archived", { status: "ARCHIVED" });
        await add("MK Unready image", { imageAssetId: pending.id });
        await add("MK Student", { placement: "STUDENT_HOME", linkUrl: "https://example.org/learn" });

        const site = await banners.listBanners("WEBSITE_HOME", now);
        assert.deepEqual(site.map((b) => b.name), ["MK First", "MK Second"], "a banner on its first and last day shows; ordered by display order");
        assert.deepEqual(site[0], { id: site[0].id, name: "MK First", description: "Today only", imageUrl: `/api/assets/${image.id}/file`, href: "/website/contact", external: false });
        assert.equal(site[1].external, true);
        assert.equal(site[1].description, "");
        assert.deepEqual((await banners.listBanners("WEBSITE_HOME", now, 1)).map((b) => b.name), ["MK First"], "the home page asks for one");
        assert.deepEqual((await banners.listBanners("STUDENT_HOME", now)).map((b) => b.name), ["MK Student"]);
        assert.deepEqual((await banners.listBanners("WEBSITE_HOME", ist.fromIst("2026-12-02", "00:30"))).map((b) => b.name), ["Not yet", "Second"].map((n) => `MK ${n}`), "the next IST day brings the scheduled one and drops the one-day banner");
        assert.deepEqual((await banners.listBanners("WEBSITE_HOME", ist.fromIst("2026-11-30", "23:59"))).map((b) => b.name), ["MK Gone", "MK Second"], "the last day still shows");

        const learner = await prisma.$transaction(async (tx) =>
            tx.user.create({ data: { email: "mk.asha@example.com", kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), learnerProfile: { create: { name: "Asha Rao", registrationNo: await registration.nextRegistrationNo(tx) } } } }),
        );
        const home = await learning.getHomeSummary(learner.id, now);
        assert.deepEqual(home.banners.map((b) => b.name), ["MK Student"]);
    });

    const manager = "mk-editor";
    const eventForm = (over: Record<string, unknown> = {}) => ({
        name: "MK Kirtan evening",
        description: "An evening of kirtan and prasadam.",
        image: "",
        days: JSON.stringify([{ start: "2026-12-05T18:00", end: "2026-12-05T20:00" }]),
        status: "Draft",
        visibility: "Public",
        platform: "Zoom",
        venue: "",
        meetingLink: "https://example.org/live",
        guestAccess: "Members only",
        manager,
        category: "Festival",
        membership: "Everyone",
        feedback: "None",
        pricing: "Free",
        price: null,
        currency: "INR",
        capacity: null,
        pricingNotes: "",
        ...over,
    });
    const days = (...items: Array<[string, string]>) => JSON.stringify(items.map(([start, end]) => ({ start, end })));

    test("events: days, platform, price and manager are checked before anything is saved", async () => {
        const options = await eventScreen().options!();
        assert.ok(options.manager.includes(manager) && options.manager.includes("mk-admin"), "any active staff member can manage an event");
        const bad = (over: Record<string, unknown>) => eventScreen().create!(eventForm(over), ctx(editor));

        await assert.rejects(bad({ days: "" }), fieldError("days"), "at least one day");
        await assert.rejects(bad({ days: days(["2026-12-05T20:00", "2026-12-05T18:00"]) }), fieldError("days"), "ends before it starts");
        await assert.rejects(bad({ days: days(["2026-12-05T18:00", "2026-12-05T18:00"]) }), fieldError("days"), "ends when it starts");
        await assert.rejects(bad({ days: days(["2026-12-05T10:00", "2026-12-05T13:00"], ["2026-12-05T12:00", "2026-12-05T14:00"]) }), fieldError("days"), "overlapping days");
        await assert.rejects(bad({ days: days(["2026-12-06T10:00", "2026-12-06T12:00"], ["2026-12-05T10:00", "2026-12-05T12:00"]) }), fieldError("days"), "days out of order");
        await assert.rejects(bad({ days: days(["2026-02-31T10:00", "2026-02-31T12:00"]) }), fieldError("days"), "a day that does not exist");
        await assert.rejects(bad({ days: JSON.stringify([{ start: "tomorrow", end: "later" }]) }), fieldError("days"));
        await assert.rejects(bad({ days: "not json" }), fieldError("days"));
        await assert.rejects(bad({ platform: "In person", venue: "" }), fieldError("venue"));
        await assert.rejects(bad({ platform: "Zoom", meetingLink: "http://example.org" }), fieldError("meetingLink"));
        await assert.rejects(bad({ platform: "Hybrid", venue: "Hall", meetingLink: "" }), fieldError("meetingLink"), "hybrid needs the link too");
        await assert.rejects(bad({ platform: "Hybrid", venue: "", meetingLink: "https://example.org/x" }), fieldError("venue"), "and the venue");
        await assert.rejects(bad({ platform: "Telepathy" }), fieldError("platform"));
        for (const price of [null, "", 0, -5, "abc", 12.345, 2_000_000]) await assert.rejects(bad({ pricing: "Paid", price }), fieldError("price"), `price ${String(price)}`);
        await assert.rejects(bad({ pricing: "Paid", price: 100, currency: "GBP" }), fieldError("currency"));
        await assert.rejects(bad({ pricing: "Cheap" }), fieldError("pricing"));
        await assert.rejects(bad({ manager: "Nobody" }), fieldError("manager"));
        await assert.rejects(bad({ category: "Party" }), fieldError("category"));
        await assert.rejects(bad({ membership: "VIP" }), fieldError("membership"));
        await assert.rejects(bad({ feedback: "Event survey" }), fieldError("feedback"));
        await assert.rejects(bad({ status: "Live" }), fieldError("status"));
        await assert.rejects(bad({ visibility: "Secret" }), fieldError("visibility"));
        await assert.rejects(bad({ guestAccess: "Maybe" }), fieldError("guestAccess"));
        await assert.rejects(bad({ capacity: 0 }), fieldError("capacity"));
        await assert.rejects(bad({ name: "ab" }), fieldError("name"));
        await assert.rejects(bad({ description: "no" }), fieldError("description"));
        await assert.rejects(bad({ image: JSON.stringify({ id: "missing" }) }), fieldError("image"));
        assert.equal(await prisma.event.count(), 0, "refused events leave nothing behind");
    });

    test("events: saved in IST with their days, price and image; edited, copied and deleted under the status rules", async () => {
        const image = await upload(editor, "poster.png");
        const created = await eventScreen().create!(
            eventForm({
                image,
                platform: "Hybrid",
                venue: "IBMV Hall, Mumbai",
                days: days(["2026-12-05T18:00", "2026-12-05T20:00"], ["2026-12-06T09:30", "2026-12-06T11:00"]),
                pricing: "Paid",
                price: 499.5,
                capacity: 120,
                guestAccess: "Allowed",
                pricingNotes: "Refunds until 3 days before.",
            }),
            ctx(editor),
        );
        const stored = await prisma.event.findUniqueOrThrow({ where: { id: String(created.id) }, include: { days: { orderBy: { sortOrder: "asc" } } } });
        assert.deepEqual([stored.startsAt.toISOString(), stored.endsAt.toISOString()], ["2026-12-05T12:30:00.000Z", "2026-12-06T05:30:00.000Z"], "IST wall-clock times are stored as UTC");
        assert.deepEqual([stored.isPaid, stored.priceMinor, stored.currency, stored.capacity, stored.guestsAllowed], [true, 49950, "INR", 120, true]);
        assert.equal(stored.days.length, 2);
        assert.deepEqual([created.date, created.where, created.price, created.currency, created.guestAccess, created.manager], ["2026-12-05T18:00", "IBMV Hall, Mumbai", 499.5, "INR", "Allowed", manager]);
        assert.deepEqual(JSON.parse(String(created.days)), [{ start: "2026-12-05T18:00", end: "2026-12-05T20:00" }, { start: "2026-12-06T09:30", end: "2026-12-06T11:00" }]);
        assert.equal((await library().get!(imageId(created.image), ctx(admin))).usage, "Used");

        const online = await eventScreen().create!(eventForm({ name: "MK Online talk", platform: "Zoom", venue: "left over", meetingLink: "https://example.org/z", days: days(["2026-12-09T18:00", "2026-12-09T19:00"]) }), ctx(editor));
        const inPerson = await eventScreen().create!(eventForm({ name: "MK Campus visit", platform: "In person", venue: "Campus", meetingLink: "https://example.org/stray", visibility: "Private", days: days(["2026-12-03T10:00", "2026-12-03T12:00"]) }), ctx(editor));
        assert.deepEqual([online.venue, online.where, online.meetingLink], ["", "Zoom", "https://example.org/z"], "an online event keeps no venue");
        assert.deepEqual([inPerson.venue, inPerson.meetingLink], ["Campus", ""], "an in-person event keeps no link");
        assert.deepEqual([online.pricing, online.price, online.currency], ["Free", null, "INR"]);

        const all = await eventScreen().list(listQuery, ctx(editor));
        assert.deepEqual(all.rows.map((r) => r.name), ["MK Online talk", "MK Kirtan evening", "MK Campus visit"], "the latest start comes first");
        assert.deepEqual(all.tabCounts, { Active: 0, Draft: 3, Inactive: 0 });
        const names = async (query: Record<string, unknown> = {}) => (await eventScreen().list({ ...listQuery, ...query }, ctx(editor))).rows.map((r) => r.name);
        assert.deepEqual(await names({ filters: { visibility: "Private" } }), ["MK Campus visit"]);
        assert.deepEqual(await names({ q: "online" }), ["MK Online talk"]);
        assert.deepEqual(await names({ sort: { key: "name", dir: "asc" } }), ["MK Campus visit", "MK Kirtan evening", "MK Online talk"]);

        // Publishing and changing the schedule replace the days.
        const form = await eventScreen().get!(String(created.id), ctx(editor));
        const published = await eventScreen().update!(String(created.id), { ...form, status: "Active", days: days(["2026-12-07T18:00", "2026-12-07T19:00"]), manager: "mk-admin" }, ctx(editor));
        assert.deepEqual([published.status, published.date, published.manager, JSON.parse(String(published.days)).length], ["Active", "2026-12-07T18:00", "mk-admin", 1]);
        assert.equal(await prisma.eventDay.count({ where: { eventId: String(created.id) } }), 1, "the old days are gone");
        assert.equal(imageId(published.image), imageId(created.image), "the image stays when the form keeps it");
        assert.deepEqual((await eventScreen().list(listQuery, ctx(editor))).tabCounts, { Active: 1, Draft: 2, Inactive: 0 });
        await assert.rejects(eventScreen().remove!(String(created.id), ctx(editor)), errors.BusinessRule, "an active event cannot be deleted");

        const copy = await eventScreen().actions!.duplicate(String(created.id), ctx(editor));
        assert.deepEqual([copy.name, copy.status, copy.date, imageId(copy.image) === imageId(created.image)], ["MK Kirtan evening (copy)", "Draft", "2026-12-07T18:00", true]);
        const inactive = await eventScreen().update!(String(created.id), { ...published, status: "Inactive" }, ctx(editor));
        assert.equal(inactive.status, "Inactive");
        await eventScreen().remove!(String(created.id), ctx(editor));
        assert.equal(await prisma.eventDay.count({ where: { eventId: String(created.id) } }), 0, "days go with the event");
        assert.equal((await library().get!(imageId(created.image), ctx(admin))).usage, "Used", "the copy still uses the image");
        await eventScreen().remove!(String(copy.id), ctx(editor));
        assert.equal((await library().get!(imageId(created.image), ctx(admin))).usage, "Unused");
        await assert.rejects(eventScreen().get!("missing", ctx(editor)), errors.NotFound);

        const actions = (await prisma.auditEvent.findMany({ where: { entity: "Event", entityId: String(created.id) }, orderBy: { createdAt: "asc" } })).map((e) => e.action);
        assert.deepEqual(actions, ["event.create", "event.publish", "event.unpublish", "event.delete"]);
        assert.ok(permissions.can("CONTENT_EDITOR", "events:write") && permissions.can("CONTENT_EDITOR", "events:delete"));
        for (const role of ["INSTRUCTOR", "SUPPORT", "FINANCE"] as const) assert.equal(permissions.can(role, "events:read"), false, role);
    });
});
