import fs from "node:fs";

// Usage: start the app (npm run start), then `node scripts/smoke-b1.mjs`. Needs the seeded accounts from `npm run db:seed`.
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
  return { jar, text: await r.text() };
}

const req = (jar, path, init = {}) =>
  fetch(base + path, { redirect: "manual", ...init, headers: { cookie: jar ? jar.header() : "", ...(init.headers ?? {}) } });

let failures = 0;
function check(name, ok, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}
const loc = (r) => r.headers.get("location") ?? "";

// Anonymous
let r = await req(null, "/api/admin/resources/users/team");
check("anonymous API call is 401", r.status === 401, r.status);
r = await req(null, "/admin");
check("anonymous /admin redirects to login with next", r.status >= 300 && r.status < 400 && loc(r).includes("/login?next=%2Fadmin"), `${r.status} ${loc(r)}`);
r = await req(null, "/student/calendar");
check("anonymous /student redirects to login", loc(r).includes("/login"), `${r.status} ${loc(r)}`);
r = await req(null, "/api/health");
check("health is public", r.status === 200);

// Bad credentials
const bad = await login(env.SEED_ADMIN_EMAIL, "definitely-wrong-1");
check("wrong password sets no session", ![...bad.jar.cookies.keys()].some((k) => k.includes("session-token")), [...bad.jar.cookies.keys()].join(","));

// Super Admin
const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
check("admin signs in (session cookie)", [...admin.jar.cookies.keys()].some((k) => k.includes("session-token")));
r = await req(admin.jar, "/api/admin/resources/users/team?pageSize=5");
let body = await r.json();
check("admin lists team", r.status === 200 && Array.isArray(body.data) && body.meta.total >= 10 && body.data.length === 5, `${r.status} ${JSON.stringify(body).slice(0, 120)}`);
check("team tab counts present", body.meta?.tabCounts?.Active >= 1);
r = await req(admin.jar, "/api/admin/resources/users/team?tab=Archived&sort=password");
check("unknown sort column is rejected", r.status === 400, r.status);
r = await req(admin.jar, "/admin");
check("admin opens /admin", r.status === 200, `${r.status} ${loc(r)}`);
r = await req(admin.jar, "/admin/users/team");
check("admin opens team page", r.status === 200, `${r.status} ${loc(r)}`);
r = await req(admin.jar, "/student");
check("staff is redirected away from /student", r.status >= 300 && loc(r).includes("/admin"), `${r.status} ${loc(r)}`);

// CSRF / origin
r = await req(admin.jar, "/api/admin/resources/users/team", {
  method: "POST",
  headers: { "content-type": "application/json", origin: "http://evil.test" },
  body: JSON.stringify({}),
});
check("cross-site mutation is blocked", r.status === 403, r.status);

// Create / duplicate / archive
const email = `smoke.${Date.now()}@example.com`;
const payload = { name: "Smoke Tester", email, phone: "+91 90000 00001", role: "Instructor", branch: "Pune Centre" };
r = await req(admin.jar, "/api/admin/resources/users/team", { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify(payload) });
body = await r.json();
check("admin creates staff", r.status === 201 && body.data?.role === "Instructor", `${r.status} ${JSON.stringify(body)}`);
const createdId = body.data?.id;
r = await req(admin.jar, "/api/admin/resources/users/team", { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify(payload) });
check("duplicate email is 409", r.status === 409, r.status);
r = await req(admin.jar, "/api/admin/resources/users/team", { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ ...payload, email: "not-an-email" }) });
body = await r.json();
check("invalid email returns field errors", r.status === 400 && body.error?.fields?.email, `${r.status} ${JSON.stringify(body)}`);
r = await req(admin.jar, `/api/admin/resources/users/team/${createdId}/archive`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: "{}" });
body = await r.json();
check("admin archives staff", r.status === 200 && body.data?.state === "Archived", `${r.status} ${JSON.stringify(body)}`);
r = await req(admin.jar, "/api/admin/resources/users/team/export");
const csv = await r.text();
check("CSV export works with BOM and header", r.status === 200 && (r.headers.get("content-type") ?? "").includes("text/csv") && csv.includes("Contact details"), `${r.status} ${csv.slice(0, 60)}`);
r = await req(admin.jar, "/api/admin/branches");
body = await r.json();
check("branches list", r.status === 200 && body.data.length >= 3, r.status);
r = await req(admin.jar, "/api/admin/me");
body = await r.json();
check("my profile loads", r.status === 200 && body.data?.email === env.SEED_ADMIN_EMAIL.toLowerCase(), `${r.status}`);
r = await req(admin.jar, "/api/admin/me", { method: "PATCH", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ ...body.data, username: "x!" }) });
const patchBody = await r.json();
check("profile rejects a bad username with a field error", r.status === 400 && patchBody.error?.fields?.username, `${r.status} ${JSON.stringify(patchBody)}`);

// Instructor (role gate)
const instructor = await login("demo.staff2@ibmv.local", env.SEED_DEMO_PASSWORD);
r = await req(instructor.jar, "/api/admin/resources/users/team");
check("instructor cannot read team (403)", r.status === 403, r.status);
r = await req(instructor.jar, "/api/admin/branches");
check("instructor cannot read branches (403)", r.status === 403, r.status);
r = await req(instructor.jar, "/api/admin/resources/users/team/export");
check("instructor cannot export (403)", r.status === 403, r.status);
r = await req(instructor.jar, "/admin/users/team");
check("instructor is sent to access-denied for the Team page", r.status >= 300 && loc(r).includes("/access-denied"), `${r.status} ${loc(r)}`);
r = await req(instructor.jar, "/admin/learning/sessions");
check("instructor opens a permitted page", r.status === 200, `${r.status} ${loc(r)}`);

// Learner
const learner = await login("learner@ibmv.local", env.SEED_DEMO_PASSWORD);
r = await req(learner.jar, "/api/admin/resources/users/team");
check("learner gets 403 from staff API", r.status === 403, r.status);
r = await req(learner.jar, "/admin");
check("learner is redirected away from /admin", r.status >= 300 && loc(r).includes("/student"), `${r.status} ${loc(r)}`);
r = await req(learner.jar, "/student");
check("learner opens /student", r.status === 200, `${r.status} ${loc(r)}`);
r = await req(learner.jar, "/api/admin/me");
check("learner cannot read staff profile API", r.status === 403, r.status);

// Public auth endpoints
r = await req(null, "/api/public/auth/register", { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ name: "A", email: "bad", password: "short" }) });
body = await r.json();
check("register validates input", r.status === 400 && body.error?.fields?.email && body.error?.fields?.password, `${r.status} ${JSON.stringify(body)}`);
const regEmail = `smoke.learner.${Date.now()}@example.com`;
r = await req(null, "/api/public/auth/register", { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ name: "Smoke Learner", email: regEmail, password: "Sup3rSecret!!" }) });
check("register accepts a valid request (202)", r.status === 202, r.status);
const unverified = await login(regEmail, "Sup3rSecret!!");
check("unverified learner cannot sign in", ![...unverified.jar.cookies.keys()].some((k) => k.includes("session-token")));
r = await req(null, "/api/public/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ email: "nobody@example.com" }) });
check("forgot-password is generic for unknown email", r.status === 200, r.status);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
console.log(`cleanup emails: ${email}, ${regEmail}`);
process.exitCode = failures === 0 ? 0 : 1;
