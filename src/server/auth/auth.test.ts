import { csvCell, toCsv } from "@/server/admin/csv";
import { redact } from "@/server/audit/redact";
import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTIONS, RESOURCES, assignableRoles, can, roleFromLabel, roleLabels, type AnyRole, type Permission } from "./permissions";
import { safeNext } from "./redirect";

const everything = RESOURCES.flatMap((r) => ACTIONS.map((a) => `${r}:${a}` as Permission));

test("Super Admin holds every permission and Learner holds none", () => {
  assert.ok(everything.every((p) => can("SUPER_ADMIN", p)));
  assert.ok(everything.every((p) => !can("LEARNER", p)));
});

test("Administrator cannot change settings or read the audit log", () => {
  assert.equal(can("ADMIN", "settings:write"), false);
  assert.equal(can("ADMIN", "audit:read"), false);
  assert.equal(can("ADMIN", "learners:export"), true);
});

test("role boundaries follow the draft matrix", () => {
  const cases: Array<[AnyRole, Permission, boolean]> = [
    ["CONTENT_EDITOR", "learners:read", false],
    ["CONTENT_EDITOR", "courses:publish", true],
    ["INSTRUCTOR", "learners:export", false],
    ["INSTRUCTOR", "submissions:write", true],
    ["FINANCE", "orders:refund", true],
    ["FINANCE", "certificates:issue", false],
    ["SUPPORT", "orders:refund", false],
    ["SUPPORT", "learners:write", true],
  ];
  for (const [role, permission, expected] of cases) assert.equal(can(role, permission), expected, `${role} ${permission}`);
});

test("only a Super Admin can grant Administrator", () => {
  assert.ok(assignableRoles("SUPER_ADMIN").includes("ADMIN"));
  assert.ok(!assignableRoles("SUPER_ADMIN").includes("SUPER_ADMIN"));
  assert.ok(!assignableRoles("ADMIN").includes("ADMIN"));
  assert.deepEqual(assignableRoles("INSTRUCTOR"), []);
});

test("role labels round-trip", () => {
  for (const role of Object.keys(roleLabels) as AnyRole[]) assert.equal(roleFromLabel(roleLabels[role]), role);
  assert.equal(roleFromLabel("Nope"), undefined);
});

test("safeNext only allows same-site paths inside the user's area", () => {
  assert.equal(safeNext("/admin/learning/batches", "STAFF"), "/admin/learning/batches");
  assert.equal(safeNext("/student/calendar?x=1", "LEARNER"), "/student/calendar?x=1");
  assert.equal(safeNext("/website/books", "LEARNER"), "/website/books");
  assert.equal(safeNext("/admin", "LEARNER"), "/student");
  assert.equal(safeNext("//evil.test", "STAFF"), "/admin");
  assert.equal(safeNext("https://evil.test", "STAFF"), "/admin");
  assert.equal(safeNext("/\\evil.test", "STAFF"), "/admin");
  assert.equal(safeNext("/adminx", "STAFF"), "/admin");
  assert.equal(safeNext(undefined, "LEARNER"), "/student");
});

test("audit redaction drops secrets and truncates long values", () => {
  const out = redact({ name: "Ann", passwordHash: "x", nested: { apiToken: "y", ok: 1 }, long: "a".repeat(600) }) as Record<string, unknown>;
  assert.equal(out.name, "Ann");
  assert.ok(!("passwordHash" in out));
  assert.deepEqual(out.nested, { ok: 1 });
  assert.equal(String(out.long).length, 501);
});

test("CSV cells are quoted and spreadsheet formulas are neutralised", () => {
  assert.equal(csvCell('He said "hi"'), '"He said ""hi"""');
  assert.equal(csvCell("=HYPERLINK(\"x\")"), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell(["a", "b"]), '"a; b"');
  assert.equal(csvCell(null), '""');
  assert.ok(toCsv(["A"], [["1"]]).startsWith("\uFEFF"));
});
