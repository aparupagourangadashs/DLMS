import fs from "node:fs";

// Usage: start the app (npm run start), then `npx tsx scripts/smoke-b3.mjs` (tsx is needed for the clean-up client).
// Needs `npm run db:seed` (demo accounts). Creates temporary records and removes them before finishing.
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

const req = (jar, path, init = {}) =>
    fetch(base + path, { redirect: "manual", ...init, headers: { cookie: jar ? jar.header() : "", ...(init.headers ?? {}) } });
const json = { "content-type": "application/json", origin: base };
const send = (jar, method, path, body, headers = json) =>
    req(jar, path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
const page = async (jar, path) => {
    const r = await req(jar, path);
    return { status: r.status, location: r.headers.get("location") ?? "", html: (await r.text()).replace(/<!--.*?-->/g, "") };
};

let failures = 0;
function check(name, ok, detail = "") {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}
const brief = (value) => JSON.stringify(value).slice(0, 220);
const stamp = Date.now();
const password = env.SEED_DEMO_PASSWORD;
const tag = "[smoke-b3]";

try {
    // ---- Anonymous ----
    let r = await req(null, "/api/student/profile");
    check("anonymous student profile is 401", r.status === 401, r.status);
    r = await req(null, "/api/student/support-requests");
    check("anonymous support list is 401", r.status === 401, r.status);
    r = await req(null, "/api/admin/support");
    check("anonymous admin support is 401", r.status === 401, r.status);

    // ---- Learner: pages ----
    const learner = await login("learner@ibmv.local", password);
    let result = await page(learner, "/student");
    check("learner home shows the profile card", result.status === 200 && result.html.includes("Profile completion"), result.status);
    check("the home profile card no longer carries demo wording", !result.html.includes("Sample profile completion") && !result.html.includes("fictional baseline"), "demo text still present");
    result = await page(learner, "/student/settings/profile");
    check("profile page shows the registration number", result.status === 200 && /Registration no\. IBMV\/\d{2}\/\d{5}/.test(result.html), result.status);
    result = await page(learner, "/student/settings/preferences");
    check("preferences page renders the consent explanation", result.status === 200 && result.html.includes("Promotional campaigns"), result.status);
    result = await page(learner, "/student/help");
    check("help page shows messages and contact details", result.status === 200 && result.html.includes("Your recent messages") && result.html.includes("Contact IBMV"), result.status);
    result = await page(null, "/student/settings/profile");
    check("anonymous profile page redirects to sign-in", result.status >= 300 && result.location.includes("/login"), `${result.status} ${result.location}`);

    // ---- Learner: profile API ----
    r = await req(learner, "/api/student/profile");
    let body = await r.json();
    const original = body.data;
    check("learner reads their profile", r.status === 200 && original?.email === "learner@ibmv.local" && /^IBMV\//.test(original.registrationNo), `${r.status} ${brief(body)}`);
    r = await send(learner, "PATCH", "/api/student/profile", { city: "Pune", address: "12 Temple Road", mobile: "+91 98765 43210", username: `smoke${stamp}`.slice(0, 20) });
    body = await r.json();
    check("learner saves part of their profile", r.status === 200 && body.data?.city === "Pune" && body.data?.name === original.name, `${r.status} ${brief(body)}`);
    r = await send(learner, "PATCH", "/api/student/profile", { dob: "2999-01-01", username: "no spaces!", parentEmail: "nope" });
    body = await r.json();
    check("invalid profile values return field errors", r.status === 400 && body.error?.fields?.dob && body.error?.fields?.username && body.error?.fields?.parentEmail, `${r.status} ${brief(body)}`);
    r = await send(learner, "PATCH", "/api/student/profile", { email: "someone.else@example.com", registrationNo: "IBMV/00/99999", city: "Pune" });
    body = await r.json();
    check("email and registration number cannot be changed", r.status === 200 && body.data?.email === "learner@ibmv.local" && body.data?.registrationNo === original.registrationNo, `${r.status} ${brief(body)}`);
    const other = await login("demo.learner1@ibmv.local", password);
    r = await send(other, "PATCH", "/api/student/profile", { username: `smoke${stamp}`.slice(0, 20) });
    body = await r.json();
    check("a username already taken is a field error", r.status === 400 && body.error?.fields?.username, `${r.status} ${brief(body)}`);
    r = await send(learner, "PATCH", "/api/student/profile", { origin: "x" }, { "content-type": "application/json", origin: "http://evil.test" });
    check("cross-site profile change is blocked", r.status === 403, r.status);

    // ---- Learner: preferences API ----
    r = await req(learner, "/api/student/preferences");
    body = await r.json();
    const prefs = body.data;
    check("learner reads their preferences", r.status === 200 && typeof prefs?.timezone === "string" && typeof prefs?.promotional === "boolean", `${r.status} ${brief(body)}`);
    r = await send(learner, "PUT", "/api/student/preferences", { ...prefs, timezone: "Europe/London", promotional: true, whatsapp: true });
    body = await r.json();
    check("learner saves preferences", r.status === 200 && body.data?.timezone === "Europe/London" && body.data?.promotional === true, `${r.status} ${brief(body)}`);
    r = await send(learner, "PUT", "/api/student/preferences", { ...prefs, timezone: "Mars/Olympus" });
    body = await r.json();
    check("an invalid timezone is a field error", r.status === 400 && body.error?.fields?.timezone, `${r.status} ${brief(body)}`);
    r = await send(learner, "PUT", "/api/student/preferences", { timezone: "UTC" });
    check("a partial preferences save is rejected", r.status === 400, r.status);

    // ---- Learner: support ----
    r = await send(learner, "POST", "/api/student/support-requests", { message: "short" });
    body = await r.json();
    check("a too-short message is a field error", r.status === 400 && body.error?.fields?.message, `${r.status} ${brief(body)}`);
    r = await send(learner, "POST", "/api/student/support-requests", { message: `${tag} I cannot find my certificate (${stamp}).` });
    body = await r.json();
    const request = body.data;
    check("learner sends a support message", r.status === 201 && request?.status === "Open", `${r.status} ${brief(body)}`);
    r = await req(learner, "/api/student/support-requests");
    body = await r.json();
    check("learner sees their message", r.status === 200 && body.data.some((item) => item.id === request?.id), `${r.status} ${brief(body)}`);
    r = await req(other, "/api/student/support-requests");
    body = await r.json();
    check("another learner does not see it", r.status === 200 && !body.data.some((item) => item.id === request?.id), `${r.status} ${brief(body)}`);

    // ---- Admin: pages and learners ----
    const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    for (const path of ["users/learners", "engage/support", "users/new-enrolment"]) {
        result = await page(admin, `/admin/${path}`);
        check(`admin opens /admin/${path}`, result.status === 200, result.status);
    }
    r = await req(admin, "/api/admin/resources/users/learners?pageSize=5");
    body = await r.json();
    check("learner list is paged with tab counts", r.status === 200 && body.data.length === 5 && body.meta.total >= 25 && body.meta.tabCounts?.Registered >= 1, `${r.status} ${brief(body.meta)}`);
    r = await req(admin, "/api/admin/resources/users/learners?filter.city=Pune&pageSize=50");
    body = await r.json();
    check("city filter narrows the list", r.status === 200 && body.data.length > 0 && body.data.every((row) => row.city === "Pune"), `${r.status} ${brief(body.meta)}`);
    r = await req(admin, `/api/admin/resources/users/learners?q=${encodeURIComponent(original.registrationNo)}`);
    body = await r.json();
    check("a registration number finds the learner", r.status === 200 && body.meta.total === 1 && body.data[0].email === "learner@ibmv.local", `${r.status} ${brief(body)}`);
    r = await req(admin, "/api/admin/resources/users/learners?sort=password");
    check("unknown learner sort column is 400", r.status === 400, r.status);

    const email = `smoke.b3.${stamp}@example.com`;
    r = await send(admin, "POST", "/api/admin/resources/users/learners", { name: "Smoke Learner", email, phone: "+91 90000 12345", city: "Nashik", branch: "Pune Centre" });
    body = await r.json();
    const created = body.data;
    check("admin adds a learner", r.status === 201 && /^IBMV\/\d{2}\/\d{5}$/.test(created?.regNo) && created.status === "Registered", `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", "/api/admin/resources/users/learners", { name: "Smoke Again", email });
    check("a duplicate email is 409", r.status === 409, r.status);
    r = await send(admin, "POST", "/api/admin/resources/users/learners", { name: "X", email: "nope" });
    body = await r.json();
    check("an invalid learner returns field errors", r.status === 400 && body.error?.fields?.name && body.error?.fields?.email, `${r.status} ${brief(body)}`);
    r = await send(admin, "PATCH", `/api/admin/resources/users/learners/${created.id}`, { name: "Smoke Learner Two", standing: "On leave", email: "changed@example.com" });
    body = await r.json();
    check("admin edits a learner; the email stays", r.status === 200 && body.data?.name === "Smoke Learner Two" && body.data?.status === "On leave" && body.data?.email === email, `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", `/api/admin/resources/users/learners/${created.id}/archive`, {});
    body = await r.json();
    check("admin archives a learner", r.status === 200 && body.data?.status === "Archived", `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", `/api/admin/resources/users/learners/${created.id}/reset-password`, {});
    check("a password reset for an archived learner is refused", r.status === 400, r.status);
    r = await send(admin, "POST", `/api/admin/resources/users/learners/${created.id}/restore`, {});
    body = await r.json();
    check("admin restores a learner", r.status === 200 && body.data?.status === "Registered", `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", `/api/admin/resources/users/learners/${created.id}/reset-password`, {});
    check("admin sends a password reset link", r.status === 200, r.status);
    r = await req(admin, "/api/admin/resources/users/learners/export");
    const csv = await r.text();
    check("learners export as CSV", r.status === 200 && (r.headers.get("content-type") ?? "").includes("text/csv") && csv.includes("Registration no."), `${r.status} ${csv.slice(0, 80)}`);

    // ---- Admin: support inbox ----
    r = await req(admin, "/api/admin/support?tab=Open");
    body = await r.json();
    check("support inbox lists open requests with counts", r.status === 200 && body.data.some((item) => item.id === request?.id) && body.meta.tabCounts?.Open >= 1, `${r.status} ${brief(body.meta)}`);
    r = await req(admin, `/api/admin/support/${request.id}`);
    body = await r.json();
    check("admin opens a request thread", r.status === 200 && body.data?.email === "learner@ibmv.local" && Array.isArray(body.data.replies), `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", `/api/admin/support/${request.id}/replies`, { body: `${tag} We have re-sent your certificate.` });
    body = await r.json();
    check("admin replies; the request moves to In progress", r.status === 201 && body.data?.status === "In progress" && body.data.replies.length === 1, `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", `/api/admin/support/${request.id}/replies`, { body: "x" });
    check("a one-letter reply is 400", r.status === 400, r.status);
    r = await req(learner, "/api/student/support-requests");
    body = await r.json();
    check("the learner sees the reply", r.status === 200 && body.data.find((item) => item.id === request.id)?.replies?.[0]?.body?.includes("re-sent"), `${r.status} ${brief(body)}`);
    r = await send(admin, "PATCH", `/api/admin/support/${request.id}`, { status: "Resolved" });
    body = await r.json();
    check("admin resolves a request", r.status === 200 && body.data?.status === "Resolved", `${r.status} ${brief(body)}`);
    r = await send(admin, "PATCH", `/api/admin/support/${request.id}`, { status: "Closed" });
    check("an unknown status is 400", r.status === 400, r.status);

    // ---- Roles ----
    const instructor = await login("demo.staff2@ibmv.local", password);
    r = await req(instructor, "/api/admin/resources/users/learners?pageSize=1");
    check("instructor can read learners", r.status === 200, r.status);
    r = await send(instructor, "POST", "/api/admin/resources/users/learners", { name: "Not Allowed", email: `smoke.b3.no.${stamp}@example.com` });
    check("instructor cannot add learners (403)", r.status === 403, r.status);
    r = await req(instructor, "/api/admin/support");
    check("instructor cannot read the support inbox (403)", r.status === 403, r.status);
    result = await page(instructor, "/admin/engage/support");
    check("instructor is sent to access-denied for the inbox", result.status >= 300 && result.location.includes("/access-denied"), `${result.status} ${result.location}`);

    const editor = await login("demo.staff4@ibmv.local", password);
    r = await req(editor, "/api/admin/resources/users/learners?pageSize=1");
    check("content editor cannot read learners (403)", r.status === 403, r.status);

    const supportStaff = await login("demo.staff6@ibmv.local", password);
    r = await send(supportStaff, "POST", "/api/admin/resources/users/learners", { name: "Support Added", email: `smoke.b3.support.${stamp}@example.com` });
    body = await r.json();
    check("support staff can add a learner", r.status === 201, `${r.status} ${brief(body)}`);
    r = await req(supportStaff, "/api/admin/resources/users/learners/export");
    check("support staff cannot export learners (403)", r.status === 403, r.status);
    r = await req(supportStaff, "/api/admin/support");
    check("support staff reads the inbox", r.status === 200, r.status);

    const finance = await login("demo.staff5@ibmv.local", password);
    r = await req(finance, "/api/admin/resources/users/learners?pageSize=1");
    check("finance can read learners", r.status === 200, r.status);
    r = await send(finance, "PATCH", `/api/admin/resources/users/learners/${created.id}`, { name: "Finance Edit" });
    check("finance cannot edit learners (403)", r.status === 403, r.status);

    r = await req(learner, "/api/admin/resources/users/learners");
    check("a learner cannot call the learner admin API (403)", r.status === 403, r.status);
    r = await req(learner, "/api/admin/support");
    check("a learner cannot read the support inbox (403)", r.status === 403, r.status);
    r = await req(admin, "/api/student/profile");
    check("staff cannot use the learner profile API (403)", r.status === 403, r.status);
} finally {
    // ---- Clean up everything this run created or changed ----
    const demo = await prisma.user.findUnique({ where: { email: "learner@ibmv.local" } });
    if (demo) {
        await prisma.learnerProfile.update({ where: { userId: demo.id }, data: { username: null, city: null, residentialAddress: null, timezone: "Asia/Kolkata", timezoneAuto: false } });
        await prisma.user.update({ where: { id: demo.id }, data: { phone: null } });
        await prisma.notificationPreference.deleteMany({ where: { userId: demo.id } });
    }
    await prisma.supportRequest.deleteMany({ where: { message: { startsWith: tag } } });
    const removed = await prisma.user.deleteMany({ where: { email: { startsWith: "smoke.b3." } } });
    console.log(`cleanup: removed ${removed.count} smoke learner(s), reset the demo learner profile, deleted smoke support requests`);
    await prisma.$disconnect();
}

console.log(failures === 0 ? "\nAll B3 smoke checks passed." : `\n${failures} B3 smoke check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
