import fs from "node:fs";

// Usage: start the app (npm run start), then `npx tsx scripts/smoke-b2b-blogs.mjs` (tsx is needed for the clean-up client).
// Needs `npm run db:seed` (demo accounts). Creates a few articles with a cover, checks the admin screen, the public blog
// pages, the menu link, the view counter and the access rules, and removes everything before finishing.
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
// A visitor is told apart by the forwarded address, as behind the real proxy.
const view = (slug, visitor, origin = base) => req(null, `/api/public/blogs/${slug}/views`, { method: "POST", headers: { origin, "x-forwarded-for": visitor } });

let failures = 0;
function check(name, ok, detail = "") {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}
const brief = (value) => JSON.stringify(value).slice(0, 240);

const stamp = Date.now();
const tag = `Smoke B2b blogs ${stamp}`;
const demoPassword = env.SEED_DEMO_PASSWORD;
const png = Buffer.concat([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"), Buffer.alloc(200, 5)]);
const blogs = "/api/admin/resources/marketing/blogs";
const library = "/api/admin/resources/learning/asset-library";
const longBody = [
    "# Smoke heading",
    "A paragraph with **bold words** and *italic words*.",
    "- First bullet\n- Second bullet",
    "<script>alert('x')</script>",
    "[click me](javascript:alert(1))",
].join("\n\n");
const form = (over = {}) => ({ name: `${tag} Article`, slug: "", summary: "", cover: "", author: "", status: "Draft", body: longBody, ...over });
const publishedBefore = (await prisma.blog.count({ where: { status: "PUBLISHED" } })) > 0;
const hasMenuLink = (html) => html.includes('href="/website/blogs"');

try {
    // ---- Who may use the screen ----
    let r = await req(null, blogs);
    check("anonymous cannot list blogs", r.status === 401, r.status);
    r = await send(null, "POST", blogs, form());
    check("anonymous cannot create a blog", r.status === 401, r.status);
    const learner = await login("learner@ibmv.local", demoPassword);
    const teacher = await login("demo.staff2@ibmv.local", demoPassword);
    for (const [who, jar] of [["a learner", learner], ["an instructor", teacher]]) {
        r = await req(jar, blogs);
        check(`${who} cannot list blogs`, r.status === 403, r.status);
        r = await send(jar, "POST", blogs, form());
        check(`${who} cannot create a blog`, r.status === 403, r.status);
    }

    // ---- An article in the admin ----
    const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    r = await upload(admin, "cover.png", png, "Image");
    let body = await r.json();
    const cover = body.data;
    check("the cover uploads", r.status === 201 && Boolean(cover?.id), `${r.status} ${brief(body)}`);

    for (const [label, over, field] of [["a short title", { name: "ab" }, "name"], ["a short article", { body: "too short" }, "body"], ["an address with capitals", { slug: "Has Capitals" }, "slug"], ["an unknown author", { author: "Nobody At All" }, "author"], ["a made-up status", { status: "Live" }, "status"]]) {
        r = await send(admin, "POST", blogs, form(over));
        body = await r.json();
        check(`${label} is refused`, r.status === 400 && Boolean(body.error?.fields?.[field]), `${r.status} ${brief(body)}`);
    }

    r = await send(admin, "POST", blogs, form({ summary: "A short summary for the list.", cover: JSON.stringify(cover) }));
    body = await r.json();
    const article = body.data;
    check("the article is saved as a draft with its own web address", r.status === 201 && article?.status === "Draft" && article.slug.startsWith("smoke-b2b-blogs-") && article.publishedOn === "" && article.views === 0, `${r.status} ${brief(body)}`);
    check("its cover shows in the list", article?.thumbnail === `/api/assets/${cover.id}/file`, article?.thumbnail);
    r = await send(admin, "POST", blogs, form({ slug: article.slug }));
    body = await r.json();
    check("a web address cannot be taken twice", r.status === 409 && Boolean(body.error?.fields?.slug), `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", blogs, form({ cover: JSON.stringify(cover) }));
    body = await r.json();
    check("an upload cannot be used twice", r.status === 400 && Boolean(body.error?.fields?.cover), `${r.status} ${brief(body)}`);

    // ---- A draft is not public ----
    let result = await page(null, `/website/blogs/${article.slug}`);
    check("a draft article is 404 on the website", result.status === 404, result.status);
    result = await page(null, "/website/blogs");
    check("the blog page does not list a draft", result.status === 200 && !result.html.includes(tag), result.status);
    r = await view(article.slug, "203.0.113.1");
    check("a draft cannot be counted", r.status === 404, r.status);

    // ---- Published ----
    const row = (await (await req(admin, `${blogs}/${article.id}`)).json()).data;
    r = await send(admin, "PATCH", `${blogs}/${article.id}`, { ...row, status: "Published" });
    body = await r.json();
    check("publishing stamps the date", r.status === 200 && body.data?.status === "Published" && /^\d{4}-\d{2}-\d{2}$/.test(body.data.publishedOn), `${r.status} ${brief(body)}`);
    result = await page(null, `/website/blogs/${article.slug}`);
    const html = result.html;
    check("the article opens", result.status === 200 && html.includes(`${tag} Article`), result.status);
    check("the Markdown is rendered as a heading, bold, italic and a list", html.includes("<h2>Smoke heading</h2>") && html.includes("<strong>bold words</strong>") && html.includes("<em>italic words</em>") && html.includes("<li>First bullet</li>"), "missing markup");
    check("HTML and links in the text stay plain text", html.includes("&lt;script&gt;alert(") && !html.includes("<script>alert(") && html.includes("[click me](javascript:alert(1))") && !html.includes('href="javascript:'), "unsafe markup");
    check("the cover and the byline show", html.includes(`/api/assets/${cover.id}/file`) && html.includes("min read") && html.includes(row.byline), "cover or byline missing");
    r = await req(null, `/api/assets/${cover.id}/file`);
    check("the cover image is public", r.status === 200 && r.headers.get("content-type") === "image/png", `${r.status} ${r.headers.get("content-type")}`);
    result = await page(null, "/website/blogs");
    check("the blog page lists it with its summary", result.status === 200 && result.html.includes(`href="/website/blogs/${article.slug}"`) && result.html.includes("A short summary for the list."), result.status);
    result = await page(null, "/website");
    check("the menu offers the Blog link", result.status === 200 && hasMenuLink(result.html), result.status);

    // ---- Views ----
    r = await view(article.slug, "203.0.113.10");
    body = await r.json();
    check("a view is counted", r.status === 200 && body.data?.counted === true, `${r.status} ${brief(body)}`);
    r = await view(article.slug, "203.0.113.10");
    body = await r.json();
    check("the same visitor is not counted twice in the hour", r.status === 200 && body.data?.counted === false, `${r.status} ${brief(body)}`);
    r = await view(article.slug, "203.0.113.11");
    body = await r.json();
    check("another visitor is counted", body.data?.counted === true, brief(body));
    r = await view("no-such-article", "203.0.113.12");
    check("an unknown article is 404", r.status === 404, r.status);
    r = await view(article.slug, "203.0.113.13", "https://elsewhere.example");
    check("a request from another site is refused", r.status === 403, r.status);
    r = await req(null, `/api/public/blogs/${article.slug}/views`);
    check("only POST counts a view", r.status === 405, r.status);
    check("the admin list shows the views", (await (await req(admin, `${blogs}/${article.id}`)).json()).data?.views === 2, "views");

    // ---- The admin list ----
    const others = [];
    for (let n = 1; n <= 10; n += 1) {
        r = await send(admin, "POST", blogs, form({ name: `${tag} Extra ${String(n).padStart(2, "0")}`, status: "Published", body: `Extra article number ${n}, long enough to be saved.` }));
        others.push((await r.json()).data);
    }
    check("ten more articles are saved", others.every((o) => o?.status === "Published"), others.length);
    r = await req(admin, `${blogs}?q=${encodeURIComponent(tag)}&pageSize=5&sort=name&dir=asc`);
    body = await r.json();
    check("the list searches, sorts and pages", r.status === 200 && body.meta.total === 11 && body.data.length === 5 && body.data[0].name === `${tag} Article` && !("body" in body.data[0]), `${r.status} ${brief(body.meta)}`);
    r = await req(admin, `${blogs}?q=${encodeURIComponent(tag)}&filter.status=Draft`);
    body = await r.json();
    check("the visibility filter works", r.status === 200 && body.meta.total === 0, `${r.status} ${brief(body.meta)}`);
    r = await req(admin, `${blogs}?q=${encodeURIComponent(tag)}&sort=views&dir=desc&pageSize=1`);
    body = await r.json();
    check("sorting by views puts the viewed article first", body.data?.[0]?.id === article.id, brief(body.data?.[0]?.name));

    // ---- Paging on the website ----
    result = await page(null, "/website/blogs");
    const cards = (result.html.match(/class="web-article-card"/g) ?? []).length;
    check("the first page shows nine articles and a way to the next", result.status === 200 && cards === 9 && result.html.includes("Page 1 of") && result.html.includes('rel="next"'), `${result.status} ${cards}`);
    result = await page(null, "/website/blogs?page=2");
    check("the second page opens", result.status === 200 && result.html.includes("Page 2 of") && result.html.includes('rel="prev"'), result.status);
    result = await page(null, "/website/blogs?page=999");
    check("a page past the end shows the last one", result.status === 200 && /Page \d+ of \d+/.test(result.html), result.status);

    // ---- Hiding, copying and deleting ----
    r = await send(admin, "PATCH", `${blogs}/${article.id}`, { ...row, status: "Hidden" });
    body = await r.json();
    check("an article can be hidden and keeps its date", r.status === 200 && body.data?.status === "Hidden" && body.data.publishedOn !== "", `${r.status} ${brief(body)}`);
    result = await page(null, `/website/blogs/${article.slug}`);
    check("a hidden article is 404", result.status === 404, result.status);
    r = await view(article.slug, "203.0.113.14");
    check("a hidden article is not counted", r.status === 404, r.status);
    r = await send(admin, "POST", `${blogs}/${article.id}/duplicate`);
    body = await r.json();
    check("an article can be copied as a draft", r.status === 200 && body.data?.status === "Draft" && body.data.name === `${tag} Article (copy)` && body.data.slug === `${article.slug}-copy`, `${r.status} ${brief(body)}`);
    r = await send(admin, "DELETE", `${blogs}/${others[0].id}`);
    check("a published article cannot be deleted", r.status === 422, r.status);
    r = await send(admin, "DELETE", `${blogs}/${article.id}`);
    check("a hidden article can be deleted", r.status === 204, r.status);
    r = await send(admin, "DELETE", `${library}/${cover.id}`);
    check("the cover stays in use through the copy", r.status === 409, r.status);

    // ---- The menu follows what is published ----
    await prisma.blog.updateMany({ where: { title: { startsWith: tag }, status: "PUBLISHED" }, data: { status: "HIDDEN" } });
    result = await page(null, "/website");
    check("the menu link follows what is published", result.status === 200 && hasMenuLink(result.html) === publishedBefore, `${hasMenuLink(result.html)} vs ${publishedBefore}`);
} catch (error) {
    failures += 1;
    console.error("FAIL  smoke script stopped early:", error);
} finally {
    // Remove everything this run created (deleting an asset removes its stored file).
    const gone = await prisma.blog.deleteMany({ where: { title: { startsWith: tag } } });
    const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    const mine = await prisma.asset.findMany({ where: { name: { startsWith: tag } }, select: { id: true } });
    for (const asset of mine) await send(admin, "DELETE", `${library}/${asset.id}`);
    const left = await prisma.asset.count({ where: { name: { startsWith: tag } } });
    console.log(`Cleaned up: ${gone.count} article(s) and ${mine.length} asset(s) removed, ${left} asset(s) left.`);
    await prisma.$disconnect();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
