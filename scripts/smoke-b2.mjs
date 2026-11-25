import fs from "node:fs";

// Usage: start the app (npm run start), then `node scripts/smoke-b2.mjs`.
// Needs `npm run db:seed` (catalog and demo accounts). Creates temporary records and removes them before finishing.
const envPath = new URL("../.env", import.meta.url);
const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
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
    return { status: r.status, html: (await r.text()).replace(/<!--.*?-->/g, "") };
};

let failures = 0;
function check(name, ok, detail = "") {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}
const loc = (r) => r.headers.get("location") ?? "";
const brief = (value) => JSON.stringify(value).slice(0, 200);
const stamp = Date.now();
const created = { courses: [], categories: [], leads: [], legal: [] };

// ---- Anonymous ----
let r = await req(null, "/api/admin/resources/products/courses");
check("anonymous course list is 401", r.status === 401, r.status);
r = await req(null, "/api/admin/categories");
check("anonymous category list is 401", r.status === 401, r.status);
r = await send(null, "PUT", "/api/admin/site-settings", {});
check("anonymous site-settings write is 401", r.status === 401, r.status);
r = await req(null, "/admin/products/courses");
check("anonymous course page redirects to login", r.status >= 300 && r.status < 400 && loc(r).includes("/login"), `${r.status} ${loc(r)}`);

// ---- Super Admin: pages and course list ----
const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
for (const path of ["products/courses", "settings/categories", "website/site-settings", "website/books", "website/people", "website/magazines", "website/videos", "website/legal-pages", "marketing/leads", "marketing/testimonials"]) {
    const result = await page(admin, `/admin/${path}`);
    check(`admin opens /admin/${path}`, result.status === 200, result.status);
}
r = await req(admin, "/api/admin/resources/products/courses?pageSize=5");
let body = await r.json();
check("course list is paged with tab counts", r.status === 200 && body.data.length === 5 && body.meta.total >= 100 && body.meta.tabCounts?.Published >= 1, `${r.status} ${brief(body.meta)}`);
r = await req(admin, `/api/admin/resources/products/courses/${body.data[0].id}`);
const detail = await r.json();
check("course detail carries every form field", r.status === 200 && detail.data.summary && detail.data.officialUrl && "faqs" in detail.data, `${r.status} ${brief(detail)}`);
r = await req(admin, "/api/admin/resources/products/courses?sort=password");
check("unknown course sort column is 400", r.status === 400, r.status);

// ---- Categories ----
r = await req(admin, "/api/admin/categories");
body = await r.json();
check("category tree lists collections with children", r.status === 200 && body.data.length >= 6 && body.data.every((c) => Array.isArray(c.children)), `${r.status} ${brief(body)}`);
const treeIds = body.data.map((c) => c.id);
const catTitle = `Smoke Category ${stamp}`;
r = await send(admin, "POST", "/api/admin/categories", { title: catTitle, description: "Temporary category created by the smoke test.", color: "blue", status: "Draft" });
body = await r.json();
check("admin creates a draft category", r.status === 201 && body.data?.slug?.startsWith("smoke-category"), `${r.status} ${brief(body)}`);
const category = body.data;
if (category) created.categories.push(category.id);
r = await send(admin, "POST", "/api/admin/categories", { title: "Reserved", slug: "books", description: "Clashes with a fixed page." });
body = await r.json();
check("reserved URL name is rejected with a field error", r.status === 400 && body.error?.fields?.slug, `${r.status} ${brief(body)}`);
r = await send(admin, "POST", "/api/admin/categories/reorder", { parentId: null, ids: treeIds.slice(1) });
check("incomplete reorder is 400", r.status === 400, r.status);

// ---- Courses: create, visibility, validation ----
const courseTitle = `Smoke Course ${stamp}`;
const payload = {
    title: courseTitle, category: catTitle, summary: "A temporary course created by the smoke test.", officialUrl: "https://example.org/smoke",
    status: "Published", language: "English", format: "Self-paced", faqs: JSON.stringify([{ question: "Is this a real course?", answer: "No, it is a smoke test." }]),
};
r = await send(admin, "POST", "/api/admin/resources/products/courses", payload);
body = await r.json();
check("admin creates a published course", r.status === 201 && body.data?.status === "Published", `${r.status} ${brief(body)}`);
const course = body.data;
if (course) created.courses.push(course.id);
r = await send(admin, "POST", "/api/admin/resources/products/courses", { ...payload, title: "Other", slug: course.slug });
check("duplicate URL name is 409", r.status === 409, r.status);
r = await send(admin, "POST", "/api/admin/resources/products/courses", { ...payload, title: "Bad", summary: "short", officialUrl: "javascript:alert(1)" });
body = await r.json();
check("invalid course returns field errors", r.status === 400 && body.error?.fields?.summary && body.error?.fields?.officialUrl, `${r.status} ${brief(body)}`);
r = await send(admin, "POST", "/api/admin/resources/products/courses", { ...payload, title: "Nested", category: "No such category" });
body = await r.json();
check("unknown category is a field error", r.status === 400 && body.error?.fields?.category, `${r.status} ${brief(body)}`);

let site = await page(null, `/website/course/${course.slug}`);
check("a course in a draft category is not public", site.status === 404, site.status);
r = await send(admin, "PATCH", `/api/admin/categories/${category.id}`, { title: catTitle, description: "Temporary category created by the smoke test.", color: "blue", status: "Published" });
check("admin publishes the category", r.status === 200, r.status);
site = await page(null, `/website/course/${course.slug}`);
check("the published course page shows its content and FAQ", site.status === 200 && site.html.includes(courseTitle) && site.html.includes("Is this a real course?"), `${site.status}`);
site = await page(null, `/website/${category.slug}`);
check("the new collection page lists the course", site.status === 200 && site.html.includes(courseTitle), `${site.status}`);
r = await send(admin, "DELETE", `/api/admin/resources/products/courses/${course.id}`);
check("a published course cannot be deleted (422)", r.status === 422, r.status);
r = await send(admin, "POST", `/api/admin/resources/products/courses/${course.id}/archive`, {});
body = await r.json();
check("admin archives the course", r.status === 200 && body.data?.status === "Archived", `${r.status} ${brief(body)}`);
site = await page(null, `/website/course/${course.slug}`);
check("an archived course disappears from the website", site.status === 404, site.status);
r = await send(admin, "DELETE", `/api/admin/categories/${category.id}`);
check("a category that still has a course cannot be deleted (422)", r.status === 422, r.status);

// ---- Site settings ----
r = await req(admin, "/api/admin/site-settings");
body = await r.json();
const original = body.data;
check("site settings load", r.status === 200 && original?.contact?.email && Array.isArray(original.social), `${r.status} ${brief(body)}`);
const edited = structuredClone(original);
edited.contact.phone = "+91 80000 11111";
r = await send(admin, "PUT", "/api/admin/site-settings", edited);
check("site settings save", r.status === 200, `${r.status}`);
site = await page(null, "/website/contact");
check("the website shows the new phone number at once", site.html.includes("80000 11111"), site.status);
const invalid = structuredClone(original);
invalid.contact.email = "nope";
invalid.links.donate = "javascript:alert(1)";
r = await send(admin, "PUT", "/api/admin/site-settings", invalid);
body = await r.json();
check("invalid settings return dotted field paths", r.status === 400 && body.error?.fields?.["contact.email"] && body.error?.fields?.["links.donate"], `${r.status} ${brief(body)}`);
r = await send(admin, "PUT", "/api/admin/site-settings", original);
check("site settings restored", r.status === 200, r.status);

// ---- Bulk book enquiry (public) -> lead (admin) ----
r = await req(admin, "/api/admin/resources/website/books?tab=Published&pageSize=1");
body = await r.json();
const bookTitle = body.data?.[0]?.title;
check("a published book exists for the enquiry", Boolean(bookTitle), brief(body));
const enquiry = (over = {}) => ({
    firstName: "Smoke", lastName: "Tester", email: `smoke.bulk.${stamp}@example.com`, countryCode: "+91", mobile: "98765 43210",
    address: "1 Test Street", city: "Pune", pincode: "411001", book: bookTitle, quantity: 5, consent: true, website: "", startedAt: Date.now() - 10_000, ...over,
});
r = await send(null, "POST", "/api/public/enquiries/bulk-books", enquiry());
check("a real enquiry is accepted (201)", r.status === 201, r.status);
r = await send(null, "POST", "/api/public/enquiries/bulk-books", enquiry({ email: `smoke.bot.${stamp}@example.com`, website: "https://spam.example" }));
check("a bot enquiry gets the same reply (201)", r.status === 201, r.status);
r = await send(null, "POST", "/api/public/enquiries/bulk-books", enquiry({ email: `smoke.bad.${stamp}@example.com`, consent: false }));
body = await r.json();
check("an enquiry without consent is 400 with a field error", r.status === 400 && body.error?.fields?.consent, `${r.status} ${brief(body)}`);
r = await send(null, "POST", "/api/public/enquiries/bulk-books", enquiry({ email: `smoke.evil.${stamp}@example.com` }), { "content-type": "application/json", origin: "http://evil.test" });
check("a cross-site enquiry is blocked (403)", r.status === 403, r.status);
r = await req(admin, `/api/admin/resources/marketing/leads?q=smoke.bulk.${stamp}`);
body = await r.json();
check("the enquiry is a lead in the admin", r.status === 200 && body.meta.total === 1 && body.data[0].source === "Bulk book enquiry" && body.data[0].stage === "New", `${r.status} ${brief(body)}`);
if (body.data?.[0]) created.leads.push(body.data[0].id);
r = await req(admin, `/api/admin/resources/marketing/leads?q=smoke.bot.${stamp}`);
body = await r.json();
check("the bot enquiry left no lead", r.status === 200 && body.meta.total === 0, `${r.status} ${brief(body.meta)}`);
r = await req(admin, "/api/admin/resources/marketing/leads/export");
check("leads export as CSV", r.status === 200 && (r.headers.get("content-type") ?? "").includes("text/csv"), r.status);

// ---- Roles ----
const password = env.SEED_DEMO_PASSWORD;
const editor = await login("demo.staff4@ibmv.local", password);
r = await req(editor, "/api/admin/resources/products/courses?pageSize=1");
check("content editor lists courses", r.status === 200, r.status);
r = await send(editor, "POST", "/api/admin/resources/products/courses", { ...payload, title: `Smoke Editor Course ${stamp}`, status: "Draft" });
body = await r.json();
check("content editor creates a draft course", r.status === 201, `${r.status} ${brief(body)}`);
if (body.data) created.courses.push(body.data.id);
r = await req(editor, "/api/admin/resources/marketing/leads?pageSize=1");
check("content editor can read leads", r.status === 200, r.status);
r = await send(editor, "POST", "/api/admin/resources/marketing/leads", { name: "Nope Person", email: "nope@example.com" });
check("content editor cannot add leads (403)", r.status === 403, r.status);
r = await send(editor, "POST", "/api/admin/resources/website/legal-pages", { type: "Terms", title: `Smoke terms ${stamp}`, body: "Temporary text for the smoke test of legal pages.", status: "Draft" });
body = await r.json();
check("content editor drafts legal text", r.status === 201, `${r.status} ${brief(body)}`);
if (body.data) created.legal.push(body.data.id);
r = await send(editor, "PATCH", `/api/admin/resources/website/legal-pages/${body.data?.id}`, { type: "Terms", title: `Smoke terms ${stamp}`, body: "Temporary text for the smoke test of legal pages.", status: "Published" });
check("content editor cannot publish legal text (403)", r.status === 403, r.status);
r = await req(editor, "/api/admin/site-settings");
check("content editor reads site settings", r.status === 200, r.status);

const finance = await login("demo.staff5@ibmv.local", password);
r = await req(finance, "/api/admin/resources/products/courses");
check("finance cannot read courses (403)", r.status === 403, r.status);
r = await req(finance, "/admin/products/courses");
check("finance is sent to access-denied for Courses", r.status >= 300 && loc(r).includes("/access-denied"), `${r.status} ${loc(r)}`);
r = await req(finance, "/api/admin/site-settings");
check("finance cannot read site settings (403)", r.status === 403, r.status);

const support = await login("demo.staff6@ibmv.local", password);
r = await send(support, "POST", "/api/admin/resources/products/courses", payload);
check("support cannot create courses (403)", r.status === 403, r.status);
r = await send(support, "POST", "/api/admin/resources/marketing/leads", { name: "Smoke Manual Lead", email: `smoke.manual.${stamp}@example.com`, stage: "New" });
body = await r.json();
check("support adds a manual lead", r.status === 201 && body.data?.source === "Manual entry", `${r.status} ${brief(body)}`);
if (body.data) created.leads.push(body.data.id);
r = await req(support, "/api/admin/resources/marketing/leads/export");
check("support cannot export leads (403)", r.status === 403, r.status);

const instructor = await login("demo.staff2@ibmv.local", password);
r = await send(instructor, "POST", "/api/admin/resources/products/courses", payload);
check("instructor cannot create courses (403)", r.status === 403, r.status);
r = await send(instructor, "POST", "/api/admin/categories", { title: "Nope", description: "Nope." });
check("instructor cannot create categories (403)", r.status === 403, r.status);

const learner = await login("learner@ibmv.local", password);
r = await req(learner, "/api/admin/categories");
check("learner cannot read categories (403)", r.status === 403, r.status);
r = await req(learner, "/api/admin/site-settings");
check("learner cannot read site settings (403)", r.status === 403, r.status);

// ---- Cleanup ----
for (const id of created.leads) {
    r = await send(admin, "DELETE", `/api/admin/resources/marketing/leads/${id}`);
    check("cleanup lead", r.status === 204, r.status);
}
for (const id of created.legal) {
    r = await send(admin, "DELETE", `/api/admin/resources/website/legal-pages/${id}`);
    check("cleanup legal draft", r.status === 204, r.status);
}
for (const id of created.courses) {
    r = await send(admin, "DELETE", `/api/admin/resources/products/courses/${id}`);
    check("cleanup course", r.status === 204, r.status);
}
for (const id of created.categories) {
    r = await send(admin, "DELETE", `/api/admin/categories/${id}`);
    check("cleanup category", r.status === 204, r.status);
}

console.log(failures === 0 ? "\nAll B2 smoke checks passed." : `\n${failures} B2 smoke check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
