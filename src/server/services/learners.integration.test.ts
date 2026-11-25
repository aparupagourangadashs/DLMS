import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, mock, test } from "node:test";

// Runs against a separate empty database; skipped when TEST_DATABASE_URL is not set.
const testUrl = process.env.TEST_DATABASE_URL;
const skip = testUrl ? false : "TEST_DATABASE_URL is not set";

type SessionUser = import("@/server/auth/session").SessionUser;

describe("B3 learners, profile, preferences and support (database)", { skip }, () => {
    let prisma: (typeof import("@/server/db"))["prisma"];
    let accounts: typeof import("@/server/services/accounts");
    let registration: typeof import("@/server/services/registration");
    let profileService: typeof import("@/server/services/learner-profile");
    let supportService: typeof import("@/server/services/support");
    let resources: typeof import("@/server/admin/resources");
    let studentProfile: typeof import("@/lib/student/profile");
    let errors: typeof import("@/server/http/errors");

    let admin: SessionUser;
    let support: SessionUser;
    let scoped: SessionUser;
    let branchA: { id: string; name: string };
    let branchB: { id: string; name: string };

    const ctx = (user: SessionUser) => ({ user, ip: "127.0.0.1" });
    const listQuery = { q: "", filters: {}, page: 1, pageSize: 25, skip: 0, take: 25 };
    const learners = () => resources.getResource("users/learners");

    async function createStaff(email: string, role: SessionUser["role"], branchIds: string[] = []): Promise<SessionUser> {
        const user = await prisma.user.create({
            data: { email, kind: "STAFF", role, emailVerifiedAt: new Date(), staffProfile: { create: { displayName: email.split("@")[0] } } },
        });
        for (const branchId of branchIds) await prisma.userBranch.create({ data: { userId: user.id, branchId } });
        return { id: user.id, email, name: email, role, kind: "STAFF", branchIds };
    }

    /** Creates a learner the way registration does, so it gets a profile and a registration number. */
    async function createLearner(email: string, name = "Asha Rao", branchId?: string) {
        const user = await prisma.$transaction(async (tx) =>
            tx.user.create({
                data: {
                    email,
                    kind: "LEARNER",
                    role: "LEARNER",
                    emailVerifiedAt: new Date(),
                    learnerProfile: { create: { name, branchId, registrationNo: await registration.nextRegistrationNo(tx) } },
                },
            }),
        );
        const session: SessionUser = { id: user.id, email, name, role: "LEARNER", kind: "LEARNER", branchIds: [] };
        return session;
    }

    const emailsSent = (spy: ReturnType<typeof mock.method>) => spy.mock.calls.map((call) => String(call.arguments[0]));
    const quiet = () => mock.method(console, "info", () => undefined);

    async function wipe() {
        await prisma.supportRequest.deleteMany();
        await prisma.counter.deleteMany();
        await prisma.auditEvent.deleteMany();
        await prisma.passwordResetToken.deleteMany({ where: { user: { email: { startsWith: "b3" } } } });
        await prisma.emailVerificationToken.deleteMany({ where: { user: { email: { startsWith: "b3" } } } });
        await prisma.user.deleteMany({ where: { email: { startsWith: "b3" }, kind: "LEARNER" } });
    }

    before(async () => {
        process.env.DATABASE_URL = testUrl;
        ({ prisma } = await import("@/server/db"));
        accounts = await import("@/server/services/accounts");
        registration = await import("@/server/services/registration");
        profileService = await import("@/server/services/learner-profile");
        supportService = await import("@/server/services/support");
        resources = await import("@/server/admin/resources");
        studentProfile = await import("@/lib/student/profile");
        errors = await import("@/server/http/errors");

        await prisma.user.deleteMany({ where: { email: { startsWith: "b3" } } });
        await prisma.branch.deleteMany({ where: { name: { startsWith: "B3 " } } });
        branchA = await prisma.branch.create({ data: { name: "B3 Pune" } });
        branchB = await prisma.branch.create({ data: { name: "B3 Mumbai" } });
        admin = await createStaff("b3-admin@ibmv.test", "ADMIN");
        support = await createStaff("b3-support@ibmv.test", "SUPPORT");
        scoped = await createStaff("b3-scoped@ibmv.test", "SUPPORT", [branchA.id]);
    });

    beforeEach(wipe);

    after(async () => {
        await wipe();
        await prisma.user.deleteMany({ where: { email: { startsWith: "b3" } } });
        await prisma.branch.deleteMany({ where: { name: { startsWith: "B3 " } } });
        await prisma.$disconnect();
    });

    test("registration numbers are sequential per year and never repeat under concurrency", async () => {
        const first = await prisma.$transaction((tx) => registration.nextRegistrationNo(tx, new Date("2026-11-25T10:00:00Z")));
        assert.equal(first, "IBMV/26/00001");
        const rest = await Promise.all(Array.from({ length: 6 }, () => prisma.$transaction((tx) => registration.nextRegistrationNo(tx, new Date("2026-11-25T10:00:00Z")))));
        assert.equal(new Set(rest).size, 6, "every number is unique");
        assert.deepEqual([...rest].sort(), Array.from({ length: 6 }, (_, i) => `IBMV/26/${String(i + 2).padStart(5, "0")}`));
        // A new year starts its own series; the year is taken in Indian time.
        assert.equal(await prisma.$transaction((tx) => registration.nextRegistrationNo(tx, new Date("2026-12-31T19:00:00Z"))), "IBMV/27/00001");
    });

    test("a learner who registers gets a registration number and a default profile", async () => {
        const spy = quiet();
        try {
            await accounts.registerLearner({ name: "Asha Rao", email: "b3.asha@example.com", password: "Sup3rSecret!!" });
        } finally {
            spy.mock.restore();
        }
        const user = await prisma.user.findUniqueOrThrow({ where: { email: "b3.asha@example.com" }, include: { learnerProfile: true } });
        assert.match(user.learnerProfile?.registrationNo ?? "", /^IBMV\/\d{2}\/\d{5}$/);
        assert.equal(user.learnerProfile?.status, "REGISTERED");
        const profile = await profileService.getLearnerProfile(user.id);
        assert.equal(profile.email, "b3.asha@example.com");
        assert.equal(studentProfile.profileCompletion(profile).percent, 33, "only the name and email are provided at sign-up");
    });

    test("profile: edits are validated, partial, private to the learner and audited without personal data", async () => {
        const asha = await createLearner("b3.asha@example.com");
        const ravi = await createLearner("b3.ravi@example.com", "Ravi Kumar");

        const saved = await profileService.updateLearnerProfile(asha.id, {
            username: "Asha.Rao", dob: "2001-04-09", gender: "female", mobile: "+91 98765 43210", city: "Pune", address: "12 Temple Road", pincode: "411001", source: "friend",
        });
        assert.equal(saved.username, "asha.rao", "usernames are lowercased");
        assert.equal(saved.dob, "2001-04-09");
        assert.equal(saved.mobile, "+91 98765 43210");
        assert.equal(saved.name, "Asha Rao", "fields that were not sent stay as they were");
        assert.equal(studentProfile.profileCompletion(saved).percent, 100);

        await assert.rejects(profileService.updateLearnerProfile(ravi.id, { username: "ASHA.rao" }), errors.ValidationError, "usernames are unique");
        await assert.rejects(profileService.updateLearnerProfile(asha.id, { dob: "2999-01-01" }), errors.ValidationError, "no birth dates in the future");
        await assert.rejects(profileService.updateLearnerProfile(asha.id, { dob: "2026-02-31" }), errors.ValidationError, "no impossible dates");
        await assert.rejects(profileService.updateLearnerProfile(asha.id, { gender: "robot" }), errors.ValidationError);
        await assert.rejects(profileService.updateLearnerProfile(asha.id, { username: "no spaces!" }), errors.ValidationError);
        await assert.rejects(profileService.updateLearnerProfile(asha.id, { parentEmail: "nope" }), errors.ValidationError);
        await assert.rejects(profileService.updateLearnerProfile(asha.id, { pincode: "<script>" }), errors.ValidationError);
        await assert.rejects(profileService.updateLearnerProfile(asha.id, { name: "" }), errors.ValidationError);

        // The sign-in email and the registration number are not writable through the profile.
        const before = await profileService.getLearnerProfile(asha.id);
        const after = await profileService.updateLearnerProfile(asha.id, { email: "someone.else@example.com", registrationNo: "IBMV/00/99999", city: "" });
        assert.equal(after.email, before.email);
        assert.equal(after.registrationNo, before.registrationNo);
        assert.equal(after.city, "", "an empty value clears a field");

        const events = await prisma.auditEvent.findMany({ where: { action: "profile.update" } });
        assert.equal(events.length, 2);
        const text = JSON.stringify(events).toLowerCase();
        assert.ok(!text.includes("temple") && !text.includes("98765") && !text.includes("2001-04-09"), "audit keeps field names, not values");

        // Staff accounts have no learner profile.
        await assert.rejects(profileService.getLearnerProfile(admin.id), errors.NotFound);
    });

    test("preferences: defaults, consent record, validation and audited changes", async () => {
        const asha = await createLearner("b3.asha@example.com");
        const defaults = await profileService.getLearnerPreferences(asha.id);
        assert.deepEqual(
            { reminder: defaults.sessionReminder1Hour, email: defaults.email, promotional: defaults.promotional, whatsapp: defaults.whatsapp, zone: defaults.timezone },
            { reminder: true, email: true, promotional: false, whatsapp: false, zone: "Asia/Kolkata" },
        );
        assert.deepEqual(studentProfile.allowedPromotionalChannels(defaults), [], "no promotional consent by default");

        const next = { ...defaults, timezone: "Europe/London", timezoneAuto: true, promotional: true, whatsapp: true, sessionReminder1Day: true };
        const saved = await profileService.saveLearnerPreferences(asha.id, next);
        assert.equal(saved.timezone, "Europe/London");
        assert.equal(saved.timezoneAuto, true);
        assert.deepEqual(studentProfile.allowedPromotionalChannels(saved), ["whatsapp", "email"]);
        assert.deepEqual(await profileService.getLearnerPreferences(asha.id), saved, "saved values are read back");

        await assert.rejects(profileService.saveLearnerPreferences(asha.id, { ...next, timezone: "Mars/Olympus" }), errors.ValidationError);
        await assert.rejects(profileService.saveLearnerPreferences(asha.id, { ...next, promotional: "yes" }), errors.ValidationError);
        await assert.rejects(profileService.saveLearnerPreferences(asha.id, { timezone: "UTC" }), errors.ValidationError, "a save carries every setting");

        const event = await prisma.auditEvent.findFirstOrThrow({ where: { action: "preferences.update" } });
        assert.deepEqual(Object.keys(event.after as object).sort(), ["promotional", "sessionReminder1Day", "timezone", "timezoneAuto", "whatsapp"]);
    });

    test("support: learners write, the team replies, and nobody reads another learner's requests", async () => {
        const asha = await createLearner("b3.asha@example.com");
        const ravi = await createLearner("b3.ravi@example.com", "Ravi Kumar");
        const spy = quiet();
        try {
            await assert.rejects(supportService.createSupportRequest(asha, { message: "too short" }), errors.ValidationError);
            await assert.rejects(supportService.createSupportRequest(asha, { message: "x".repeat(2001) }), errors.ValidationError);
            const request = await supportService.createSupportRequest(asha, { message: "I cannot see my course in My Learning." });
            assert.equal(request.status, "Open");
            await supportService.createSupportRequest(ravi, { message: "How do I change my email address?" });

            assert.deepEqual((await supportService.listMySupportRequests(asha.id)).map((r) => r.message), ["I cannot see my course in My Learning."]);

            const inbox = await supportService.listSupportRequests({ q: "", tab: "Open", skip: 0, take: 25 });
            assert.equal(inbox.total, 2);
            assert.deepEqual(inbox.tabCounts, { Open: 2, "In progress": 0, Resolved: 0 });
            assert.equal((await supportService.listSupportRequests({ q: "email address", tab: undefined, skip: 0, take: 25 })).rows[0].name, "Ravi Kumar");

            const thread = await supportService.replyToSupportRequest(request.id, { body: "Thanks for writing. Please sign out and back in." }, { id: support.id });
            assert.equal(thread.status, "In progress", "a reply moves an open request along");
            assert.equal(thread.assignedToId, support.id, "the replier takes the request");
            assert.equal(thread.replies.length, 1);
            assert.equal(thread.replies[0].fromStaff, true);
            assert.ok(emailsSent(spy).some((line) => line.includes("to=b3.asha@example.com") && line.includes("A reply from IBMV")), "the learner is emailed the reply");

            const mine = await supportService.listMySupportRequests(asha.id);
            assert.equal(mine[0].replies[0].body, "Thanks for writing. Please sign out and back in.", "the learner sees the reply");
            assert.deepEqual(await supportService.listMySupportRequests(ravi.id).then((rows) => rows.map((r) => r.replies.length)), [0]);

            const resolved = await supportService.updateSupportRequest(request.id, { status: "Resolved" }, { id: support.id });
            assert.equal(resolved.status, "Resolved");
            await assert.rejects(supportService.updateSupportRequest(request.id, { status: "Closed" }, { id: support.id }), errors.ValidationError);
            await assert.rejects(supportService.updateSupportRequest(request.id, { assignedToId: asha.id }, { id: support.id }), errors.ValidationError, "only staff can be assigned");
            const unassigned = await supportService.updateSupportRequest(request.id, { assignedToId: null }, { id: support.id });
            assert.equal(unassigned.assignedToId, null);
            await assert.rejects(supportService.replyToSupportRequest(request.id, { body: "x" }, { id: support.id }), errors.ValidationError);
            await assert.rejects(supportService.getSupportThread("missing"), errors.NotFound);
        } finally {
            spy.mock.restore();
        }
        assert.deepEqual((await prisma.auditEvent.findMany({ where: { entity: "SupportRequest" } })).map((e) => e.action).sort(), [
            "support.create", "support.create", "support.reply", "support.status", "support.update",
        ]);
    });

    test("learners: staff create accounts, search and filter, and archive without deleting", async () => {
        const spy = quiet();
        try {
            const row = await learners().create!({ name: "Gita Devi", email: "B3.Gita@Example.com", phone: "+91 91234 56789", city: "Pune", branch: branchA.name }, ctx(admin));
            assert.equal(row.status, "Registered");
            assert.equal(row.email, "b3.gita@example.com");
            assert.match(String(row.regNo), /^IBMV\/\d{2}\/00001$/);
            assert.equal(row.branch, branchA.name);
            assert.ok(emailsSent(spy).some((line) => line.includes("to=b3.gita@example.com") && line.includes("Set up your IBMV account")), "the learner gets a setup link, never a password");
            const stored = await prisma.user.findUniqueOrThrow({ where: { email: "b3.gita@example.com" } });
            assert.equal(stored.passwordHash, null);
            assert.ok(stored.emailVerifiedAt, "an admin-created address counts as verified once the link is used");

            await assert.rejects(learners().create!({ name: "Gita Again", email: "b3.gita@example.com" }, ctx(admin)), errors.Conflict);
            await assert.rejects(learners().create!({ name: "X", email: "b3.x@example.com" }, ctx(admin)), errors.ValidationError);
            await assert.rejects(learners().create!({ name: "No Mail", email: "not-an-email" }, ctx(admin)), errors.ValidationError);
            await assert.rejects(learners().create!({ name: "Bad Branch", email: "b3.bb@example.com", branch: "No such branch" }, ctx(admin)), errors.ValidationError);
            await assert.rejects(learners().create!({ name: "Born Archived", email: "b3.ba@example.com", standing: "Archived" }, ctx(admin)), errors.ValidationError);

            await learners().create!({ name: "Ravi Kumar", email: "b3.ravi@example.com", city: "Mumbai", branch: branchB.name, standing: "On leave" }, ctx(admin));
            const all = await learners().list(listQuery, ctx(admin));
            assert.equal(all.total, 2);
            assert.deepEqual(all.tabCounts, { Registered: 1, Enrolled: 0, Completed: 0, "On leave": 1, Archived: 0 });
            assert.deepEqual((await learners().list({ ...listQuery, tab: "On leave" }, ctx(admin))).rows.map((r) => r.name), ["Ravi Kumar"]);
            assert.deepEqual((await learners().list({ ...listQuery, q: "IBMV/" }, ctx(admin))).total, 2, "registration numbers are searchable");
            assert.deepEqual((await learners().list({ ...listQuery, q: "91234" }, ctx(admin))).rows.map((r) => r.name), ["Gita Devi"], "phone search");
            assert.deepEqual((await learners().list({ ...listQuery, filters: { city: "Mumbai" } }, ctx(admin))).rows.map((r) => r.name), ["Ravi Kumar"]);
            assert.deepEqual((await learners().list({ ...listQuery, filters: { branch: branchA.name } }, ctx(admin))).rows.map((r) => r.name), ["Gita Devi"]);
            assert.deepEqual((await learners().list({ ...listQuery, sort: { key: "name", dir: "asc" } }, ctx(admin))).rows.map((r) => r.name), ["Gita Devi", "Ravi Kumar"]);
            assert.equal((await learners().list({ ...listQuery, from: "2999-01-01" }, ctx(admin))).total, 0);
            const options = await learners().options!();
            assert.deepEqual(options.city, ["Mumbai", "Pune"]);
            assert.ok(options.branch.includes(branchA.name));

            // Archiving signs the learner out everywhere and keeps the record; restoring brings it back.
            const before = await prisma.user.findUniqueOrThrow({ where: { email: "b3.gita@example.com" } });
            const archived = await learners().actions!.archive(String(row.id), ctx(admin));
            assert.equal(archived.status, "Archived");
            const archivedUser = await prisma.user.findUniqueOrThrow({ where: { email: "b3.gita@example.com" } });
            assert.equal(archivedUser.status, "ARCHIVED");
            assert.equal(archivedUser.tokenVersion, before.tokenVersion + 1);
            await assert.rejects(accounts.authenticate("b3.gita@example.com", "whatever-123"), accounts.AuthFailure);
            await assert.rejects(learners().actions!["reset-password"](String(row.id), ctx(admin)), errors.ValidationError, "restore first");
            const restored = await learners().actions!.restore(String(row.id), ctx(admin));
            assert.equal(restored.status, "Registered");
            assert.equal((await prisma.user.findUniqueOrThrow({ where: { email: "b3.gita@example.com" } })).status, "ACTIVE");

            const reset = await learners().actions!["reset-password"](String(row.id), ctx(admin));
            assert.equal(reset.email, "b3.gita@example.com");
            assert.ok(emailsSent(spy).some((line) => line.includes("Reset your password") && line.includes("to=b3.gita@example.com")));
        } finally {
            spy.mock.restore();
        }
        const actions = (await prisma.auditEvent.findMany({ where: { entity: "User" } })).map((e) => e.action);
        for (const expected of ["learner.create", "learner.archive", "learner.restore", "learner.password_reset"]) assert.ok(actions.includes(expected), expected);
        assert.ok(!JSON.stringify(await prisma.auditEvent.findMany()).includes("passwordHash"));
    });

    test("learners: editing changes details, status changes the account, and the email stays fixed", async () => {
        const spy = quiet();
        try {
            const row = await learners().create!({ name: "Gita Devi", email: "b3.gita@example.com", city: "Pune" }, ctx(admin));
            const id = String(row.id);
            const edited = await learners().update!(id, { name: "Gita Devi Dasi", email: "changed@example.com", phone: "+91 90000 11111", city: "Nashik", branch: branchB.name }, ctx(admin));
            assert.equal(edited.name, "Gita Devi Dasi");
            assert.equal(edited.email, "b3.gita@example.com", "the sign-in email is not editable");
            assert.equal(edited.city, "Nashik");
            assert.equal(edited.branch, branchB.name);
            assert.equal(edited.phone, "+91 90000 11111");

            assert.equal((await learners().update!(id, { standing: "On leave" }, ctx(admin))).status, "On leave");
            assert.equal((await prisma.user.findUniqueOrThrow({ where: { email: "b3.gita@example.com" } })).status, "ACTIVE", "on leave does not block sign-in");
            const archived = await learners().update!(id, { standing: "Archived" }, ctx(admin));
            assert.equal(archived.status, "Archived");
            assert.equal((await prisma.user.findUniqueOrThrow({ where: { email: "b3.gita@example.com" } })).status, "ARCHIVED");
            assert.equal((await learners().update!(id, { standing: "Registered" }, ctx(admin))).status, "Registered");
            assert.equal((await prisma.user.findUniqueOrThrow({ where: { email: "b3.gita@example.com" } })).status, "ACTIVE");
            assert.equal((await learners().update!(id, { branch: "" }, ctx(admin))).branch, "", "an empty branch clears it");

            await assert.rejects(learners().update!(id, { standing: "Deleted" }, ctx(admin)), errors.ValidationError);
            await assert.rejects(learners().update!("missing", { name: "Nobody Here" }, ctx(admin)), errors.NotFound);
            assert.equal((await learners().get!(id, ctx(admin))).email, "b3.gita@example.com");
        } finally {
            spy.mock.restore();
        }
    });

    test("learners: branch-scoped staff only see and manage their own branch", async () => {
        const inPune = await createLearner("b3.pune@example.com", "Pune Learner", branchA.id);
        const inMumbai = await createLearner("b3.mumbai@example.com", "Mumbai Learner", branchB.id);
        await createLearner("b3.nobranch@example.com", "Online Learner");

        assert.equal((await learners().list(listQuery, ctx(admin))).total, 3, "unscoped staff see everyone");
        const seen = await learners().list(listQuery, ctx(scoped));
        assert.deepEqual(seen.rows.map((r) => r.name), ["Pune Learner"]);
        assert.deepEqual(seen.tabCounts, { Registered: 1, Enrolled: 0, Completed: 0, "On leave": 0, Archived: 0 }, "counts honour the scope too");

        assert.equal((await learners().get!(inPune.id, ctx(scoped))).name, "Pune Learner");
        await assert.rejects(learners().get!(inMumbai.id, ctx(scoped)), errors.NotFound, "another branch looks like it does not exist");
        await assert.rejects(learners().update!(inMumbai.id, { name: "Changed Name" }, ctx(scoped)), errors.NotFound);
        await assert.rejects(learners().actions!.archive(inMumbai.id, ctx(scoped)), errors.NotFound);
        await assert.rejects(learners().update!(inPune.id, { branch: branchB.name }, ctx(scoped)), errors.Forbidden, "cannot move a learner into a branch they do not manage");

        const spy = quiet();
        try {
            const created = await learners().create!({ name: "New Local", email: "b3.local@example.com" }, ctx(scoped));
            assert.equal(created.branch, branchA.name, "a scoped member's learners land in their branch");
            await assert.rejects(learners().create!({ name: "Elsewhere", email: "b3.else@example.com", branch: branchB.name }, ctx(scoped)), errors.Forbidden);
        } finally {
            spy.mock.restore();
        }
    });

    test("the learner and support roles in the permission matrix", async () => {
        const { can } = await import("@/server/auth/permissions");
        assert.ok(can("SUPPORT", "learners:write"));
        assert.ok(can("SUPPORT", "supportRequests:write"));
        assert.ok(can("INSTRUCTOR", "learners:read"));
        assert.ok(!can("INSTRUCTOR", "learners:write"));
        assert.ok(!can("INSTRUCTOR", "supportRequests:read"));
        assert.ok(!can("FINANCE", "learners:write"));
        assert.ok(!can("CONTENT_EDITOR", "learners:read"), "content editors cannot read learners");
        assert.ok(!can("SUPPORT", "learners:export"));
        assert.ok(can("ADMIN", "learners:export"));
    });
});
