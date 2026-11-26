import fs from "node:fs";

// Usage: start the app (npm run start), then `npx tsx scripts/smoke-b8b.mjs` (tsx is needed for the database client).
// Needs `npm run db:seed` (demo accounts). Checks the shell features over HTTP: the notification bell (who is told, marking read,
// nobody else's messages), the audit view (Super Admin only, filters, export entries), global search (who may find what, branch
// limits, the ?q= link) and the pages. Creates a support request, a lead, two learners and a branch-bound administrator
// (smoke.b8b.*) and removes them, with the notifications they caused, before finishing.
const envPath = new URL("../.env", import.meta.url);
const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
process.env.DATABASE_URL = env.DATABASE_URL;
const { createPrismaClient } = await import("../src/server/prisma-factory.ts");
const { hashPassword } = await import("../src/server/auth/password.ts");
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
const send = (jar, method, path, body, headers = json) => req(jar, path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
const loc = (r) => r.headers.get("location") ?? "";
const page = async (jar, path) => {
    const r = await req(jar, path);
    return { status: r.status, location: loc(r), html: (await r.text()).replace(/<!--.*?-->/g, "") };
};
const get = async (jar, path) => {
    const r = await req(jar, path);
    return { r, body: await r.json() };
};
const qs = (params) => new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "")).toString();

let failures = 0;
function check(name, ok, detail = "") {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}
const brief = (value) => String(JSON.stringify(value)).slice(0, 260);

const stamp = Date.now();
const tag = `Smoke B8b ${stamp}`;
const demoPassword = env.SEED_DEMO_PASSWORD;
const scopedEmail = `smoke.b8b.admin.${stamp}@example.com`;
const scopedPassword = `Smoke-${stamp}-Aa1!`;
const leadEmail = `smoke.b8b.${stamp}@example.com`;
const bell = async (jar) => (await get(jar, "/api/admin/notifications")).body.data;
const withHref = (list, href) => list.items.find((item) => item.href === href);
const has = (list, kind, text) => list.items.some((item) => item.kind === kind && (item.href ?? "").includes(text));
let requestId = null;

try {
    // ---- Accounts ----
    const boss = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    const admin = await login("demo.staff1@ibmv.local", demoPassword);
    const teacher = await login("demo.staff2@ibmv.local", demoPassword);
    const editor = await login("demo.staff4@ibmv.local", demoPassword);
    const finance = await login("demo.staff5@ibmv.local", demoPassword);
    const support = await login("demo.staff6@ibmv.local", demoPassword);
    const learner = await login("learner@ibmv.local", demoPassword);
    const supportUser = await prisma.user.findUniqueOrThrow({ where: { email: "demo.staff6@ibmv.local" } });
    const bossUser = await prisma.user.findUniqueOrThrow({ where: { email: env.SEED_ADMIN_EMAIL } });

    // ---- The bell: who may open it ----
    let r = await req(null, "/api/admin/notifications");
    check("anonymous cannot open the bell", r.status === 401, r.status);
    r = await send(null, "POST", "/api/admin/notifications/read", {});
    check("anonymous cannot mark anything read", r.status === 401, r.status);
    r = await req(learner, "/api/admin/notifications");
    check("a learner cannot open the staff bell", r.status === 403, r.status);
    r = await send(boss, "POST", "/api/admin/notifications/read", { ids: "all" });
    check("a bad list of ids is refused", r.status === 400, r.status);
    r = await send(boss, "POST", "/api/admin/notifications/read", { ids: Array.from({ length: 51 }, (_, n) => `id${n}`) });
    check("too many ids are refused", r.status === 400, r.status);

    // ---- A learner's support request tells the team that can answer it ----
    const before = { boss: await bell(boss), admin: await bell(admin) };
    r = await send(learner, "POST", "/api/student/support-requests", { message: `${tag} I cannot find my certificate.` });
    let body = await r.json();
    requestId = body.data?.id;
    check("the learner sends a support request", r.status === 201 && Boolean(requestId), `${r.status} ${brief(body)}`);
    const link = `/admin/engage/support?open=${requestId}`;
    const bossList = await bell(boss);
    const bossItem = withHref(bossList, link);
    check("the Super Admin is told, and it is unread", bossItem?.kind === "support.request" && bossItem.read === false && bossItem.title.startsWith("New support request from") && bossItem.body.includes(tag), brief(bossItem));
    check("the unread count went up by one", bossList.unread === before.boss.unread + 1, `${before.boss.unread} -> ${bossList.unread}`);
    const adminItem = withHref(await bell(admin), link);
    check("an Administrator is told", adminItem?.kind === "support.request", brief(adminItem));
    check("support staff are told", Boolean(withHref(await bell(support), link)), "missing");
    for (const [who, jar] of [["an instructor", teacher], ["a content editor", editor], ["finance staff", finance]]) {
        check(`${who} ${who === "finance staff" ? "are" : "is"} not told`, !withHref(await bell(jar), link), "was told");
    }

    // ---- Marking read ----
    r = await send(boss, "POST", "/api/admin/notifications/read", { ids: [bossItem.id] });
    body = await r.json();
    check("one message is marked read", r.status === 200 && body.data?.marked === 1 && body.data.unread === bossList.unread - 1, `${r.status} ${brief(body)}`);
    check("and it shows as read", withHref(await bell(boss), link)?.read === true, "still unread");
    r = await send(boss, "POST", "/api/admin/notifications/read", { ids: [adminItem.id] });
    body = await r.json();
    check("nobody can mark another person's message", r.status === 200 && body.data?.marked === 0 && withHref(await bell(admin), link)?.read === false, `${r.status} ${brief(body)}`);

    // ---- Assigning the request tells the assignee, but not the one who assigns it to themselves ----
    r = await send(boss, "PATCH", `/api/admin/support/${requestId}`, { assignedToId: bossUser.id });
    check("a request can be assigned to yourself", r.status === 200, r.status);
    check("and that tells nobody", !has(await bell(boss), "support.assigned", requestId), "boss was told");
    r = await send(boss, "PATCH", `/api/admin/support/${requestId}`, { assignedToId: supportUser.id });
    check("a request can be assigned to someone else", r.status === 200, r.status);
    const assigned = (await bell(support)).items.find((item) => item.kind === "support.assigned" && item.href === link);
    check("the assignee is told", assigned?.title === "A support request was assigned to you", brief(assigned));

    // ---- An enquiry from the website tells those who work the leads ----
    ({ r, body } = await get(boss, "/api/admin/resources/website/books?tab=Published&pageSize=1"));
    const bookTitle = body.data?.[0]?.title;
    check("a published book exists for the enquiry", Boolean(bookTitle), brief(body));
    r = await send(null, "POST", "/api/public/enquiries/bulk-books", {
        firstName: "Smoke", lastName: "Tester", email: leadEmail, countryCode: "+91", mobile: "98765 43210", address: "1 Test Street", city: "Pune", pincode: "411001",
        book: bookTitle, quantity: 7, consent: true, website: "", startedAt: Date.now() - 10_000,
    });
    check("the enquiry is accepted", r.status === 201, r.status);
    const leadLink = `/admin/marketing/leads?q=${encodeURIComponent(leadEmail)}`;
    const leadItem = withHref(await bell(boss), leadLink);
    check("the Super Admin is told of the lead", leadItem?.kind === "lead.new" && leadItem.body === `7 copies of ${bookTitle}`, brief(leadItem));
    check("support staff are told of the lead", Boolean(withHref(await bell(support), leadLink)), "missing");
    check("a content editor, who may only read leads, is not", !withHref(await bell(editor), leadLink), "was told");

    // ---- The bell on the page ----
    let shown = await page(admin, "/admin");
    check("the top bar has the live bell, not the sample messages", shown.status === 200 && shown.html.includes('aria-label="Notifications') && !shown.html.includes("submissions waiting for review"), shown.status);
    r = await send(admin, "POST", "/api/admin/notifications/read", {});
    body = await r.json();
    check("all of a person's messages can be marked read", r.status === 200 && body.data?.unread === 0 && (await bell(admin)).unread === 0, `${r.status} ${brief(body)}`);

    // ---- The audit view ----
    r = await req(null, "/api/admin/audit");
    check("anonymous cannot open the audit log", r.status === 401, r.status);
    for (const [who, jar] of [["a learner", learner], ["an instructor", teacher], ["finance staff", finance], ["support staff", support], ["an Administrator", admin]]) {
        r = await req(jar, "/api/admin/audit");
        const options = await req(jar, "/api/admin/audit/options");
        check(`${who} cannot open the audit log`, r.status === 403 && options.status === 403, `${r.status} ${options.status}`);
    }
    ({ r, body } = await get(boss, "/api/admin/audit?pageSize=5"));
    const rows = body.data ?? [];
    check("the Super Admin sees the newest events first, five to a page", r.status === 200 && rows.length === 5 && body.meta.total >= 5 && rows.every((row, i) => i === 0 || rows[i - 1].at >= row.at), `${r.status} ${brief(body.meta)}`);
    check("each event says who, what and which record", rows.every((row) => row.id && row.at && row.actorName && row.action && row.label && row.entity && "summary" in row && "before" in row && "after" in row), brief(rows[0]));
    ({ body } = await get(boss, `/api/admin/audit?${qs({ "filter.action": "support.create", "filter.actor": "__learners" })}`));
    const created = body.data?.find((row) => row.entityId === requestId);
    check("the learner's support request is in the log, as a learner's action", created?.actorRole === "Learner" && created.label === "Support request sent", brief(created));
    ({ body } = await get(boss, `/api/admin/audit?${qs({ q: requestId })}`));
    check("a record id finds its events", body.data?.some((row) => row.action === "support.create") && body.data.some((row) => row.action === "support.update" || row.action === "support.status"), brief(body.data?.map((row) => row.action)));
    ({ body } = await get(boss, `/api/admin/audit?${qs({ "filter.action": "support.update", "filter.entity": "SupportRequest", q: requestId })}`));
    const reassigned = body.data?.[0];
    check("an assignment is logged with the person who made it and the change", reassigned?.actorEmail === env.SEED_ADMIN_EMAIL && /assigned to id/.test(reassigned.summary), brief(reassigned));

    r = await req(boss, "/api/admin/resources/marketing/leads/export");
    check("a list export works for the Super Admin", r.status === 200, r.status);
    ({ body } = await get(boss, `/api/admin/audit?${qs({ "filter.action": "export", "filter.entity": "marketing/leads", pageSize: 1 })}`));
    const exported = body.data?.[0];
    check("the export is in the log with its row count", exported?.actorEmail === env.SEED_ADMIN_EMAIL && /^rows: \d+/.test(exported.summary), brief(exported));
    ({ body } = await get(boss, `/api/admin/audit?${qs({ "filter.actor": exported?.actorId })}`));
    check("filtering by a person shows only their events", body.data?.length > 0 && body.data.every((row) => row.actorId === exported.actorId), brief(body.meta));
    ({ body } = await get(boss, `/api/admin/audit?${qs({ from: "2099-01-01" })}`));
    check("a period with nothing in it is empty", body.meta?.total === 0 && body.data?.length === 0, brief(body.meta));
    ({ body } = await get(boss, `/api/admin/audit/options`));
    check("the filters offer the actions, record types and people in the log", body.data?.actions?.some((a) => a.value === "export" && a.label === "List exported") && body.data.entities.includes("SupportRequest") && body.data.actors[0].value === "__learners" && body.data.actors[1].value === "__system" && body.data.actors.some((a) => a.value === bossUser.id), brief(body.data?.actors?.slice(0, 3)));
    for (const [label, query] of [["a month that does not exist", { from: "2026-13-01" }], ["an end before the start", { from: "2026-05-10", to: "2026-05-01" }], ["a sort the log does not offer", { sort: "ip" }], ["a page size of zero", { pageSize: 0 }]]) {
        r = await req(boss, `/api/admin/audit?${qs(query)}`);
        check(`${label} is refused`, r.status === 400, r.status);
    }
    shown = await page(boss, "/admin/settings/audit-log");
    check("the Audit Log page opens for the Super Admin", shown.status === 200 && shown.html.includes("Audit Log"), shown.status);
    shown = await page(admin, "/admin/settings/audit-log");
    check("an Administrator is sent to access-denied", shown.status >= 300 && shown.location.includes("/access-denied"), `${shown.status} ${shown.location}`);
    shown = await page(boss, "/admin/settings/my-profile");
    const bossMenu = shown.html.includes('href="/admin/settings/audit-log"');
    shown = await page(admin, "/admin/settings/my-profile");
    check("only the Super Admin's Settings menu lists the Audit Log", bossMenu && !shown.html.includes('href="/admin/settings/audit-log"'), `${bossMenu}`);

    // ---- Global search ----
    r = await req(null, "/api/admin/search?q=learner");
    check("anonymous cannot search", r.status === 401, r.status);
    r = await req(learner, "/api/admin/search?q=learner");
    check("a learner cannot search the admin records", r.status === 403, r.status);
    ({ r, body } = await get(boss, "/api/admin/search?q=a"));
    check("one letter searches nothing", r.status === 200 && body.data?.groups?.length === 0, brief(body));
    ({ r, body } = await get(boss, "/api/admin/search"));
    check("no text searches nothing", r.status === 200 && body.data?.groups?.length === 0, brief(body));
    const found = async (jar, text) => (await get(jar, `/api/admin/search?${qs({ q: text })}`)).body.data?.groups ?? [];
    let groups = await found(boss, tag);
    const supportHit = groups.find((group) => group.key === "support")?.hits[0];
    check("the Super Admin finds the support request by its text", supportHit?.href === link && supportHit.title === "Demo Learner", brief(groups));
    groups = await found(boss, "Demo Learner");
    check("a learner is found by name", groups.find((group) => group.key === "learners")?.hits.some((hit) => hit.title === "Demo Learner" && hit.href.startsWith("/admin/users/learners?q=")), brief(groups.map((g) => g.key)));
    groups = await found(teacher, "Demo Learner");
    check("an instructor finds the learner but not the support request", groups.some((g) => g.key === "learners") && !groups.some((g) => g.key === "support" || g.key === "leads" || g.key === "team"), brief(groups.map((g) => g.key)));
    groups = await found(finance, "Demo Learner");
    check("finance staff find only learners", groups.length === 1 && groups[0].key === "learners", brief(groups.map((g) => g.key)));
    groups = await found(editor, "Demo Learner");
    check("a content editor finds no learners", !groups.some((g) => g.key === "learners" || g.key === "support"), brief(groups.map((g) => g.key)));
    groups = await found(support, leadEmail);
    check("support staff find the new lead by email", groups.find((g) => g.key === "leads")?.hits[0]?.href === leadLink, brief(groups));
    groups = await found(editor, leadEmail);
    check("a content editor may read leads, so finds it too", groups.some((g) => g.key === "leads"), brief(groups.map((g) => g.key)));
    groups = await found(boss, "Demo Batch");
    check("a batch is found with its course", groups.find((g) => g.key === "batches")?.hits.some((hit) => hit.subtitle.includes("\u00b7")), brief(groups.map((g) => g.key)));
    groups = await found(boss, "learner@ibmv");
    check("a learner is also found by email", groups.some((g) => g.key === "learners"), brief(groups.map((g) => g.key)));
    ({ body } = await get(boss, `/api/admin/search?${qs({ q: "x".repeat(300) })}`));
    check("very long text is cut, not refused", Array.isArray(body.data?.groups), brief(body));

    // ---- A branch-bound administrator, and the link a result opens ----
    const branches = await prisma.branch.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 2 });
    if (branches.length < 2) {
        check("the database has two branches to test branch limits with", false, branches.length);
    } else {
        const [mine, other] = branches;
        const person = (email, name, reg, branchId) =>
            prisma.user.create({ data: { email, kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), learnerProfile: { create: { name, registrationNo: reg, branchId } } } });
        await person(`smoke.b8b.mine.${stamp}@example.com`, `Smoke Quokka Mine ${stamp}`, `SMK/${stamp}/1`, mine.id);
        await person(`smoke.b8b.other.${stamp}@example.com`, `Smoke Quokka Other ${stamp}`, `SMK/${stamp}/2`, other.id);
        await prisma.user.create({
            data: {
                email: scopedEmail, passwordHash: await hashPassword(scopedPassword), kind: "STAFF", role: "ADMIN", emailVerifiedAt: new Date(),
                staffProfile: { create: { displayName: "Smoke B8b Admin", branchId: mine.id } }, branches: { create: [{ branchId: mine.id }] },
            },
        });
        const scoped = await login(scopedEmail, scopedPassword);
        const names = async (jar) => (await found(jar, `Smoke Quokka`)).find((g) => g.key === "learners")?.hits.map((hit) => hit.title).sort();
        check("a Super Admin finds both learners", (await names(boss))?.length === 2, brief(await names(boss)));
        check("a branch-bound administrator finds only their branch's learner", JSON.stringify(await names(scoped)) === JSON.stringify([`Smoke Quokka Mine ${stamp}`]), brief(await names(scoped)));
        const hit = (await found(boss, `Smoke Quokka Mine ${stamp}`)).find((g) => g.key === "learners").hits[0];
        shown = await page(boss, hit.href);
        check("a result's link opens the list with the search box filled in", shown.status === 200 && shown.html.includes(`value="SMK/${stamp}/1"`), `${shown.status} ${hit.href}`);
        shown = await page(boss, `/admin/engage/support?open=${requestId}`);
        check("a support link opens the inbox", shown.status === 200 && shown.html.includes("Support Inbox"), shown.status);
        shown = await page(boss, "/admin/users/learners?q=" + encodeURIComponent("x".repeat(300)));
        check("a very long ?q= is cut, not refused", shown.status === 200, shown.status);

        // ---- A flood of searches is slowed down ----
        let limited = 0;
        let retry = null;
        for (let n = 0; n < 130; n += 1) {
            const res = await req(scoped, "/api/admin/search?q=quokka");
            if (res.status === 429) {
                limited += 1;
                retry ??= res.headers.get("retry-after");
            }
            await res.text();
        }
        check("more than 120 searches in a minute are refused with a retry time", limited >= 1 && Number(retry) > 0, `${limited} refused, retry-after ${retry}`);
    }
} catch (error) {
    failures += 1;
    console.error("FAIL  smoke script stopped early:", error);
} finally {
    const notices = await prisma.inAppNotification.deleteMany({ where: { OR: [{ href: { contains: requestId ?? "no-request" } }, { href: { contains: `smoke.b8b.${stamp}` } }] } });
    const requests = await prisma.supportRequest.deleteMany({ where: { message: { contains: tag } } });
    const leads = await prisma.lead.deleteMany({ where: { email: leadEmail } });
    const people = await prisma.user.deleteMany({ where: { email: { startsWith: "smoke.b8b." } } });
    console.log(`Cleaned up: ${notices.count} notification(s), ${requests.count} support request(s), ${leads.count} lead(s) and ${people.count} account(s) removed.`);
    await prisma.$disconnect();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
