import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, mock, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

type Db = typeof import("@/server/db");
type Accounts = typeof import("@/server/services/accounts");
type Team = typeof import("@/server/admin/resources/team");
type Errors = typeof import("@/server/http/errors");
type Password = typeof import("@/server/auth/password");
type SessionUser = import("@/server/auth/session").SessionUser;

describe("B1 identity, roles and audit (database)", { skip }, () => {
  let prisma: Db["prisma"];
  let accounts: Accounts;
  let team: Team;
  let errors: Errors;
  let password: Password;

  const PASSWORD = "Sup3rSecret!!";

  const actor = (user: { id: string; email: string; role: SessionUser["role"]; branchIds?: string[] }): SessionUser => ({
    id: user.id,
    email: user.email,
    name: user.email,
    role: user.role,
    kind: "STAFF",
    branchIds: user.branchIds ?? [],
  });
  const ctx = (user: SessionUser) => ({ user, ip: "127.0.0.1" });
  const listQuery = { q: "", filters: {}, page: 1, pageSize: 25, skip: 0, take: 25 };

  async function createStaff(email: string, role: SessionUser["role"], branchId?: string) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await password.hashPassword(PASSWORD),
        kind: "STAFF",
        role,
        emailVerifiedAt: new Date(),
        staffProfile: { create: { displayName: email.split("@")[0], branchId } },
      },
    });
    return actor({ id: user.id, email, role });
  }

  async function wipe() {
    await prisma.auditEvent.deleteMany();
    await prisma.loginAttempt.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.emailVerificationToken.deleteMany();
    await prisma.userBranch.deleteMany();
    await prisma.staffProfile.deleteMany();
    await prisma.learnerProfile.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.user.deleteMany();
  }

  function capturedToken(spy: ReturnType<typeof mock.method>) {
    const text = spy.mock.calls.map((call) => String(call.arguments[0])).join("\n");
    const found = [...text.matchAll(/token=([A-Za-z0-9_-]+)/g)].at(-1);
    assert.ok(found, "expected an email containing a token link");
    return found[1];
  }

  before(async () => {
    process.env.DATABASE_URL = testUrl;
    ({ prisma } = await import("@/server/db"));
    accounts = await import("@/server/services/accounts");
    team = await import("@/server/admin/resources/team");
    errors = await import("@/server/http/errors");
    password = await import("@/server/auth/password");
    await wipe();
  });

  after(async () => {
    await wipe();
    await prisma.$disconnect();
  });

  test("learner registers, must verify email, then can sign in", async () => {
    const spy = mock.method(console, "info", () => undefined);
    try {
      await accounts.registerLearner({ name: "Asha Rao", email: "Asha@Example.com", password: PASSWORD }, "10.0.0.1");
      await assert.rejects(accounts.authenticate("asha@example.com", PASSWORD), (e) => e instanceof accounts.AuthFailure && e.code === "not_verified");

      const token = capturedToken(spy);
      await accounts.verifyEmail(token);
      await assert.rejects(accounts.verifyEmail(token), errors.BusinessRule, "token is single use");

      const user = await accounts.authenticate("ASHA@example.com", PASSWORD, "10.0.0.1");
      assert.equal(user.kind, "LEARNER");
      assert.equal(user.role, "LEARNER");

      // Registering the same address again changes nothing and does not throw.
      await accounts.registerLearner({ name: "Someone Else", email: "asha@example.com", password: PASSWORD });
      assert.equal(await prisma.user.count({ where: { email: "asha@example.com" } }), 1);
    } finally {
      spy.mock.restore();
    }
  });

  test("wrong credentials fail generically and store only a hashed identifier", async () => {
    await assert.rejects(accounts.authenticate("nobody@example.com", "whatever-123"), (e) => e instanceof accounts.AuthFailure && e.code === "invalid");
    const attempts = await prisma.loginAttempt.findMany({ where: { success: false } });
    assert.ok(attempts.length > 0);
    assert.ok(attempts.every((a) => a.identifier.length === 64 && !a.identifier.includes("@")));
  });

  test("account locks after repeated failures and recovers when the lock expires", async () => {
    const staff = await createStaff("lock@ibmv.test", "SUPPORT");
    for (let i = 0; i < accounts.MAX_FAILED_LOGINS; i += 1) {
      await assert.rejects(accounts.authenticate(staff.email, "wrong-password-1"));
    }
    await assert.rejects(accounts.authenticate(staff.email, PASSWORD), (e) => e instanceof accounts.AuthFailure && e.code === "invalid", "correct password is refused while locked");

    await prisma.user.update({ where: { id: staff.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    const ok = await accounts.authenticate(staff.email, PASSWORD);
    assert.equal(ok.id, staff.id);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: staff.id } })).failedLogins, 0);
  });

  test("blocked and archived users cannot sign in", async () => {
    const staff = await createStaff("blocked@ibmv.test", "SUPPORT");
    await prisma.user.update({ where: { id: staff.id }, data: { status: "BLOCKED" } });
    await assert.rejects(accounts.authenticate(staff.email, PASSWORD), accounts.AuthFailure);
  });

  test("password reset is single use, revokes sessions and replaces the password", async () => {
    const staff = await createStaff("reset@ibmv.test", "FINANCE");
    const before = await prisma.user.findUniqueOrThrow({ where: { id: staff.id } });
    const spy = mock.method(console, "info", () => undefined);
    try {
      await accounts.requestPasswordReset("reset@ibmv.test");
      const token = capturedToken(spy);
      await accounts.resetPassword(token, "Brand-New-Pass-9");
      await assert.rejects(accounts.resetPassword(token, "Another-Pass-77"), errors.BusinessRule);
      await assert.rejects(accounts.authenticate(staff.email, PASSWORD));
      assert.equal((await accounts.authenticate(staff.email, "Brand-New-Pass-9")).id, staff.id);
      const after = await prisma.user.findUniqueOrThrow({ where: { id: staff.id } });
      assert.equal(after.tokenVersion, before.tokenVersion + 1);
    } finally {
      spy.mock.restore();
    }
    // Unknown addresses are accepted silently.
    await accounts.requestPasswordReset("ghost@ibmv.test");
  });

  test("changing the password needs the current one and revokes sessions", async () => {
    const staff = await createStaff("change@ibmv.test", "SUPPORT");
    await assert.rejects(accounts.changePassword(staff.id, "not-the-password", "Another-Pass-77"), errors.ValidationError);
    await accounts.changePassword(staff.id, PASSWORD, "Another-Pass-77");
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: staff.id } })).tokenVersion, 1);
    await accounts.authenticate(staff.email, "Another-Pass-77");
  });

  test("team: roles are gated, learners are excluded, and changes are audited", async () => {
    const head = await prisma.branch.create({ data: { name: "Head Office – Mumbai" } });
    await prisma.branch.create({ data: { name: "Pune Centre" } });
    const superAdmin = await createStaff("super@ibmv.test", "SUPER_ADMIN", head.id);
    const admin = await createStaff("admin@ibmv.test", "ADMIN", head.id);

    const listed = await team.teamResource.list(listQuery, ctx(superAdmin));
    assert.ok(listed.rows.every((r) => r.email !== "asha@example.com"), "learners never appear in the team list");
    assert.ok(listed.rows.some((r) => r.email === "super@ibmv.test"));

    const input = { name: "Gita Devi", email: "gita@ibmv.test", phone: "+91 98765 43210", role: "Instructor", branch: "Pune Centre" };
    await assert.rejects(team.teamResource.create!({ ...input, role: "Administrator" }, ctx(admin)), errors.Forbidden, "Administrator cannot grant Administrator");
    await assert.rejects(team.teamResource.create!({ ...input, role: "Super Admin" }, ctx(superAdmin)), errors.Forbidden);

    const spy = mock.method(console, "info", () => undefined);
    let row;
    try {
      row = await team.teamResource.create!(input, ctx(admin));
    } finally {
      spy.mock.restore();
    }
    assert.equal(row.role, "Instructor");
    assert.equal(row.branch, "Pune Centre");
    const created = await prisma.user.findUniqueOrThrow({ where: { email: "gita@ibmv.test" } });
    assert.equal(created.passwordHash, null, "invited staff have no password until they set one");
    await assert.rejects(team.teamResource.create!(input, ctx(admin)), errors.Conflict);

    const events = await prisma.auditEvent.findMany({ where: { action: "team.create" } });
    assert.equal(events.length, 1);
    assert.ok(!JSON.stringify(events[0]).toLowerCase().includes("passwordhash"));

    // Role change by Super Admin bumps the token version so the old session stops working.
    const beforeVersion = created.tokenVersion;
    await team.teamResource.update!(created.id, { role: "Finance" }, ctx(superAdmin));
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: created.id } })).tokenVersion, beforeVersion + 1);

    await assert.rejects(team.teamResource.update!(superAdmin.id, { role: "Support" }, ctx(superAdmin)), errors.BusinessRule, "nobody changes their own role");
  });

  test("team: archiving is guarded and signs the person out", async () => {
    const superAdmin = await prisma.user.findUniqueOrThrow({ where: { email: "super@ibmv.test" } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@ibmv.test" } });
    const support = await createStaff("support@ibmv.test", "SUPPORT");

    const superCtx = ctx(actor({ id: superAdmin.id, email: superAdmin.email, role: "SUPER_ADMIN" }));
    const adminCtx = ctx(actor({ id: admin.id, email: admin.email, role: "ADMIN" }));

    await assert.rejects(team.teamResource.actions!.archive(superAdmin.id, adminCtx), errors.Forbidden, "Administrator cannot archive a Super Admin");
    await assert.rejects(team.teamResource.actions!.archive(superAdmin.id, superCtx), errors.BusinessRule, "cannot archive yourself");

    const beforeVersion = (await prisma.user.findUniqueOrThrow({ where: { id: support.id } })).tokenVersion;
    const archived = await team.teamResource.actions!.archive(support.id, adminCtx);
    assert.equal(archived.state, "Archived");
    const after = await prisma.user.findUniqueOrThrow({ where: { id: support.id } });
    assert.equal(after.status, "ARCHIVED");
    assert.equal(after.tokenVersion, beforeVersion + 1);
    await assert.rejects(accounts.authenticate(support.email, PASSWORD), accounts.AuthFailure);

    const restored = await team.teamResource.actions!.restore(support.id, adminCtx);
    assert.equal(restored.state, "Active");
  });

  test("team: branch-scoped staff only see their own branch", async () => {
    const pune = await prisma.branch.findUniqueOrThrow({ where: { name: "Pune Centre" } });
    const scoped = await createStaff("pune.admin@ibmv.test", "ADMIN", pune.id);
    const scopedCtx = ctx({ ...scoped, branchIds: [pune.id] });

    const { rows } = await team.teamResource.list(listQuery, scopedCtx);
    assert.ok(rows.length > 0);
    assert.ok(rows.every((r) => r.branch === "Pune Centre"), "only Pune staff are visible");

    const mumbai = await prisma.user.findUniqueOrThrow({ where: { email: "super@ibmv.test" } });
    await assert.rejects(team.teamResource.actions!.archive(mumbai.id, scopedCtx), errors.NotFound, "out-of-scope records look like they do not exist");
  });
});
