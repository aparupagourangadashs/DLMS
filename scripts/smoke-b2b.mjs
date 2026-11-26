import fs from "node:fs";

// Usage: start the app (npm run start), then `npx tsx scripts/smoke-b2b.mjs`.
// Needs `npm run db:seed` (demo accounts). Uploads a few small files, builds a temporary module and course, and removes everything before finishing.
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

let failures = 0;
function check(name, ok, detail = "") {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}
const brief = (value) => JSON.stringify(value).slice(0, 240);

const stamp = Date.now();
const tag = `Smoke B2b ${stamp}`;
const demoPassword = env.SEED_DEMO_PASSWORD;
const png = Buffer.concat([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"), Buffer.alloc(200, 7)]);
const pdf = Buffer.from(`%PDF-1.4\n${"smoke ".repeat(40)}\n%%EOF`);
const library = "/api/admin/resources/learning/asset-library";

try {
    // ---- Anonymous ----
    let r = await upload(null, "x.png", png, "Image");
    check("anonymous upload is 401", r.status === 401, r.status);
    r = await req(null, "/api/assets/anything/file");
    check("an unknown asset is 404", r.status === 404, r.status);

    // ---- Admin: uploads ----
    const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    r = await upload(admin, "notes.pdf", png, "Image");
    check("a file of the wrong extension is refused", r.status === 400, r.status);
    r = await upload(admin, "fake.png", Buffer.from("MZ not an image at all"), "Image");
    let body = await r.json();
    check("a file that is not what its name says is refused", r.status === 400 && body.error?.code === "INVALID_FILE", `${r.status} ${brief(body)}`);
    r = await upload(admin, "huge.pdf", Buffer.concat([pdf, Buffer.alloc(26 * 1024 * 1024)]), "PDF");
    check("a file over the limit is 413", r.status === 413, r.status);
    r = await upload(admin, "cover.png", png, "Image");
    body = await r.json();
    const cover = body.data;
    check("an image uploads", r.status === 201 && cover?.id && cover.size === png.length, `${r.status} ${brief(body)}`);

    const form = (type, name, uploaded, over = {}) => ({ type, name, description: "", localFile: uploaded ? JSON.stringify(uploaded) : "", link: "", ...over });
    r = await send(admin, "POST", library, form("Image", `${tag} Cover`, cover));
    body = await r.json();
    const coverAsset = body.data;
    check("the image is saved as an asset", r.status === 201 && coverAsset?.type === "Image" && coverAsset.usage === "Unused", `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", library, form("Image", `${tag} Again`, cover));
    check("an upload can be saved only once", r.status === 400, r.status);

    r = await upload(admin, "notes.pdf", pdf, "PDF");
    const notes = (await r.json()).data;
    r = await send(admin, "POST", library, form("PDF", `${tag} Notes`, notes));
    const pdfAsset = (await r.json()).data;
    check("a PDF is saved as an asset", r.status === 201 && pdfAsset?.type === "PDF", r.status);
    r = await send(admin, "POST", library, form("YouTube", `${tag} Talk`, null, { link: "https://youtu.be/dQw4w9WgXcQ" }));
    body = await r.json();
    check("a YouTube asset is saved with a standard address", r.status === 201 && body.data?.link === "https://www.youtube.com/watch?v=dQw4w9WgXcQ", `${r.status} ${brief(body)}`);

    r = await req(admin, `${library}?q=${encodeURIComponent(tag)}&pageSize=10`);
    body = await r.json();
    check("the library lists them with summary cards", r.status === 200 && body.meta.total === 3 && body.meta.summary?.length === 5, `${r.status} ${brief(body.meta)}`);

    // ---- Serving ----
    r = await req(null, `/api/assets/${coverAsset.id}/file`);
    const bytes = Buffer.from(await r.arrayBuffer());
    check("an image is public", r.status === 200 && r.headers.get("content-type") === "image/png" && bytes.equals(png), `${r.status} ${r.headers.get("content-type")}`);
    check("a public image can be cached", r.headers.get("cache-control")?.startsWith("public") && Boolean(r.headers.get("etag")) && r.headers.get("x-content-type-options") === "nosniff", brief([...r.headers]));
    r = await req(null, `/api/assets/${coverAsset.id}/file`, { headers: { "if-none-match": r.headers.get("etag") } });
    check("an unchanged image is 304", r.status === 304, r.status);
    r = await req(null, `/api/assets/${pdfAsset.id}/file`);
    check("a PDF is not public", r.status === 404, r.status);
    r = await req(admin, `/api/assets/${pdfAsset.id}/file`);
    check("staff open the PDF in the browser", r.status === 200 && r.headers.get("content-type") === "application/pdf" && r.headers.get("content-disposition")?.startsWith("inline") && r.headers.get("cache-control") === "private, no-store", `${r.status} ${r.headers.get("content-disposition")}`);
    r = await req(admin, `/api/assets/${pdfAsset.id}/file`, { headers: { range: "bytes=0-4" } });
    check("a range request returns just that part", r.status === 206 && (await r.text()) === "%PDF-" && r.headers.get("content-range")?.startsWith("bytes 0-4/"), `${r.status} ${r.headers.get("content-range")}`);
    r = await req(admin, `/api/assets/${pdfAsset.id}/file?download=1`);
    check("a download is an attachment", r.headers.get("content-disposition")?.startsWith("attachment"), r.headers.get("content-disposition"));
    const teacher = await login("demo.staff2@ibmv.local", demoPassword);
    r = await req(teacher, `/api/assets/${pdfAsset.id}/file`);
    check("an instructor can read the library's files", r.status === 200, r.status);
    r = await send(teacher, "DELETE", `${library}/${pdfAsset.id}`);
    check("an instructor cannot delete assets", r.status === 403, r.status);
    r = await upload(teacher, "t.pdf", pdf, "PDF");
    check("an instructor cannot upload", r.status === 403, r.status);
    const learner = await login("learner@ibmv.local", demoPassword);
    r = await req(learner, `/api/assets/${pdfAsset.id}/file`);
    check("a learner cannot fetch a library file directly", r.status === 404, r.status);
    r = await upload(learner, "t.pdf", pdf, "PDF");
    check("a learner cannot upload", r.status === 403, r.status);
    r = await req(admin, `${library}/${pdfAsset.id}`);
    body = await r.json();
    check("downloads are counted", body.data?.downloads >= 1, brief(body.data));

    // ---- A file lesson for an enrolled learner ----
    r = await req(admin, "/api/admin/resources/products/courses?pageSize=1");
    const category = (await r.json()).data?.[0]?.category;
    const moduleName = `${tag} Module`;
    const lessons = [{ title: "Read the notes", type: "File", minutes: "5", content: "", url: "", asset: `${tag} Notes (PDF)` }];
    r = await send(admin, "POST", "/api/admin/resources/learning/module-library", { name: moduleName, description: "", status: "Published", lessons: JSON.stringify(lessons) });
    body = await r.json();
    check("a module takes a file lesson", r.status === 201 && body.data?.content === "1 lesson · 1 file", `${r.status} ${brief(body)}`);
    const courseTitle = `${tag} Course`;
    r = await send(admin, "POST", "/api/admin/resources/products/courses", { title: courseTitle, category, summary: "A temporary course.", officialUrl: "https://example.org/smoke", status: "Published", modules: JSON.stringify([{ module: moduleName }]) });
    const course = (await r.json()).data;
    check("a course includes the module", r.status === 201 && Boolean(course?.slug), r.status);
    r = await send(admin, "DELETE", `${library}/${pdfAsset.id}`);
    check("a file used by a lesson cannot be deleted", r.status === 409, r.status);

    const learnerUser = await prisma.user.findUnique({ where: { email: "learner@ibmv.local" } });
    const courseRow = await prisma.course.findUnique({ where: { slug: course.slug } });
    await prisma.enrolment.create({ data: { userId: learnerUser.id, courseId: courseRow.id, source: "ADMIN" } });
    r = await req(learner, `/api/student/courses/${course.slug}`);
    const lessonId = (await r.json()).data?.modules?.[0]?.lessons?.[0]?.id;
    check("the learner sees the file lesson", r.status === 200 && Boolean(lessonId), r.status);
    r = await req(learner, `/api/student/lessons/${lessonId}`);
    body = await r.json();
    check("it describes the file", r.status === 200 && body.data?.type === "File" && body.data.file?.kind === "pdf" && body.data.file.url === `/api/student/lessons/${lessonId}/file`, `${r.status} ${brief(body)}`);
    r = await req(learner, `/api/student/lessons/${lessonId}/file`);
    check("the learner opens the PDF", r.status === 200 && r.headers.get("content-type") === "application/pdf" && Buffer.from(await r.arrayBuffer()).equals(pdf), `${r.status} ${r.headers.get("content-type")}`);
    r = await req(learner, `/api/student/lessons/${lessonId}/file`, { headers: { range: "bytes=1-3" } });
    check("and can seek in it", r.status === 206 && (await r.text()) === "PDF", r.status);
    r = await req(learner, `/api/student/lessons/${lessonId}/file?download=1`);
    check("or download it", r.headers.get("content-disposition")?.startsWith("attachment"), r.headers.get("content-disposition"));
    const outsider = await login("demo.learner4@ibmv.local", demoPassword);
    r = await req(outsider, `/api/student/lessons/${lessonId}/file`);
    check("a learner who is not enrolled gets 404", r.status === 404, r.status);
    r = await req(null, `/api/student/lessons/${lessonId}/file`);
    check("anonymous gets 401", r.status === 401, r.status);
    r = await req(admin, `/api/student/lessons/${lessonId}/file`);
    check("staff are not learners", r.status === 403, r.status);

    // ---- Learner pages still render ----
    r = await req(learner, `/student/learning/${course.slug}`);
    check("the course page renders", r.status === 200, r.status);
} catch (error) {
    failures += 1;
    console.error("FAIL  smoke script stopped early:", error);
} finally {
    // Remove everything this run created, files included (deleting an asset removes its stored file).
    await prisma.enrolment.deleteMany({ where: { course: { title: { startsWith: tag } } } });
    await prisma.course.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.module.deleteMany({ where: { name: { startsWith: tag } } });
    const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    const mine = await prisma.asset.findMany({ where: { name: { startsWith: tag } }, select: { id: true } });
    for (const asset of mine) await send(admin, "DELETE", `${library}/${asset.id}`);
    const left = await prisma.asset.count({ where: { name: { startsWith: tag } } });
    console.log(`Cleaned up: ${mine.length} asset(s) removed, ${left} left.`);
    await prisma.$disconnect();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
