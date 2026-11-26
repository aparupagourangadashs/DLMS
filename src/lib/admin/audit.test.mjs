import assert from "node:assert/strict";
import { test } from "node:test";
import { describeAction, summarizeChange } from "./audit.ts";

test("action codes read as plain sentences", () => {
    assert.equal(describeAction("batch.create"), "Batch created");
    assert.equal(describeAction("holiday.delete"), "Holiday deleted");
    assert.equal(describeAction("category.reorder"), "Category reordered");
    assert.equal(describeAction("session.cancel"), "Session cancelled");
    assert.equal(describeAction("learner.register"), "Learner registered");
    assert.equal(describeAction("team.update"), "Team member updated");
    assert.equal(describeAction("export"), "List exported");
    assert.equal(describeAction("user.password_change"), "Password changed");
    assert.equal(describeAction("legal.publish"), "Legal published");
    assert.equal(describeAction("lead.stage"), "Lead stage changed");
    assert.equal(describeAction("session.reschedule"), "Session rescheduled");
    assert.equal(describeAction("something.odd_thing"), "Something odd thing");
    assert.equal(describeAction("lonely"), "Lonely");
});

test("a change shows the new values, and the old ones beside what was replaced", () => {
    assert.equal(summarizeChange(undefined, { name: "Gita", status: "Draft" }), "name: Gita \u00b7 status: Draft");
    assert.equal(summarizeChange({ role: "SUPPORT", city: "Pune" }, { role: "ADMIN", city: "Pune" }), "role: SUPPORT \u2192 ADMIN \u00b7 city: Pune");
    assert.equal(summarizeChange({ title: "Old title" }, undefined), "title: Old title");
    assert.equal(summarizeChange(undefined, { registrationNo: "IBMV/26/00001" }), "registration no: IBMV/26/00001");
});

test("a summary is short: three pairs, long text cut, lists counted", () => {
    assert.equal(summarizeChange(undefined, { a: 1, b: 2, c: 3, d: 4, e: 5 }), "a: 1 \u00b7 b: 2 \u00b7 c: 3 \u00b7 +2 more");
    assert.equal(summarizeChange(undefined, { note: "x".repeat(60) }), `note: ${"x".repeat(40)}\u2026`);
    assert.equal(summarizeChange(undefined, { fields: ["a", "b"], one: ["a"], none: null, empty: "" }, 4), "fields: 2 items \u00b7 one: 1 item \u00b7 none: none \u00b7 empty: empty");
    assert.equal(summarizeChange(undefined, undefined), "");
    assert.equal(summarizeChange("text", ["list"]), "");
});
