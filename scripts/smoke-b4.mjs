import fs from "node:fs";

// Usage: start the app (npm run start), then `npx tsx scripts/smoke-b4.mjs` (tsx is needed for the clean-up client).
// Needs `npm run db:seed` (demo accounts and Demo Batch 1). Creates a temporary batch, sessions, notice and learner,
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
const brief = (value) => JSON.stringify(value).slice(0, 240);

// India has no daylight saving: IST is a fixed +05:30.
const IST = 330 * 60_000;
const istParts = (ms) => {
    const iso = new Date(ms + IST).toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};
const addDays = (date, n) => new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

const stamp = Date.now();
const tag = "[smoke-b4]";
const batchName = `Smoke B4 ${stamp}`;
const today = istParts(stamp).date;
const demoPassword = env.SEED_DEMO_PASSWORD;
const newEmail = `smoke.b4.new.${stamp}@example.com`;

try {
    // ---- Anonymous ----
    let r = await req(null, `/api/admin/sessions?from=${today}&to=${today}`);
    check("anonymous admin sessions is 401", r.status === 401, r.status);
    r = await req(null, `/api/student/calendar?from=${today}&to=${today}`);
    check("anonymous student calendar is 401", r.status === 401, r.status);
    r = await req(null, "/api/student/announcements");
    check("anonymous student announcements is 401", r.status === 401, r.status);
    r = await send(null, "POST", "/api/admin/enrolments", { email: "x@example.com", batchId: "x" });
    check("anonymous enrolment is 401", r.status === 401, r.status);

    // ---- Admin: pages ----
    const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    let result = await page(admin, "/admin/learning/sessions");
    check("admin opens the sessions calendar", result.status === 200 && result.html.includes("Mark as Holiday") && !result.html.includes("Demo screen with sample data"), result.status);
    for (const path of ["learning/batches", "learning/announcements", "users/new-enrolment", "users/learners"]) {
        result = await page(admin, `/admin/${path}`);
        check(`admin opens /admin/${path}`, result.status === 200, result.status);
    }

    // ---- Admin: a temporary batch built from the seeded demo batch ----
    r = await req(admin, `/api/admin/resources/learning/batches?q=${encodeURIComponent("Demo Batch 1")}`);
    let body = await r.json();
    const demo = body.data?.find((row) => row.name === "Demo Batch 1");
    check("the seeded Demo Batch 1 is listed with its learners", r.status === 200 && demo && demo.learners >= 1 && demo.status === "Active", `${r.status} ${brief(body.data)}`);
    if (!demo) throw new Error("Run `npm run db:seed` first (Demo Batch 1 is missing).");

    r = await req(admin, "/api/admin/resources/products/courses?tab=Published&pageSize=10");
    body = await r.json();
    const otherCourse = body.data?.find((row) => row.title !== demo.course);
    check("a second published course is available", r.status === 200 && Boolean(otherCourse), `${r.status} ${brief(body.meta)}`);

    const batchBody = { name: batchName, course: otherCourse.title, startDate: addDays(today, -1), endDate: addDays(today, 120), instructor: demo.manager, manager: demo.manager, additionalManagers: [], branch: "", status: "Active" };
    r = await send(admin, "POST", "/api/admin/resources/learning/batches", { ...batchBody, endDate: addDays(today, -5) });
    body = await r.json();
    check("a batch that ends before it starts is 400", r.status === 400 && Object.keys(body.error?.fields ?? {}).length > 0, `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", "/api/admin/resources/learning/batches", batchBody);
    body = await r.json();
    const batch = body.data;
    check("admin creates a batch", r.status === 201 && batch?.name === batchName && batch.status === "Active", `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", "/api/admin/resources/learning/batches", batchBody);
    check("a duplicate batch name is 409", r.status === 409, r.status);
    r = await req(admin, `/api/admin/resources/learning/batches?q=${encodeURIComponent(batchName)}`);
    body = await r.json();
    check("the batch list finds it by name", r.status === 200 && body.meta.total === 1 && body.data[0].id === batch.id, `${r.status} ${brief(body.meta)}`);

    // ---- Admin: announcement for the batch ----
    const yesterday = addDays(today, -1);
    const noticeBody = { name: `${tag} Class timings (${stamp})`, audience: batchName, urgency: "High", date: `${yesterday}T09:00`, tags: ["Schedule"], message: "Classes start at the usual time.", status: "Published" };
    r = await send(admin, "POST", "/api/admin/resources/learning/announcements", { ...noticeBody, audience: "Nowhere" });
    check("an announcement for an unknown audience is 400", r.status === 400, r.status);
    r = await send(admin, "POST", "/api/admin/resources/learning/announcements", noticeBody);
    body = await r.json();
    const notice = body.data;
    check("admin publishes an announcement to the batch", r.status === 201 && notice?.audience === batchName && notice.urgency === "High", `${r.status} ${brief(body)}`);
    r = await req(admin, "/api/admin/resources/learning/announcements?filter.tags=Schedule&pageSize=50");
    body = await r.json();
    check("announcements filter by tag", r.status === 200 && body.data.some((row) => row.id === notice?.id), `${r.status} ${brief(body.meta)}`);

    // ---- Admin: enrolment ----
    r = await send(admin, "POST", "/api/admin/enrolments", { email: "learner@ibmv.local", batchId: batch.id });
    body = await r.json();
    check("admin enrols the demo learner", r.status === 201 && body.data?.status === "enrolled", `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", "/api/admin/enrolments", { email: "learner@ibmv.local", batchId: batch.id });
    body = await r.json();
    check("enrolling again is reported as already enrolled", r.status === 200 && body.data?.status === "skipped", `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", "/api/admin/enrolments", { email: "admin@ibmv.local", batchId: batch.id });
    check("a staff email cannot be enrolled", r.status === 422, r.status);
    r = await send(admin, "POST", "/api/admin/enrolments", { email: newEmail, batchId: batch.id });
    body = await r.json();
    check("an unknown email asks for a name", r.status === 400 && body.error?.fields?.name, `${r.status} ${brief(body)}`);

    const list = `learner@ibmv.local\n${newEmail}\nnot-an-email`;
    r = await send(admin, "POST", "/api/admin/enrolments/bulk", { mode: "emails", emails: list, batchId: batch.id, commit: false });
    body = await r.json();
    check("a dry run reports every row and saves nothing", r.status === 200 && body.data.summary.skipped === 1 && body.data.summary.ready === 1 && body.data.summary.errors === 1 && body.data.summary.newAccounts === 1, `${r.status} ${brief(body.data?.summary)}`);
    r = await req(admin, `/api/admin/resources/users/learners?q=${encodeURIComponent(newEmail)}`);
    body = await r.json();
    check("the dry run created no account", r.status === 200 && body.meta.total === 0, `${r.status} ${brief(body.meta)}`);
    r = await send(admin, "POST", "/api/admin/enrolments/bulk", { mode: "emails", emails: list, batchId: batch.id, commit: true });
    body = await r.json();
    check("the bulk enrolment commits the good rows", r.status === 200 && body.data.summary.enrolled === 1 && body.data.summary.errors === 1, `${r.status} ${brief(body.data?.summary)}`);
    r = await req(admin, `/api/admin/resources/users/learners?q=${encodeURIComponent(newEmail)}`);
    body = await r.json();
    check("the new learner exists and shows as Enrolled", r.status === 200 && body.meta.total === 1 && body.data[0].status === "Enrolled", `${r.status} ${brief(body.data)}`);
    const csv = `email,name,batch\n${newEmail},,${batchName}\nsomeone@example.com,Someone,No such batch`;
    r = await send(admin, "POST", "/api/admin/enrolments/bulk", { mode: "csv", csv, commit: false });
    body = await r.json();
    check("a CSV dry run reports each row", r.status === 200 && body.data.results[0].status === "skipped" && body.data.results[1].status === "error" && /Unknown or inactive batch/.test(body.data.results[1].message), `${r.status} ${brief(body.data?.results)}`);
    r = await send(admin, "POST", "/api/admin/enrolments/bulk", { mode: "csv", csv: "name,batch\nx,y", commit: false });
    check("a CSV without an email column is 400", r.status === 400, r.status);

    // ---- Admin: sessions ----
    const tomorrow = addDays(today, 1);
    const session = (over) => ({ batchId: batch.id, title: `${tag} Class`, date: tomorrow, time: "17:00", durationMin: 60, link: "https://meet.example.org/smoke", topics: "Smoke topics", repeatWeeks: 0, ...over });
    r = await send(admin, "POST", "/api/admin/sessions", session({ link: "http://insecure.example.org" }));
    body = await r.json();
    check("a non-https class link is a field error", r.status === 400 && body.error?.fields?.link, `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", "/api/admin/sessions", session({ time: "25:00" }));
    check("an invalid time is 400", r.status === 400, r.status);
    r = await send(admin, "POST", "/api/admin/sessions", session({ date: addDays(today, -30) }));
    check("a first session before the batch starts is 400", r.status === 400, r.status);
    r = await send(admin, "POST", "/api/admin/sessions", session({ title: `${tag} Class one` }));
    body = await r.json();
    const one = body.data?.created?.[0];
    check("admin schedules a session", r.status === 201 && one?.date === tomorrow && one.time === "17:00" && one.status === "Scheduled", `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", "/api/admin/sessions", session({ time: "17:30" }));
    check("an overlapping session of the same instructor is 409", r.status === 409, r.status);
    r = await send(admin, "POST", "/api/admin/sessions", session({ date: addDays(today, 2), time: "10:00", durationMin: 45, repeatWeeks: 2, title: `${tag} Weekly` }));
    body = await r.json();
    const series = body.data?.created ?? [];
    check("admin schedules a weekly series", r.status === 201 && series.length === 3 && series[1].date === addDays(today, 9), `${r.status} ${brief(body.data?.created?.map((s) => s.date))}`);

    const holidayDay = addDays(today, 100);
    r = await send(admin, "POST", "/api/admin/sessions/holidays", { date: holidayDay, reason: `${tag} Festival`, branch: "" });
    body = await r.json();
    const holiday = body.data?.holiday;
    check("admin marks a holiday", r.status === 201 && holiday?.date === holidayDay, `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", "/api/admin/sessions/holidays", { date: holidayDay, reason: `${tag} Again`, branch: "" });
    check("the same holiday twice is 409", r.status === 409, r.status);
    r = await send(admin, "POST", "/api/admin/sessions", session({ date: holidayDay, time: "11:00" }));
    check("a session on a holiday is refused", r.status === 422, r.status);
    r = await req(admin, `/api/admin/sessions?from=${holidayDay}&to=${holidayDay}`);
    body = await r.json();
    check("the calendar range includes the holiday", r.status === 200 && body.data.holidays.some((h) => h.id === holiday?.id), `${r.status} ${brief(body)}`);
    r = await req(admin, `/api/admin/sessions?from=${today}&to=${addDays(today, 200)}`);
    check("a range longer than 100 days is 400", r.status === 400, r.status);
    r = await req(admin, "/api/admin/sessions?from=2026-13-40&to=2026-13-41");
    check("an impossible date is 400", r.status === 400, r.status);
    r = await req(admin, "/api/admin/sessions");
    check("a missing range is 400", r.status === 400, r.status);
    r = await req(admin, `/api/admin/sessions/holidays/${holiday.id}`, { method: "DELETE", headers: json });
    check("admin removes the holiday", r.status === 204, r.status);

    r = await send(admin, "PATCH", `/api/admin/sessions/${series[0].id}`, { title: `${tag} Weekly (renamed)` });
    body = await r.json();
    check("admin edits a session", r.status === 200 && body.data?.title === `${tag} Weekly (renamed)`, `${r.status} ${brief(body)}`);
    r = await send(admin, "PATCH", `/api/admin/sessions/${series[0].id}`, { date: tomorrow, time: "17:30" });
    check("moving a session onto the instructor's other class is 409", r.status === 409, r.status);
    r = await send(admin, "POST", `/api/admin/sessions/${series[1].id}/cancel`, { reason: "x" });
    check("cancelling without a real reason is 400", r.status === 400, r.status);
    r = await send(admin, "POST", `/api/admin/sessions/${series[1].id}/cancel`, { reason: `${tag} Teacher unwell` });
    body = await r.json();
    check("admin cancels a session with a reason", r.status === 200 && body.data?.status === "Cancelled" && body.data.cancelReason.includes("Teacher unwell"), `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", `/api/admin/sessions/${series[1].id}/cancel`, { reason: "Again please" });
    check("cancelling twice is 422", r.status === 422, r.status);
    r = await send(admin, "PATCH", `/api/admin/sessions/${series[1].id}`, { title: "Cannot change" });
    check("a cancelled session cannot be edited", r.status === 422, r.status);

    // A session that has already started (00:00 today) takes attendance; one in the future does not.
    r = await send(admin, "POST", "/api/admin/sessions", session({ date: today, time: "00:00", durationMin: 15, title: `${tag} Earlier today`, link: "" }));
    body = await r.json();
    const started = body.data?.created?.[0];
    check("admin schedules a session that has already started", r.status === 201 && started?.date === today, `${r.status} ${brief(body)}`);
    r = await req(admin, `/api/admin/sessions/${started.id}`);
    body = await r.json();
    const learnerId = body.data?.roster?.find((entry) => entry.email === "learner@ibmv.local")?.userId;
    check("the class list shows enrolled learners, unmarked", r.status === 200 && body.data.canMarkAttendance === true && Boolean(learnerId) && body.data.roster.length === 2 && body.data.roster.every((entry) => entry.mark === "Not marked"), `${r.status} ${brief(body.data?.roster)}`);
    r = await send(admin, "PUT", `/api/admin/sessions/${started.id}/attendance`, { marks: [{ userId: learnerId, status: "LATE" }] });
    check("an unknown attendance value is 400", r.status === 400, r.status);
    r = await send(admin, "PUT", `/api/admin/sessions/${started.id}/attendance`, { marks: [{ userId: "someone-else", status: "PRESENT" }] });
    check("marking a learner who is not enrolled is 400", r.status === 400, r.status);
    r = await send(admin, "PUT", `/api/admin/sessions/${started.id}/attendance`, { marks: [{ userId: learnerId, status: "PRESENT" }] });
    body = await r.json();
    check("admin marks attendance", r.status === 200 && body.data.roster.find((entry) => entry.userId === learnerId)?.mark === "Present" && body.data.attended === 1, `${r.status} ${brief(body)}`);
    r = await send(admin, "PUT", `/api/admin/sessions/${one.id}/attendance`, { marks: [{ userId: learnerId, status: "PRESENT" }] });
    check("attendance for a session that has not started is 422", r.status === 422, r.status);

    // A class that starts in ten minutes can be joined; the others cannot yet.
    const soon = istParts(Date.now() + 10 * 60_000);
    r = await send(admin, "POST", "/api/admin/sessions", session({ date: soon.date, time: soon.time, durationMin: 30, title: `${tag} Starting soon`, link: "https://meet.example.org/smoke-soon" }));
    body = await r.json();
    check("admin schedules a class starting in ten minutes", r.status === 201, `${r.status} ${brief(body)}`);

    // ---- Learner ----
    const learner = await login("learner@ibmv.local", demoPassword);
    const to = addDays(today, 10);
    r = await req(learner, `/api/student/calendar?from=${today}&to=${to}`);
    body = await r.json();
    const mine = body.data?.sessions ?? [];
    const byTitle = (title) => mine.find((s) => s.title === title);
    check("the learner's calendar holds the new sessions", r.status === 200 && Boolean(byTitle(`${tag} Class one`)) && Boolean(byTitle(`${tag} Weekly (renamed)`)) && Boolean(byTitle(`${tag} Starting soon`)), `${r.status} ${brief(mine.map((s) => s.title))}`);
    check("a class that is hours away has no join link yet", byTitle(`${tag} Class one`)?.joinUrl === null, brief(byTitle(`${tag} Class one`)));
    check("a class about to start shows its join link", byTitle(`${tag} Starting soon`)?.joinUrl === "https://meet.example.org/smoke-soon", brief(byTitle(`${tag} Starting soon`)));
    check("a cancelled class is shown as cancelled, with the reason and no link", mine.some((s) => s.status === "Cancelled" && s.cancelReason.includes("Teacher unwell") && s.joinUrl === null), brief(mine.filter((s) => s.status === "Cancelled")));
    r = await req(learner, `/api/student/calendar?from=${today}&to=${addDays(today, 150)}`);
    check("a student calendar range over 100 days is 400", r.status === 400, r.status);
    r = await req(learner, `/api/student/calendar?from=${to}&to=${today}`);
    check("a backwards range is 400", r.status === 400, r.status);

    r = await req(learner, "/api/student/announcements");
    body = await r.json();
    const mineNotice = body.data?.find((n) => n.id === notice?.id);
    check("the learner sees the batch announcement, unread", r.status === 200 && mineNotice?.read === false && mineNotice.urgency === "High" && mineNotice.tags.includes("Schedule"), `${r.status} ${brief(mineNotice)}`);
    r = await send(learner, "POST", `/api/student/announcements/${notice.id}/read`, {});
    check("the learner marks it read", r.status === 204, r.status);
    r = await send(learner, "POST", `/api/student/announcements/${notice.id}/read`, {});
    check("marking it read again is harmless", r.status === 204, r.status);
    r = await req(learner, "/api/student/announcements");
    body = await r.json();
    check("the notice now shows as read", body.data?.find((n) => n.id === notice.id)?.read === true, brief(body.data?.find((n) => n.id === notice.id)));
    r = await send(learner, "POST", `/api/student/announcements/${notice.id}/read`, {}, { "content-type": "application/json", origin: "http://evil.test" });
    check("a cross-site read mark is blocked", r.status === 403, r.status);

    const outsider = await login("demo.learner4@ibmv.local", demoPassword);
    r = await req(outsider, "/api/student/announcements");
    body = await r.json();
    check("a learner outside the batch does not see its announcement", r.status === 200 && !body.data.some((n) => n.id === notice.id), `${r.status}`);
    r = await send(outsider, "POST", `/api/student/announcements/${notice.id}/read`, {});
    check("and cannot mark it read", r.status === 404, r.status);
    r = await req(outsider, `/api/student/calendar?from=${today}&to=${to}`);
    body = await r.json();
    check("nor see the batch's sessions", r.status === 200 && !body.data.sessions.some((s) => s.title.startsWith(tag)), `${r.status}`);
    r = await req(learner, `/api/admin/sessions?from=${today}&to=${today}`);
    check("a learner cannot call the admin sessions API", r.status === 401 || r.status === 403, r.status);

    result = await page(learner, "/student");
    check("the learner home lists today's classes", result.status === 200 && (result.html.includes("Today&#x27;s Classes") || result.html.includes("Today's Classes")), result.status);
    check("the home page shows the class that started today", result.html.includes(`${tag} Earlier today`) && result.html.includes(`${tag} Starting soon`), "titles missing");
    check("the home page no longer carries sample wording", !result.html.includes("Sample schedule begins") && !result.html.includes("Fictional timetable"), "sample text present");
    result = await page(learner, "/student/my-learning");
    check("My Learning lists the real enrolment", result.status === 200 && result.html.includes(batchName) && result.html.includes("Preview the reading experience"), result.status);
    result = await page(learner, "/student/announcements");
    check("the announcements page shows the notice", result.status === 200 && result.html.includes(`${tag} Class timings`), result.status);
    result = await page(learner, "/student/calendar");
    check("the calendar page renders", result.status === 200 && result.html.includes("Join links appear 15 minutes before a class starts."), result.status);
    result = await page(null, "/student/calendar");
    check("the anonymous calendar page redirects to sign-in", result.status >= 300 && result.location.includes("/login"), `${result.status} ${result.location}`);

    // ---- Instructor: may run sessions, not enrolments or batches ----
    const teacher = await login("demo.staff2@ibmv.local", demoPassword);
    r = await req(teacher, `/api/admin/sessions?from=${today}&to=${to}`);
    check("an instructor reads the calendar", r.status === 200, r.status);
    r = await send(teacher, "POST", "/api/admin/enrolments", { email: "learner@ibmv.local", batchId: batch.id });
    check("an instructor cannot enrol learners", r.status === 403, r.status);
    r = await send(teacher, "POST", "/api/admin/resources/learning/batches", { ...batchBody, name: `${batchName} by teacher` });
    check("an instructor cannot create batches", r.status === 403, r.status);
    r = await send(teacher, "POST", "/api/admin/sessions", session({ date: addDays(today, 3), time: "08:00", title: `${tag} By teacher`, repeatWeeks: 0 }));
    check("an instructor can schedule a session", r.status === 201, r.status);
    r = await send(admin, "POST", "/api/admin/sessions", session({ date: addDays(today, 3), time: "08:30", title: `${tag} Overlap with teacher's` }));
    check("the clash check also covers sessions created by someone else", r.status === 409, r.status);
    result = await page(teacher, "/admin/users/new-enrolment");
    check("an instructor is turned away from New Enrolment", result.status >= 300 && result.location.includes("access-denied"), `${result.status} ${result.location}`);
    r = await send(admin, "PATCH", `/api/admin/resources/learning/batches/${batch.id}`, { ...batchBody, status: "Completed" });
    body = await r.json();
    check("admin completes the batch", r.status === 200 && body.data?.status === "Completed", `${r.status} ${brief(body)}`);
    r = await send(admin, "POST", "/api/admin/enrolments", { email: "demo.learner5@ibmv.local", batchId: batch.id });
    check("a completed batch takes no enrolments", r.status === 422, r.status);
    r = await send(admin, "POST", "/api/admin/sessions", session({ date: addDays(today, 5), time: "12:00", title: `${tag} After completion` }));
    check("a completed batch takes no sessions", r.status === 422, r.status);
} catch (error) {
    failures += 1;
    console.error("FAIL  smoke script stopped early:", error);
} finally {
    // Remove everything this run created.
    const batch = await prisma.batch.findUnique({ where: { name: batchName } });
    if (batch) {
        await prisma.enrolment.deleteMany({ where: { batchId: batch.id } });
        await prisma.batch.delete({ where: { id: batch.id } });
    }
    await prisma.announcement.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.holiday.deleteMany({ where: { reason: { startsWith: tag } } });
    const accounts = await prisma.user.deleteMany({ where: { email: { startsWith: "smoke." } } });
    console.log(`Cleaned up: batch ${batch ? "removed" : "not created"}, ${accounts.count} smoke account(s).`);
    await prisma.$disconnect();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
