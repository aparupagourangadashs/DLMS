import fs from "node:fs";

// Usage: start the app (npm run start), then `npx tsx scripts/smoke-b2b-marketing.mjs` (tsx is needed for the clean-up client).
// Needs `npm run db:seed` (demo accounts and the launch banners). Uploads a banner image, creates a banner and some
// events, checks the public website, the student home and the access rules, and removes everything before finishing.
// While it runs, the seeded website banners are set aside so the new banner is the one the home page shows; they are
// put back exactly as they were, even when a check fails.
const envPath = new URL("../.env", import.meta.url);
const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
process.env.DATABASE_URL = env.DATABASE_URL;
const { createPrismaClient } = await import("../src/server/prisma-factory.ts");
const prisma = createPrismaClient();
const base = "http://localhost:3000";

class Jar {
    cookies = new Map();
    absorb(res) {
        for (const c of res.headers.getSetCookie()) {
            const [kv] = c.split(";");
            const i = kv.indexOf("=");
            this.cookies.set(kv.slice(0, i), kv.slice(i + 1));
        }
    }
    header() {
        return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    }
}

async function login(email, password) {
    const jar = new Jar();
    let r = await fetch(`${base}/api/auth/csrf`, { headers: { cookie: jar.header() } });
    jar.absorb(r);
    const { csrfToken } = await r.json();
    r = await fetch(`${base}/api/auth/callback/credentials`, {
        method: "POST",
        redirect: "manual",
        headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar.header(), origin: base },
        body: new URLSearchParams({ csrfToken, email, password, json: "true" }),
    });
    jar.absorb(r);
    await r.text();
    return jar;
}

const req = (jar, path, init = {}) => fetch(base + path, { redirect: "manual", ...init, headers: { cookie: jar ? jar.header() : "", ...(init.headers ?? {}) } });
const json = { "content-type": "application/json", origin: base };
const send = (jar, method, path, body) => req(jar, path, { method, headers: json, body: body === undefined ? undefined : JSON.stringify(body) });
const upload = (jar, name, bytes, type) => {
    const form = new FormData();
    form.append("type", type);
    form.append("file", new Blob([bytes]), name);
    return req(jar, "/api/admin/uploads", { method: "POST", headers: { origin: base }, body: form });
};
const page = async (jar, path) => {
    const r = await req(jar, path);
    return { status: r.status, html: (await r.text()).replace(/<!--.*?-->/g, "") };
};

let failures = 0;
function check(name, ok, detail = "") {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}
const brief = (value) => JSON.stringify(value).slice(0, 240);

const stamp = Date.now();
const tag = `Smoke B2b banners ${stamp}`;
const demoPassword = env.SEED_DEMO_PASSWORD;
const png = Buffer.concat([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"), Buffer.alloc(200, 9)]);
const banners = "/api/admin/resources/marketing/marketing-banners";
const events = "/api/admin/resources/products/events";
const library = "/api/admin/resources/learning/asset-library";

// The seeded banners that would otherwise come before the new one on the website home.
const setAside = await prisma.banner.findMany({ where: { placement: "WEBSITE_HOME", status: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } });

try {
    // ---- Who may use these screens ----
    let r = await req(null, banners);
    check("anonymous cannot list banners", r.status === 401, r.status);
    r = await req(null, events);
    check("anonymous cannot list events", r.status === 401, r.status);
    const learner = await login("learner@ibmv.local", demoPassword);
    const teacher = await login("demo.staff2@ibmv.local", demoPassword);
    for (const [who, jar] of [["a learner", learner], ["an instructor", teacher]]) {
        r = await req(jar, banners);
        check(`${who} cannot list banners`, r.status === 403, r.status);
        r = await req(jar, events);
        check(`${who} cannot list events`, r.status === 403, r.status);
        r = await send(jar, "POST", banners, {});
        check(`${who} cannot create a banner`, r.status === 403, r.status);
    }

    // ---- A banner for the website home ----
    const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    r = await upload(admin, "banner.png", png, "Image");
    let body = await r.json();
    const image = body.data;
    check("the banner image uploads", r.status === 201 && Boolean(image?.id), `${r.status} ${brief(body)}`);

    const bannerForm = (over = {}) => ({
        name: `${tag} Launch`,
        description: "Created by the smoke test.",
        placement: "Website home",
        image: JSON.stringify(image),
        link: "https://example.org/apply",
        startDate: "",
        endDate: "",
        sortOrder: "0",
        status: "Published",
        ...over,
    });
    r = await send(admin, "POST", banners, bannerForm({ link: "javascript:alert(1)" }));
    body = await r.json();
    check("an unsafe link is refused", r.status === 400 && Boolean(body.error?.fields?.link), `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", banners, bannerForm({ image: "" }));
    body = await r.json();
    check("a banner needs an image", r.status === 400 && Boolean(body.error?.fields?.image), `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", banners, bannerForm({ startDate: "2026-12-10", endDate: "2026-12-01" }));
    body = await r.json();
    check("a window that ends before it starts is refused", r.status === 400 && Boolean(body.error?.fields?.endDate), `${r.status} ${brief(body)}`);

    r = await send(admin, "POST", banners, bannerForm());
    body = await r.json();
    const banner = body.data;
    check("the banner is saved", r.status === 201 && banner?.showing === "Showing now" && banner.thumbnail === `/api/assets/${JSON.parse(banner.image).id}/file`, `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", banners, bannerForm());
    body = await r.json();
    check("the same upload cannot be used twice", r.status === 400 && Boolean(body.error?.fields?.image), `${r.status} ${brief(body)}`);
    r = await req(admin, `${banners}?q=${encodeURIComponent(tag)}`);
    body = await r.json();
    check("the list finds it with its tab counts", r.status === 200 && body.meta.total === 1 && Boolean(body.meta.tabCounts), `${r.status} ${brief(body.meta)}`);
    r = await req(null, banner.thumbnail);
    check("the banner image is public", r.status === 200 && r.headers.get("content-type") === "image/png", `${r.status} ${r.headers.get("content-type")}`);

    // ---- The public website and the student home ----
    let result = await page(null, "/website");
    const seededName = setAside[0]?.name;
    check("the website home shows the first seeded banner", !seededName || (result.status === 200 && result.html.includes(seededName)), `${result.status}`);
    await prisma.banner.updateMany({ where: { id: { in: setAside.map((b) => b.id) } }, data: { status: "ARCHIVED" } });
    result = await page(null, "/website");
    check("the website home shows the new banner and its link", result.status === 200 && result.html.includes(banner.name) && result.html.includes(banner.thumbnail) && result.html.includes("https://example.org/apply"), `${result.status}`);

    const studentBanner = await send(admin, "POST", banners, bannerForm({ name: `${tag} Student`, placement: "Student portal home", image: JSON.stringify((await (await upload(admin, "student.png", Buffer.concat([png, Buffer.from("s")]), "Image")).json()).data), link: "/student/my-learning" }));
    body = await studentBanner.json();
    const forStudents = body.data;
    check("a student banner is saved with a path on this site", studentBanner.status === 201 && forStudents?.link === "/student/my-learning", `${studentBanner.status} ${brief(body)}`);
    result = await page(learner, "/student");
    check("the student home lists it", result.status === 200 && result.html.includes(forStudents.name), `${result.status}`);
    check("and not the website banner", !result.html.includes(banner.name), "found on the student home");

    // Hiding and showing it again.
    const row = (await (await req(admin, `${banners}/${banner.id}`)).json()).data;
    r = await send(admin, "PATCH", `${banners}/${banner.id}`, { ...row, status: "Draft" });
    body = await r.json();
    check("a draft banner is not showing", r.status === 200 && body.data?.showing === "Not published", `${r.status} ${brief(body)}`);
    result = await page(null, "/website");
    check("the website home no longer shows it", result.status === 200 && !result.html.includes(banner.name), `${result.status}`);
    r = await send(admin, "PATCH", `${banners}/${banner.id}`, { ...row, status: "Published", endDate: "2020-01-01" });
    body = await r.json();
    check("a banner whose end date has passed is ended", r.status === 200 && body.data?.showing === "Ended", `${r.status} ${brief(body)}`);
    result = await page(null, "/website");
    check("the website home does not show an ended banner", result.status === 200 && !result.html.includes(banner.name), `${result.status}`);
    r = await send(admin, "PATCH", `${banners}/${banner.id}`, { ...row, status: "Published" });
    result = await page(null, "/website");
    check("publishing it again brings it back", r.status === 200 && result.html.includes(banner.name), `${r.status} ${result.status}`);

    r = await send(admin, "DELETE", `${library}/${JSON.parse(banner.image).id}`);
    check("an image in use cannot be deleted from the library", r.status === 409, r.status);
    r = await send(admin, "POST", `${banners}/${banner.id}/duplicate`);
    body = await r.json();
    check("a banner can be copied as a draft", r.status === 200 && body.data?.status === "Draft" && body.data.name === `${banner.name} (copy)`, `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", `${banners}/${banner.id}/archive`);
    body = await r.json();
    check("a banner can be archived", r.status === 200 && body.data?.status === "Archived", `${r.status} ${brief(body)}`);
    result = await page(null, "/website");
    check("an archived banner is not shown", !result.html.includes(banner.name), "still shown");

    // ---- Events ----
    const staff = await prisma.user.findUnique({ where: { email: env.SEED_ADMIN_EMAIL }, select: { email: true, staffProfile: { select: { displayName: true } } } });
    const manager = staff?.staffProfile?.displayName ?? staff?.email;
    const eventForm = (over = {}) => ({
        name: `${tag} Kirtan`,
        description: "An evening of kirtan and prasadam.",
        image: "",
        days: JSON.stringify([{ start: "2030-03-05T18:00", end: "2030-03-05T20:00" }, { start: "2030-03-06T18:00", end: "2030-03-06T20:00" }]),
        status: "Draft",
        visibility: "Public",
        platform: "Hybrid",
        venue: "IBMV Hall, Mumbai",
        meetingLink: "https://example.org/live",
        guestAccess: "Members only",
        manager,
        category: "Festival",
        membership: "Everyone",
        feedback: "None",
        pricing: "Paid",
        price: 250,
        currency: "INR",
        capacity: 80,
        pricingNotes: "",
        ...over,
    });
    r = await send(admin, "POST", events, eventForm({ days: JSON.stringify([{ start: "2030-03-05T18:00", end: "2030-03-05T17:00" }]) }));
    body = await r.json();
    check("an event that ends before it starts is refused", r.status === 400 && Boolean(body.error?.fields?.days), `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", events, eventForm({ days: JSON.stringify([{ start: "2030-02-31T10:00", end: "2030-02-31T12:00" }]) }));
    body = await r.json();
    check("a day that does not exist is refused", r.status === 400 && Boolean(body.error?.fields?.days), `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", events, eventForm({ platform: "In person", venue: "" }));
    body = await r.json();
    check("an in-person event needs a venue", r.status === 400 && Boolean(body.error?.fields?.venue), `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", events, eventForm({ meetingLink: "http://example.org/live" }));
    body = await r.json();
    check("the meeting link must be https", r.status === 400 && Boolean(body.error?.fields?.meetingLink), `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", events, eventForm({ price: "free" }));
    body = await r.json();
    check("a paid event needs a price", r.status === 400 && Boolean(body.error?.fields?.price), `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", events, eventForm({ manager: "Nobody At All" }));
    body = await r.json();
    check("the manager must be a staff member", r.status === 400 && Boolean(body.error?.fields?.manager), `${r.status} ${brief(body)}`);

    r = await upload(admin, "event.png", Buffer.concat([png, Buffer.from("e")]), "Image");
    const eventImage = (await r.json()).data;
    r = await send(admin, "POST", events, eventForm({ image: JSON.stringify(eventImage) }));
    body = await r.json();
    const event = body.data;
    check("a two-day paid event with a poster is saved", r.status === 201 && event?.status === "Draft" && event.date === "2030-03-05T18:00" && Number(event.price) === 250 && Boolean(event.image), `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", events, eventForm({ name: `${tag} Online`, platform: "Zoom", venue: "left over", pricing: "Free", price: null, days: JSON.stringify([{ start: "2030-04-01T10:00", end: "2030-04-01T11:00" }]) }));
    body = await r.json();
    const online = body.data;
    check("an online free event drops the venue and the price", r.status === 201 && online?.venue === "" && online.price === null && online.where === "Zoom", `${r.status} ${brief(body)}`);
    r = await req(admin, `${events}?q=${encodeURIComponent(tag)}`);
    body = await r.json();
    check("the list shows both, the latest first", r.status === 200 && body.meta.total === 2 && body.data[0].name === online.name, `${r.status} ${brief(body.data?.map((e) => e.name))}`);
    r = await req(admin, `${events}?q=${encodeURIComponent(tag)}&tab=Draft`);
    body = await r.json();
    check("and counts them by status", r.status === 200 && body.meta.total === 2 && body.meta.tabCounts?.Draft >= 2, `${r.status} ${brief(body.meta)}`);

    const eventRow = (await (await req(admin, `${events}/${event.id}`)).json()).data;
    r = await send(admin, "PATCH", `${events}/${event.id}`, { ...eventRow, status: "Active" });
    body = await r.json();
    check("an event can be activated", r.status === 200 && body.data?.status === "Active", `${r.status} ${brief(body)}`);
    r = await send(admin, "DELETE", `${events}/${event.id}`);
    check("an active event cannot be deleted", r.status === 409 || r.status === 422, r.status);
    r = await send(admin, "PATCH", `${events}/${event.id}`, { ...eventRow, status: "Inactive" });
    check("it can be made inactive", r.status === 200, r.status);
    r = await send(admin, "POST", `${events}/${event.id}/duplicate`);
    body = await r.json();
    check("an event can be copied as a draft", r.status === 200 && body.data?.status === "Draft" && body.data.name === `${event.name} (copy)`, `${r.status} ${brief(body)}`);
    r = await send(admin, "DELETE", `${events}/${event.id}`);
    check("an inactive event can be deleted", r.status === 204, r.status);
    r = await req(admin, `${events}/${event.id}`);
    check("and is gone", r.status === 404, r.status);
} catch (error) {
    failures += 1;
    console.error("FAIL  smoke script stopped early:", error);
} finally {
    // Put the seeded banners back, then remove everything this run created (deleting an asset removes its stored file).
    for (const item of setAside) await prisma.banner.update({ where: { id: item.id }, data: { status: "PUBLISHED" } });
    await prisma.event.deleteMany({ where: { name: { startsWith: tag } } });
    const gone = await prisma.banner.deleteMany({ where: { name: { startsWith: tag } } });
    const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    const mine = await prisma.asset.findMany({ where: { name: { startsWith: tag } }, select: { id: true } });
    for (const asset of mine) await send(admin, "DELETE", `${library}/${asset.id}`);
    const left = await prisma.asset.count({ where: { name: { startsWith: tag } } });
    const stillAside = await prisma.banner.count({ where: { status: "ARCHIVED", id: { in: setAside.map((b) => b.id) } } });
    console.log(`Cleaned up: ${gone.count} banner(s) and ${mine.length} asset(s) removed, ${left} asset(s) left; ${setAside.length} seeded banner(s) put back, ${stillAside} still archived.`);
    await prisma.$disconnect();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
