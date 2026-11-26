import { ACTOR_LEARNERS, ACTOR_SYSTEM } from "@/lib/admin/audit";
import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

describe("B8 audit view (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let auditLog: typeof import("@/server/services/audit-log");
    let listQuery: typeof import("@/server/http/list-query");
    let permissions: typeof import("@/server/auth/permissions");
    let assertion: typeof import("@/server/auth/assert");
    let audit: typeof import("@/server/audit");
    let errors: typeof import("@/server/http/errors");
    let boss: { id: string };
    let admin: { id: string };
    let learner: { id: string };

    const list = async (params: Record<string, string> = {}) => auditLog.listAuditEvents(listQuery.parseListQuery(new URLSearchParams(params), { sortableKeys: auditLog.AUDIT_SORT_KEYS }));
    const actions = async (params: Record<string, string> = {}) => (await list(params)).rows.map((row) => row.action);

    async function wipe() {
        await prisma.auditEvent.deleteMany();
        await prisma.user.deleteMany({ where: { email: { startsWith: "audit" } } });
    }

    const event = (over: { actorId?: string; action: string; entity: string; entityId?: string; before?: object; after?: object; ip?: string; createdAt: string }) =>
        prisma.auditEvent.create({ data: { ...over, createdAt: new Date(over.createdAt) } });

    before(async () => {
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        auditLog = await import("@/server/services/audit-log");
        listQuery = await import("@/server/http/list-query");
        permissions = await import("@/server/auth/permissions");
        assertion = await import("@/server/auth/assert");
        audit = await import("@/server/audit");
        errors = await import("@/server/http/errors");
        await wipe();

        const staff = (email: string, name: string, role: "SUPER_ADMIN" | "ADMIN") => prisma.user.create({ data: { email, kind: "STAFF", role, emailVerifiedAt: new Date(), staffProfile: { create: { displayName: name } } } });
        boss = await staff("audit-boss@ibmv.test", "Audit Boss", "SUPER_ADMIN");
        admin = await staff("audit-admin@ibmv.test", "Audit Admin", "ADMIN");
        learner = await prisma.user.create({ data: { email: "audit.learner@example.com", kind: "LEARNER", role: "LEARNER", emailVerifiedAt: new Date(), learnerProfile: { create: { name: "Audit Learner", registrationNo: "AU-001" } } } });

        await event({ actorId: admin.id, action: "batch.create", entity: "Batch", entityId: "b-1", after: { name: "Gita", status: "Draft" }, ip: "10.0.0.1", createdAt: "2026-11-10T08:00:00Z" });
        // 01:30 on 12 November in India, although it is still 11 November in UTC.
        await event({ actorId: admin.id, action: "batch.archive", entity: "Batch", entityId: "b-1", before: { status: "Active" }, createdAt: "2026-11-11T20:00:00Z" });
        await event({ actorId: boss.id, action: "team.update", entity: "User", entityId: "u-1", before: { role: "SUPPORT" }, after: { role: "ADMIN" }, createdAt: "2026-11-12T05:00:00Z" });
        await event({ actorId: learner.id, action: "learner.register", entity: "User", entityId: learner.id, createdAt: "2026-11-13T05:00:00Z" });
        await event({ action: "lead.create", entity: "Lead", entityId: "l-1", after: { source: "BULK_BOOK" }, ip: "203.0.113.9", createdAt: "2026-11-14T05:00:00Z" });
        await event({ actorId: boss.id, action: "export", entity: "users/learners", after: { rows: 12 }, createdAt: "2026-11-15T05:00:00Z" });
    });

    after(async () => {
        await wipe();
        await prisma.$disconnect();
    });

    test("newest first, with who did it, what it was, and a summary of the change", async () => {
        const result = await list();
        assert.equal(result.total, 6);
        assert.deepEqual(result.rows.map((row) => row.action), ["export", "lead.create", "learner.register", "team.update", "batch.archive", "batch.create"]);
        const [exported, lead, register, team, archive, create] = result.rows;
        assert.deepEqual([exported.actorName, exported.actorRole, exported.label, exported.summary], ["Audit Boss", "Super Admin", "List exported", "rows: 12"]);
        assert.deepEqual([lead.actorName, lead.actorEmail, lead.actorRole, lead.ip], ["No account (visitor or system)", null, null, "203.0.113.9"]);
        assert.deepEqual([register.actorName, register.actorRole], ["Audit Learner", "Learner"]);
        assert.equal(team.summary, "role: SUPPORT \u2192 ADMIN");
        assert.deepEqual([archive.label, archive.summary], ["Batch archived", "status: Active"]);
        assert.deepEqual([create.label, create.summary, create.ip, create.entityId], ["Batch created", "name: Gita \u00b7 status: Draft", "10.0.0.1", "b-1"]);
        assert.deepEqual(create.after, { name: "Gita", status: "Draft" });
        assert.equal(create.before, null);
    });

    test("filters by action, record type and who", async () => {
        assert.deepEqual(await actions({ "filter.action": "batch.create" }), ["batch.create"]);
        assert.deepEqual(await actions({ "filter.entity": "Batch" }), ["batch.archive", "batch.create"]);
        assert.deepEqual(await actions({ "filter.actor": admin.id }), ["batch.archive", "batch.create"]);
        assert.deepEqual(await actions({ "filter.actor": ACTOR_LEARNERS }), ["learner.register"]);
        assert.deepEqual(await actions({ "filter.actor": ACTOR_SYSTEM }), ["lead.create"]);
        assert.deepEqual(await actions({ "filter.entity": "Batch", "filter.actor": boss.id }), [], "filters combine");
    });

    test("the period is whole India-time days", async () => {
        assert.deepEqual(await actions({ from: "2026-11-12", to: "2026-11-12" }), ["team.update", "batch.archive"], "01:30 IST on the 12th is in the 12th");
        assert.deepEqual(await actions({ to: "2026-11-11" }), ["batch.create"], "and not in the 11th");
        assert.deepEqual(await actions({ from: "2026-11-15" }), ["export"]);
        assert.equal((await list({ from: "2026-12-01" })).total, 0);
        assert.throws(() => listQuery.parseListQuery(new URLSearchParams({ from: "2026-13-01" })), errors.ValidationError);
        assert.throws(() => listQuery.parseListQuery(new URLSearchParams({ from: "2026-11-12", to: "2026-11-01" })), errors.ValidationError);
    });

    test("search finds a person by name or email, and an action, record id or address", async () => {
        assert.deepEqual(await actions({ q: "Boss" }), ["export", "team.update"]);
        assert.deepEqual(await actions({ q: "audit-admin@" }), ["batch.archive", "batch.create"]);
        assert.deepEqual(await actions({ q: "Audit Learner" }), ["learner.register"]);
        assert.deepEqual(await actions({ q: "b-1" }), ["batch.archive", "batch.create"]);
        assert.deepEqual(await actions({ q: "203.0.113" }), ["lead.create"]);
        assert.deepEqual(await actions({ q: "register" }), ["learner.register"]);
        assert.equal((await list({ q: "zzz-nothing" })).total, 0);
    });

    test("paging and ordering", async () => {
        const second = await list({ pageSize: "2", page: "2" });
        assert.deepEqual([second.total, second.rows.map((row) => row.action)], [6, ["learner.register", "team.update"]]);
        assert.deepEqual((await list({ pageSize: "4", page: "2" })).rows.length, 2);
        assert.equal((await list({ sort: "action", dir: "asc" })).rows[0].action, "batch.archive");
        assert.equal((await list({ sort: "entity", dir: "desc" })).rows[0].entity, "users/learners");
        assert.equal((await list({ sort: "when", dir: "asc" })).rows[0].action, "batch.create");
        assert.throws(() => listQuery.parseListQuery(new URLSearchParams({ sort: "ip" }), { sortableKeys: auditLog.AUDIT_SORT_KEYS }), errors.ValidationError);
    });

    test("the filters offer what the log holds", async () => {
        const options = await auditLog.auditFilterOptions();
        assert.deepEqual(options.actions.map((choice) => choice.label), ["Batch archived", "Batch created", "Lead created", "Learner registered", "List exported", "Team member updated"], "by readable name");
        assert.deepEqual(options.entities, ["Batch", "Lead", "User", "users/learners"]);
        assert.deepEqual(options.actors.map((choice) => choice.value).slice(0, 2), [ACTOR_LEARNERS, ACTOR_SYSTEM]);
        assert.deepEqual(options.actors.slice(2).map((choice) => choice.label), ["Audit Admin (Administrator)", "Audit Boss (Super Admin)"], "staff only, by name");
    });

    test("secrets stay out of the log and long text is cut", async () => {
        await audit.writeAudit({ actorId: boss.id, action: "demo.secret", entity: "Demo", after: { name: "kept", password: "hunter2", resetToken: "abc", note: "n".repeat(600) } });
        const row = (await list({ q: "demo.secret" })).rows[0];
        const after = row.after as Record<string, string>;
        assert.deepEqual(Object.keys(after).sort(), ["name", "note"]);
        assert.equal(after.note.length, 501);
        assert.equal(JSON.stringify(row).includes("hunter2"), false);
    });

    test("only a Super Admin may read the log", () => {
        assert.equal(permissions.can("SUPER_ADMIN", "audit:read"), true);
        for (const role of ["ADMIN", "INSTRUCTOR", "CONTENT_EDITOR", "FINANCE", "SUPPORT", "LEARNER"] as const) {
            assert.equal(permissions.can(role, "audit:read"), false, role);
            assert.throws(() => assertion.assertCan({ role }, "audit", "read"), errors.Forbidden, role);
        }
        assert.doesNotThrow(() => assertion.assertCan({ role: "SUPER_ADMIN" }, "audit", "read"));
    });
});
