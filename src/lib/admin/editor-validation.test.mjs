import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEditor, readItems, isVisible } from "./editor-validation.ts";

test("conditional required fields validate only when visible", () => {
  const field = { key: "price", label: "Price", type: "number", min: 0.01, required: true, showWhen: { key: "pricing", values: ["Paid"] } };
  assert.deepEqual(validateEditor([field], { pricing: "Free" }), {});
  assert.ok(validateEditor([field], { pricing: "Paid" }).price);
  assert.ok(validateEditor([field], { pricing: "Paid", price: "0" }).price);
  assert.deepEqual(validateEditor([field], { pricing: "Paid", price: "12.50" }), {});
  assert.equal(isVisible(field, { pricing: "Free" }), false);
});
test("event schedules reject missing fields, reversed times and overlapping days", () => {
  const field = { key: "days", label: "Event days", type: "repeat", minItems: 1, itemFields: [
    { key: "start", label: "Start", type: "datetime-local", required: true },
    { key: "end", label: "End", type: "datetime-local", required: true },
  ] };
  assert.ok(validateEditor([field], { days: "[]" }).days);
  assert.ok(validateEditor([field], { days: JSON.stringify([{ start: "2026-10-26T12:00", end: "" }]) }).days);
  assert.ok(validateEditor([field], { days: JSON.stringify([{ start: "2026-10-26T12:00", end: "2026-10-26T11:00" }]) }).days);
  assert.ok(validateEditor([field], { days: JSON.stringify([{ start: "2026-10-26T10:00", end: "2026-10-26T12:00" }, { start: "2026-10-26T11:00", end: "2026-10-26T13:00" }]) }).days);
  assert.deepEqual(validateEditor([field], { days: JSON.stringify([{ start: "2026-10-26T10:00", end: "2026-10-26T12:00" }, { start: "2026-10-27T11:00", end: "2026-10-27T13:00" }]) }), {});
});
test("batch date ordering and manager duplication are checked", () => {
  assert.ok(validateEditor([], { startDate: "2026-10-27", endDate: "2026-10-26" }).endDate);
  assert.ok(validateEditor([], { manager: "A", additionalManagers: "A\nB" }).additionalManagers);
  assert.deepEqual(validateEditor([], { startDate: "2026-10-26", endDate: "2026-10-27", manager: "A", additionalManagers: "B" }), {});
});
test("feedback choices require two options; corrupt repeat data is safe", () => {
  assert.deepEqual(readItems("corrupt"), []);
  assert.ok(validateEditor([], { questions: JSON.stringify([{ type: "Choice", options: "One" }]) }).questions);
  assert.deepEqual(validateEditor([], { questions: JSON.stringify([{ type: "Choice", options: "One\nTwo" }]) }), {});
});
test("percentages, URLs, email and numeric bounds are validated", () => {
  const fields = [
    { key: "threshold", label: "Percentage", type: "number", min: 1, max: 100 },
    { key: "link", label: "Link", type: "url" },
    { key: "email", label: "Email", type: "email" },
  ];
  const errors = validateEditor(fields, { threshold: "101", link: "javascript:alert(1)", email: "bad" });
  assert.equal(Object.keys(errors).length, 3);
  assert.deepEqual(validateEditor(fields, { threshold: "80", link: "https://example.test", email: "a@example.test" }), {});
});
