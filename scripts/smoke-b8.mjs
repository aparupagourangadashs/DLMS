import fs from "node:fs";

// Usage: start the app (npm run start), then `npx tsx scripts/smoke-b8.mjs` (tsx is needed for the database client and the report list).
// Needs `npm run db:seed` (demo accounts). Checks the analytics reports over HTTP: who may open them, every report, the filters and their
// errors, the waiting reports, the figures against the database, a branch-bound administrator, the CSV export with its audit entry and the
// pages. Writes nothing except audit entries and one throwaway administrator (smoke.b8.*), which it removes before finishing.
const envPath = new URL("../.env", import.meta.url);
const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
process.env.DATABASE_URL = env.DATABASE_URL;
const { createPrismaClient } = await import("../src/server/prisma-factory.ts");
const { reportPages } = await import("../src/lib/admin/reports.ts");
const { addDays, istToday } = await import("../src/lib/ist.ts");
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
const send = (jar, method, path, body) => req(jar, path, { method, headers: json, body: body === undefined ? undefined : JSON.stringify(body) });
const loc = (r) => r.headers.get("location") ?? "";
const page = async (jar, path) => {
    const r = await req(jar, path);
    return { status: r.status, location: loc(r), html: (await r.text()).replace(/<!--.*?-->/g, "") };
};

let failures = 0;
function check(name, ok, detail = "") {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}
const brief = (value) => String(JSON.stringify(value)).slice(0, 240);

const stamp = Date.now();
const demoPassword = env.SEED_DEMO_PASSWORD;
const today = istToday();
const thisYear = { from: addDays(today, -364), to: today };
const qs = (params) => {
    const text = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "")).toString();
    return text ? `?${text}` : "";
};
const api = (page, key) => `/api/admin/analytics/${page}/${key}`;
const open = async (jar, page, key, params = {}) => {
    const r = await req(jar, `${api(page, key)}${qs(params)}`);
    return { r, body: await r.json() };
};
const num = (text) => Number(String(text).replaceAll(",", ""));
const esc = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const heading = (column) => (column.kind === "percent" ? `${column.label} (%)` : column.kind === "size" ? `${column.label} (MB)` : column.label);
const start = (date) => new Date(`${date}T00:00:00+05:30`);
const live = Object.entries(reportPages).flatMap(([pageKey, list]) => list.filter((report) => !report.waitsFor).map((report) => ({ page: pageKey, ...report })));
const waiting = Object.entries(reportPages).flatMap(([pageKey, list]) => list.filter((report) => report.waitsFor).map((report) => ({ page: pageKey, ...report })));
const auditCount = (entity) => prisma.auditEvent.count({ where: { action: "export", entity } });

const scopedEmail = `smoke.b8.${stamp}@example.com`;
const scopedPassword = `Smoke-${stamp}-Aa1!`;

try {
    // ---- Who may open the reports ----
    const sample = api("batch-progress", "batch-progress");
    let r = await req(null, sample);
    check("anonymous cannot open a report", r.status === 401, r.status);
    r = await req(null, `${sample}/export`);
    check("anonymous cannot export a report", r.status === 401, r.status);
    const learner = await login("learner@ibmv.local", demoPassword);
    const instructor = await login("demo.staff2@ibmv.local", demoPassword);
    const editor = await login("demo.staff4@ibmv.local", demoPassword);
    const support = await login("demo.staff6@ibmv.local", demoPassword);
    for (const [who, jar] of [["a learner", learner], ["an instructor", instructor], ["a content editor", editor], ["support staff", support]]) {
        r = await req(jar, sample);
        check(`${who} cannot open a report`, r.status === 403, r.status);
        r = await req(jar, `${sample}/export`);
        check(`${who} cannot export a report`, r.status === 403, r.status);
    }
    r = await page(instructor, "/admin/analytics/batch-progress");
    check("an instructor is sent to access-denied for the page", r.status >= 300 && r.location.includes("/access-denied"), `${r.status} ${r.location}`);
    const finance = await login("demo.staff5@ibmv.local", demoPassword);
    r = await req(finance, sample);
    check("finance can open a report", r.status === 200, r.status);
    r = await req(finance, `${sample}/export`);
    check("finance can export a report", r.status === 200 && (r.headers.get("content-type") ?? "").startsWith("text/csv"), r.status);
    const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    r = await send(admin, "POST", sample, {});
    check("a report cannot be changed (405)", r.status === 405, r.status);

    // ---- Every report ----
    for (const report of live) {
        const { r: res, body } = await open(admin, report.page, report.key);
        const data = body.data;
        const shaped = res.status === 200 && data?.columns?.length > 0 && Array.isArray(data.rows) && body.meta?.summary?.length >= 3 && typeof body.meta.total === "number" && body.meta.page === 1 && body.meta.pageSize === 25;
        check(`${report.page} / ${report.title}: figures, chart and rows come back`, shaped, `${res.status} ${brief(body)}`);
        check(`${report.page} / ${report.title}: every row has every column`, shaped && data.rows.every((row) => data.columns.every((column) => column.key in row)), brief(data?.rows?.[0]));
    }
    for (const report of waiting) {
        const { r: res, body } = await open(admin, report.page, report.key);
        check(`${report.page} / ${report.title}: waits, and says what for`, res.status === 422 && body.error?.message?.includes("not available yet") && body.error.message.includes(report.waitsFor), `${res.status} ${brief(body)}`);
    }
    let { r: res, body } = await open(admin, "batch-progress", "no-such-report");
    check("an unknown report is 404", res.status === 404, res.status);
    ({ r: res, body } = await open(admin, "feedback-rating", "batch-progress"));
    check("a page without live reports is 404", res.status === 404, res.status);

    // ---- Filters and their errors ----
    const daily = ["sales-enrollment", "product-enrollments"];
    for (const [label, params, field] of [
        ["a month that does not exist", { from: "2026-13-01" }, "from"],
        ["a day that does not exist", { from: "2026-02-30" }, "from"],
        ["a start that is not a date", { from: "yesterday" }, "from"],
        ["an end before the start", { from: "2026-05-10", to: "2026-05-01" }, "to"],
        ["a period longer than a year", { from: addDays(today, -400), to: today }, "to"],
    ]) {
        ({ r: res, body } = await open(admin, ...daily, params));
        check(`${label} is refused`, res.status === 400 && Boolean(body.error?.fields?.[field]), `${res.status} ${brief(body)}`);
    }
    ({ r: res, body } = await open(admin, "batch-progress", "batch-progress", { status: "Nonsense" }));
    check("a status the report does not offer is refused", res.status === 400 && Boolean(body.error?.fields?.status), `${res.status} ${brief(body)}`);
    ({ r: res, body } = await open(admin, "batch-progress", "batch-progress", { from: "garbage", to: "garbage" }));
    check("a snapshot report ignores a period it does not use", res.status === 200, `${res.status} ${brief(body)}`);
    ({ r: res, body } = await open(admin, "batch-progress", "batch-progress", { pageSize: 500, page: 99999 }));
    check("a page size is capped and a page past the end shows the last", res.status === 200 && body.meta.pageSize === 100 && body.meta.page === Math.max(1, Math.ceil(body.meta.total / 100)), brief(body.meta));
    ({ r: res, body } = await open(admin, "batch-progress", "batch-progress", { sort: "no_such_column", dir: "desc" }));
    check("an unknown sort column falls back to the report's own order", res.status === 200 && body.data.sort.key === "learners" && body.data.sort.dir === "desc", brief(body.data?.sort));
    ({ r: res, body } = await open(admin, "batch-progress", "batch-progress", { sort: "learners", dir: "asc", pageSize: 100 }));
    const learnerCounts = body.data?.rows?.map((row) => row.learners) ?? [];
    check("sorting by a number column puts the rows in order", res.status === 200 && learnerCounts.every((n, i) => i === 0 || learnerCounts[i - 1] <= n), brief(learnerCounts.slice(0, 10)));
    const unfiltered = await open(admin, "batch-progress", "batch-progress");
    ({ r: res, body } = await open(admin, "batch-progress", "batch-progress", { q: `zzz-nothing-${stamp}` }));
    check("a search that matches nothing empties the table but not the figures", res.status === 200 && body.meta.total === 0 && body.data.rows.length === 0 && brief(body.meta.summary) === brief(unfiltered.body.meta.summary), `${res.status} ${brief(body.meta)}`);

    // ---- The figures against the database ----
    const batches = await prisma.batch.count();
    check("Batch Progress lists every batch", unfiltered.body.meta?.total === batches && unfiltered.body.data?.truncated === false, `${unfiltered.body.meta?.total} vs ${batches}`);
    const enrolments = await prisma.enrolment.count({ where: { status: { in: ["ACTIVE", "COMPLETED"] }, user: { kind: "LEARNER" } } });
    ({ r: res, body } = await open(admin, "batch-progress", "learner-progress"));
    check("Learner Progress lists every active or completed enrolment", body.meta?.total === enrolments, `${body.meta?.total} vs ${enrolments}`);
    const enquiries = await prisma.lead.count({ where: { createdAt: { gte: start(thisYear.from), lt: start(addDays(thisYear.to, 1)) } } });
    ({ r: res, body } = await open(admin, "marketing-analytics", "lead-sources", thisYear));
    check("Lead Sources counts the enquiries of the period", res.status === 200 && num(body.meta.summary[0].value) === enquiries, `${brief(body.meta?.summary?.[0])} vs ${enquiries}`);
    const stored = await prisma.asset.findMany({ where: { status: "READY", storageKey: { not: null }, sizeBytes: { not: null } }, distinct: ["storageKey"], select: { storageKey: true } });
    ({ r: res, body } = await open(admin, "more", "storage-consumption"));
    check("Storage Consumption counts each stored file once", res.status === 200 && num(body.meta.summary[0].value) === stored.length, `${brief(body.meta?.summary?.[0])} vs ${stored.length}`);
    ({ r: res, body } = await open(admin, ...daily, { ...thisYear, pageSize: 100 }));
    check("Product Enrollments has a row for every day of the period", res.status === 200 && body.meta.total === 365, `${res.status} ${body.meta?.total}`);

    // ---- A branch-bound administrator sees only their branches ----
    const branches = await prisma.branch.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 2 });
    if (branches.length < 2) {
        check("the database has two branches to test scoping with", false, branches.length);
    } else {
        const [mine, other] = branches;
        await prisma.user.create({
            data: {
                email: scopedEmail,
                passwordHash: await hashPassword(scopedPassword),
                kind: "STAFF",
                role: "ADMIN",
                emailVerifiedAt: new Date(),
                staffProfile: { create: { displayName: "Smoke B8 Admin", branchId: mine.id } },
                branches: { create: [{ branchId: mine.id }] },
            },
        });
        const scoped = await login(scopedEmail, scopedPassword);
        const ownBatches = await prisma.batch.count({ where: { OR: [{ branchId: mine.id }, { branchId: null }] } });
        ({ r: res, body } = await open(scoped, "batch-progress", "batch-progress"));
        check("the batch report holds the branch's batches and the unassigned ones", res.status === 200 && body.meta.total === ownBatches, `${res.status} ${body.meta?.total} vs ${ownBatches}`);
        ({ r: res, body } = await open(scoped, "batch-progress", "batch-progress", { branch: other.id }));
        check("another branch's batches are not reachable by choosing the branch", res.status === 200 && body.meta.total === 0, `${res.status} ${body.meta?.total}`);
        const ownOnly = await prisma.batch.count({ where: { branchId: mine.id } });
        ({ r: res, body } = await open(scoped, "batch-progress", "batch-progress", { branch: mine.id }));
        check("choosing their own branch narrows to its batches", res.status === 200 && body.meta.total === ownOnly, `${res.status} ${body.meta?.total} vs ${ownOnly}`);
        const ownEnrolments = await prisma.enrolment.count({ where: { status: { in: ["ACTIVE", "COMPLETED"] }, user: { kind: "LEARNER", learnerProfile: { branchId: mine.id } } } });
        ({ r: res, body } = await open(scoped, "batch-progress", "learner-progress"));
        check("the learner report holds only the branch's learners", res.status === 200 && body.meta.total === ownEnrolments, `${res.status} ${body.meta?.total} vs ${ownEnrolments}`);
        const marker = (name) => `\\"label\\":\\"${name}\\"`;
        let shown = await page(scoped, "/admin/analytics/batch-progress");
        check("the page offers the branch-bound administrator only their branch", shown.status === 200 && shown.html.includes(marker(mine.name)) && !shown.html.includes(marker(other.name)), `${shown.status}`);
        shown = await page(admin, "/admin/analytics/batch-progress");
        check("the page offers a super administrator every branch", shown.status === 200 && shown.html.includes(marker(mine.name)) && shown.html.includes(marker(other.name)), `${shown.status}`);
        r = await req(scoped, `${api("batch-progress", "learner-progress")}/export`);
        const scopedCsv = (await r.text()).replace(/^\uFEFF/, "");
        check("the branch-bound export holds only the branch's rows", r.status === 200 && scopedCsv.split("\r\n").length === ownEnrolments + 1, `${r.status} ${scopedCsv.split("\r\n").length} vs ${ownEnrolments + 1}`);
    }

    // ---- The CSV file ----
    const entity = "analytics/batch-progress/learner-progress";
    const before = await auditCount(entity);
    const full = await open(admin, "batch-progress", "learner-progress");
    r = await req(admin, `${api("batch-progress", "learner-progress")}/export`);
    const bytes = Buffer.from(await r.arrayBuffer());
    const text = bytes.toString("utf8");
    check("the export is a CSV attachment that is not cached", r.status === 200 && (r.headers.get("content-type") ?? "").startsWith("text/csv") && (r.headers.get("content-disposition") ?? "").includes('attachment; filename="learner-progress.csv"') && r.headers.get("cache-control") === "no-store", `${r.status} ${r.headers.get("content-type")} ${r.headers.get("content-disposition")}`);
    const lines = text.replace(/^\uFEFF/, "").split("\r\n");
    check("the file starts with a byte-order mark and the column headings", bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf && lines[0] === full.body.data.columns.map((column) => `"${heading(column)}"`).join(","), brief(lines[0]));
    check("the file holds every row, not only the visible page", lines.length === full.body.meta.total + 1, `${lines.length} vs ${full.body.meta.total + 1}`);
    check("an export is audited with its row count", (await auditCount(entity)) === before + 1 && (await prisma.auditEvent.findFirst({ where: { action: "export", entity }, orderBy: { createdAt: "desc" } }))?.after?.rows === full.body.meta.total, "no audit entry");
    const firstRow = full.body.data.rows[0];
    if (firstRow) {
        const word = String(firstRow[full.body.data.columns[0].key]);
        const narrowed = await open(admin, "batch-progress", "learner-progress", { q: word });
        r = await req(admin, `${api("batch-progress", "learner-progress")}/export${qs({ q: word })}`);
        const narrowedLines = (await r.text()).replace(/^\uFEFF/, "").split("\r\n");
        check("the file follows the search", r.status === 200 && narrowedLines.length === narrowed.body.meta.total + 1 && narrowed.body.meta.total >= 1 && narrowed.body.meta.total <= full.body.meta.total, `${narrowedLines.length} vs ${narrowed.body.meta.total + 1}`);
    }
    const waitingKey = waiting[0];
    const auditBefore = await auditCount(`analytics/${waitingKey.page}/${waitingKey.key}`);
    r = await req(admin, `${api(waitingKey.page, waitingKey.key)}/export`);
    check("a waiting report cannot be exported, and nothing is audited", r.status === 422 && (await auditCount(`analytics/${waitingKey.page}/${waitingKey.key}`)) === auditBefore, r.status);
    r = await req(admin, `${api("sales-enrollment", "product-enrollments")}/export${qs({ from: "2026-13-01" })}`);
    check("an export with a bad period is refused", r.status === 400, r.status);

    // ---- The pages ----
    for (const [pageKey, list] of Object.entries(reportPages)) {
        const shown = await page(admin, `/admin/analytics/${pageKey}`);
        const titles = list.every((report) => shown.html.includes(esc(report.title)));
        check(`/admin/analytics/${pageKey} lists its reports`, shown.status === 200 && titles, `${shown.status} ${titles}`);
        const needs = list.filter((report) => report.waitsFor);
        check(`/admin/analytics/${pageKey} says what the waiting reports need`, shown.status === 200 && needs.every((report) => shown.html.includes(`Needs: ${esc(report.waitsFor)}`)), `${shown.status}`);
    }
    const demo = await page(admin, "/admin/analytics/feedback-rating");
    check("a page without live reports still opens with its sample data", demo.status === 200, demo.status);
} catch (error) {
    failures += 1;
    console.error("FAIL  smoke script stopped early:", error);
} finally {
    const gone = await prisma.user.deleteMany({ where: { email: scopedEmail } });
    console.log(`Cleaned up: ${gone.count} throwaway administrator(s) removed.`);
    await prisma.$disconnect();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
