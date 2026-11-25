import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { AppError, RateLimited, ValidationError, toAppError } from "./errors";
import { parseListQuery } from "./list-query";
import { assertSameOrigin } from "./origin";
import { rateLimit, resetRateLimits } from "./rate-limit";
import { parseWith } from "./validate";

const params = (query: string) => new URLSearchParams(query);

test("parseListQuery applies defaults and computes skip/take", () => {
  const q = parseListQuery(params(""));
  assert.deepEqual({ page: q.page, pageSize: q.pageSize, skip: q.skip, take: q.take, q: q.q }, { page: 1, pageSize: 25, skip: 0, take: 25, q: "" });
});

test("parseListQuery reads the shared contract", () => {
  const q = parseListQuery(params("q=%20gita%20&tab=Active&filter.course=Bhakti&from=2026-01-01&to=2026-02-01&sort=name&dir=desc&page=3&pageSize=10"), { sortableKeys: ["name"] });
  assert.equal(q.q, "gita");
  assert.equal(q.tab, "Active");
  assert.deepEqual(q.filters, { course: "Bhakti" });
  assert.deepEqual(q.sort, { key: "name", dir: "desc" });
  assert.equal(q.skip, 20);
  assert.equal(q.take, 10);
});

test("parseListQuery caps pageSize and rejects bad input", () => {
  assert.equal(parseListQuery(params("pageSize=5000")).pageSize, 100);
  assert.throws(() => parseListQuery(params("page=0")), ValidationError);
  assert.throws(() => parseListQuery(params("from=2026-13-40")), ValidationError);
  assert.throws(() => parseListQuery(params("from=2026-02-01&to=2026-01-01")), ValidationError);
  assert.throws(() => parseListQuery(params("sort=password"), { sortableKeys: ["name"] }), ValidationError);
  assert.throws(() => parseListQuery(params("sort=name&dir=sideways")), ValidationError);
  assert.throws(() => parseListQuery(params("filter.bad-key=1")), ValidationError);
});

test("parseWith maps zod issues to field errors", () => {
  const schema = z.object({ email: z.email(), name: z.string().min(2) });
  try {
    parseWith(schema, { email: "nope", name: "x" });
    assert.fail("expected validation error");
  } catch (error) {
    assert.ok(error instanceof ValidationError);
    assert.deepEqual(Object.keys(error.fields ?? {}).sort(), ["email", "name"]);
  }
});

test("toAppError maps known and unknown failures without leaking details", () => {
  assert.equal(toAppError(new ValidationError({ a: "b" })).status, 400);
  const unique = Object.assign(new Error("Unique constraint failed on email"), { name: "PrismaClientKnownRequestError", code: "P2002" });
  assert.equal(toAppError(unique).status, 409);
  const unknown = toAppError(new Error("secret db detail"));
  assert.equal(unknown.status, 500);
  assert.ok(unknown instanceof AppError);
  assert.ok(!unknown.message.includes("secret"));
});

test("rateLimit blocks after the limit and recovers after the window", () => {
  resetRateLimits();
  rateLimit("k", 2, 1000, 0);
  rateLimit("k", 2, 1000, 1);
  assert.throws(() => rateLimit("k", 2, 1000, 2), RateLimited);
  rateLimit("k", 2, 1000, 1500);
});

test("assertSameOrigin blocks cross-site mutations only", () => {
  const post = (headers: Record<string, string>) => new Request("http://localhost:3000/api/x", { method: "POST", headers: { host: "localhost:3000", ...headers } });
  assertSameOrigin(post({ origin: "http://localhost:3000" }));
  assertSameOrigin(new Request("http://localhost:3000/api/x", { headers: { origin: "http://evil.test" } }));
  assert.throws(() => assertSameOrigin(post({ origin: "http://evil.test" })));
  assert.throws(() => assertSameOrigin(post({ "sec-fetch-site": "cross-site" })));
});
