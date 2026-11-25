import fs from "node:fs";

// Usage: start the app (npm run start), then `npx tsx scripts/smoke-b4b.mjs` (tsx is needed for the clean-up client).
// Needs `npm run db:seed` (demo accounts and Demo Batch 1). Creates a temporary module, course, batch and enrolment,
// and removes them before finishing.
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
const send = (jar, method, path, body, headers = json) => req(jar, path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
const page = async (jar, path) => {
    const r = await req(jar, path);
    return { status: r.status, location: r.headers.get("location") ?? "", html: (await r.text()).replace(/<!--.*?-->/g, "") };
};

let failures = 0;
function check(name, ok, detail = "") {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}
const brief = (value) => JSON.stringify(value).slice(0, 260);

const stamp = Date.now();
const tag = "Smoke B4b";
const moduleName = `${tag} Intro ${stamp}`;
const hiddenName = `${tag} Draft ${stamp}`;
const courseTitle = `${tag} Course ${stamp}`;
const batchName = `${tag} Batch ${stamp}`;
const demoPassword = env.SEED_DEMO_PASSWORD;
const yt = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const addDays = (date, n) => new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

const lessons = [
    { title: "Welcome", type: "Text", minutes: "5", content: "# Hello\n\nA **bold** start.", url: "" },
    { title: "Watch", type: "Video", minutes: "", content: "", url: yt },
    { title: "Read on", type: "Link", minutes: "10", content: "", url: "https://example.org/read" },
];

try {
    // ---- Anonymous ----
    let r = await req(null, "/api/student/courses/anything");
    check("anonymous course outline is 401", r.status === 401, r.status);
    r = await req(null, "/api/student/lessons/anything");
    check("anonymous lesson is 401", r.status === 401, r.status);
    r = await send(null, "POST", "/api/student/lessons/anything/complete", {});
    check("anonymous completion is 401", r.status === 401, r.status);

    // ---- Admin: module library ----
    const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    let result = await page(admin, "/admin/learning/module-library");
    check("admin opens the Module Library", result.status === 200 && result.html.includes("Add Module"), result.status);
    const modulePath = "/api/admin/resources/learning/module-library";
    r = await send(admin, "POST", modulePath, { name: moduleName, description: "", status: "Published", lessons: JSON.stringify([{ title: "No text", type: "Text", minutes: "", content: "", url: "" }]) });
    let body = await r.json();
    check("a text lesson without text is a field error", r.status === 400 && body.error?.fields?.lessons, `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", modulePath, { name: moduleName, description: "", status: "Published", lessons: JSON.stringify([{ title: "Clip", type: "Video", minutes: "", content: "", url: "https://vimeo.com/1" }]) });
    check("a video that is not on YouTube is refused", r.status === 400, r.status);
    r = await send(admin, "POST", modulePath, { name: moduleName, description: "Smoke module", status: "Published", lessons: JSON.stringify(lessons) });
    body = await r.json();
    const mod = body.data;
    check("admin creates a module with three lessons", r.status === 201 && mod?.content === "3 lessons · 1 video · 1 link" && JSON.parse(mod.lessons).length === 3, `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", modulePath, { name: moduleName, description: "", status: "Published", lessons: "[]" });
    check("a duplicate module name is 409", r.status === 409, r.status);
    r = await send(admin, "POST", modulePath, { name: hiddenName, description: "", status: "Draft", lessons: JSON.stringify([{ title: "Secret", type: "Text", minutes: "", content: "Not yet.", url: "" }]) });
    const hidden = (await r.json()).data;
    check("admin creates a draft module", r.status === 201 && hidden?.status === "Draft", r.status);
    r = await req(admin, `${modulePath}?q=${encodeURIComponent(tag)}&pageSize=10`);
    body = await r.json();
    check("the library lists both, without lesson bodies", r.status === 200 && body.meta.total === 2 && body.data.every((row) => row.lessons === undefined), `${r.status} ${brief(body.meta)}`);
    r = await req(admin, `${modulePath}/${mod.id}`);
    body = await r.json();
    const saved = JSON.parse(body.data?.lessons ?? "[]");
    check("opening a module returns its lessons with ids", r.status === 200 && saved.length === 3 && saved.every((l) => l.id), `${r.status} ${brief(body)}`);

    const teacher = await login("demo.staff2@ibmv.local", demoPassword);
    r = await req(teacher, `${modulePath}?pageSize=5`);
    check("an instructor can read the library", r.status === 200, r.status);
    r = await send(teacher, "POST", modulePath, { name: `${tag} By teacher ${stamp}`, description: "", status: "Draft", lessons: "[]" });
    check("an instructor cannot create modules", r.status === 403, r.status);

    // ---- Admin: a course with the modules, a batch, and an enrolment ----
    r = await req(admin, "/api/admin/resources/products/courses?pageSize=1");
    body = await r.json();
    const category = body.data?.[0]?.category;
    const courseBody = { title: courseTitle, category, summary: "A temporary course for the smoke test.", officialUrl: "https://example.org/smoke", status: "Published" };
    r = await send(admin, "POST", "/api/admin/resources/products/courses", { ...courseBody, modules: JSON.stringify([{ module: "No such module" }]) });
    check("a course with an unknown module is refused", r.status === 400, r.status);
    r = await send(admin, "POST", "/api/admin/resources/products/courses", { ...courseBody, modules: JSON.stringify([{ module: hiddenName }, { module: moduleName }]) });
    body = await r.json();
    const course = body.data;
    check("admin creates a course with modules in order", r.status === 201 && course?.modules === JSON.stringify([{ module: hiddenName }, { module: moduleName }]), `${r.status} ${brief(body)}`);

    r = await req(admin, "/api/admin/resources/learning/batches?q=Demo%20Batch%201");
    const demo = (await r.json()).data?.find((row) => row.name === "Demo Batch 1");
    if (!demo) throw new Error("Run `npm run db:seed` first (Demo Batch 1 is missing).");
    r = await send(admin, "POST", "/api/admin/resources/learning/batches", { name: batchName, course: courseTitle, startDate: addDays(today, -1), endDate: addDays(today, 60), instructor: demo.manager, manager: demo.manager, additionalManagers: [], branch: "", status: "Active" });
    const batch = (await r.json()).data;
    check("admin creates a batch for it", r.status === 201 && Boolean(batch?.id), r.status);
    r = await send(admin, "POST", "/api/admin/enrolments", { email: "learner@ibmv.local", batchId: batch.id });
    check("admin enrols the demo learner", r.status === 201, r.status);
    r = await send(admin, "DELETE", `${modulePath}/${mod.id}`);
    body = await r.json();
    check("a module used by a course cannot be deleted", r.status === 409, `${r.status} ${brief(body)}`);

    // ---- Learner ----
    const learner = await login("learner@ibmv.local", demoPassword);
    const slug = course.slug;
    r = await req(learner, `/api/student/courses/${slug}`);
    body = await r.json();
    const outline = body.data;
    check("the learner's outline shows the published module only", r.status === 200 && outline?.modules?.length === 1 && outline.modules[0].name === moduleName && outline.totalLessons === 3, `${r.status} ${brief(outline)}`);
    check("nothing is complete yet and resume starts at the first lesson", outline?.completedLessons === 0 && outline.progressPercent === 0 && outline.resumeLessonId === outline.modules[0].lessons[0].id, brief(outline));
    const [text, video, link] = outline.modules[0].lessons;
    r = await req(learner, `/api/student/lessons/${text.id}`);
    body = await r.json();
    check("a text lesson returns its Markdown", r.status === 200 && body.data?.body.includes("**bold**") && body.data.completed === false, `${r.status} ${brief(body)}`);
    r = await req(learner, `/api/student/lessons/${video.id}`);
    body = await r.json();
    check("a video lesson returns the no-cookie embed address", r.status === 200 && body.data?.url === "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", `${r.status} ${brief(body)}`);
    r = await req(learner, `/api/student/lessons/${link.id}`);
    body = await r.json();
    check("a link lesson returns its https address", r.status === 200 && body.data?.url === "https://example.org/read", `${r.status} ${brief(body)}`);
    const secret = await prisma.moduleContent.findFirst({ where: { title: "Secret", module: { name: hiddenName } } });
    r = await req(learner, `/api/student/lessons/${secret.id}`);
    check("a lesson of a draft module is 404", r.status === 404, r.status);
    r = await req(learner, `/api/student/lessons/${text.id}`);
    check("opening lessons completed nothing", (await (await req(learner, `/api/student/courses/${slug}`)).json()).data.completedLessons === 0);

    const outsider = await login("demo.learner4@ibmv.local", demoPassword);
    r = await req(outsider, `/api/student/courses/${slug}`);
    check("a learner who is not enrolled gets 404 for the course", r.status === 404, r.status);
    r = await req(outsider, `/api/student/lessons/${text.id}`);
    check("and for its lessons", r.status === 404, r.status);
    r = await send(outsider, "POST", `/api/student/lessons/${text.id}/complete`, {});
    check("and cannot complete them", r.status === 404, r.status);
    r = await send(learner, "POST", `/api/student/lessons/${text.id}/complete`, {}, { "content-type": "application/json", origin: "http://evil.test" });
    check("a cross-site completion is blocked", r.status === 403, r.status);

    r = await send(learner, "POST", `/api/student/lessons/${text.id}/complete`, {});
    body = await r.json();
    check("the learner completes a lesson: one of three", r.status === 200 && body.data?.completedLessons === 1 && body.data.progressPercent === 33 && body.data.status === "Active", `${r.status} ${brief(body)}`);
    r = await send(learner, "POST", `/api/student/lessons/${text.id}/complete`, {});
    body = await r.json();
    check("completing it again changes nothing", r.status === 200 && body.data?.completedLessons === 1, `${r.status} ${brief(body)}`);
    result = await page(learner, "/student/my-learning");
    check("My Learning offers to continue the course", result.status === 200 && result.html.includes(courseTitle) && result.html.includes("Continue course") && result.html.includes("1 of 3 lessons"), result.status);
    result = await page(learner, `/student/learning/${slug}`);
    check("the course page shows the contents and resumes at the next lesson", result.status === 200 && result.html.includes("Course contents") && result.html.includes(moduleName) && result.html.includes("1 of 3 lessons completed"), result.status);
    await send(learner, "POST", `/api/student/lessons/${video.id}/complete`, {});
    r = await send(learner, "POST", `/api/student/lessons/${link.id}/complete`, {});
    body = await r.json();
    check("finishing the last lesson completes the course", r.status === 200 && body.data?.progressPercent === 100 && body.data.status === "Completed", `${r.status} ${brief(body)}`);
    result = await page(learner, "/student/my-learning");
    check("My Learning counts the course as completed", result.html.includes("Completed Learning (1)"), "no completed tab count");
    r = await req(admin, `/api/admin/resources/learning/batches?q=${encodeURIComponent(batchName)}`);
    body = await r.json();
    check("the admin's batch list shows the progress", r.status === 200 && body.data?.[0]?.progress === 100 && body.data[0].learners === 1, `${r.status} ${brief(body.data)}`);

    result = await page(outsider, `/student/learning/${slug}`);
    check("the course page of an unenrolled learner is 404", result.status === 404, result.status);
    result = await page(learner, "/student/learning/study-foundations");
    check("the sample course preview still opens", result.status === 200 && result.html.includes("Foundations of Thoughtful Study"), result.status);
    result = await page(null, `/student/learning/${slug}`);
    check("the anonymous course page redirects to sign-in", result.status >= 300 && result.location.includes("/login"), `${result.status} ${result.location}`);

    // ---- A module edit keeps the learner's progress ----
    r = await send(admin, "PATCH", `${modulePath}/${mod.id}`, { name: moduleName, description: "Smoke module", status: "Published", lessons: JSON.stringify([{ ...saved[2], title: "Read on (moved)" }, saved[0], saved[1], { title: "Extra", type: "Text", minutes: "", content: "One more.", url: "" }]) });
    body = await r.json();
    check("admin reorders lessons and adds one", r.status === 200 && JSON.parse(body.data?.lessons ?? "[]").length === 4, `${r.status} ${brief(body)}`);
    r = await req(learner, `/api/student/courses/${slug}`);
    body = await r.json();
    check("completed lessons stay completed; the new one is not", body.data?.completedLessons === 3 && body.data.totalLessons === 4 && body.data.progressPercent === 75 && body.data.status === "Completed", brief(body.data));
} catch (error) {
    failures += 1;
    console.error("FAIL  smoke script stopped early:", error);
} finally {
    // Remove everything this run created.
    const batch = await prisma.batch.findUnique({ where: { name: batchName } });
    if (batch) await prisma.enrolment.deleteMany({ where: { batchId: batch.id } });
    if (batch) await prisma.batch.delete({ where: { id: batch.id } });
    await prisma.enrolment.deleteMany({ where: { course: { title: courseTitle } } });
    await prisma.course.deleteMany({ where: { title: courseTitle } });
    const modules = await prisma.module.deleteMany({ where: { name: { startsWith: tag } } });
    console.log(`Cleaned up: batch ${batch ? "removed" : "not created"}, ${modules.count} module(s).`);
    await prisma.$disconnect();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
