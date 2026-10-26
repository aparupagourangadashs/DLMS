import { test } from "node:test";
import assert from "node:assert/strict";
import { adminNav, findSectionByPath, pageHref, quickCreate } from "./navigation.ts";

const alphabetical = (items) =>
  [...items].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

test("all sections and their pages are alphabetical by displayed name", () => {
  assert.deepEqual(adminNav.map((section) => section.label), [
    "Analytics", "Engage", "Home", "Learning", "Marketing", "Products", "Sales", "Settings", "Users",
  ]);
  for (const section of adminNav) {
    const labels = section.pages.map((page) => page.label);
    assert.deepEqual(labels, alphabetical(labels), section.label);
  }
  assert.equal(adminNav.find((section) => section.slug === "products").pages[0].label, "eBooks");
  const routes = adminNav.flatMap((section) => section.pages.map((page) => pageHref(section.slug, page.slug)));
  assert.equal(routes.length, 52);
  assert.equal(new Set(routes).size, 52);
});

test("alphabetization preserves section landing pages and Home fallback", () => {
  const defaults = {
    home: "dashboard", products: "events", learning: "batches", users: "learners",
    engage: "community", marketing: "campaigns", sales: "abandoned-cart",
    analytics: "sales-enrollment", settings: "my-profile",
  };
  for (const section of adminNav) {
    assert.equal(section.landingPage, defaults[section.slug]);
    assert.ok(section.pages.some((page) => page.slug === section.landingPage));
    assert.equal(findSectionByPath(pageHref(section.slug, section.landingPage)).slug, section.slug);
    assert.equal(findSectionByPath(`/admin/help/${section.slug}/${section.landingPage}`).slug, section.slug);
  }
  for (const path of ["/admin", "/admin/help", "/admin/unknown/page"]) {
    assert.equal(findSectionByPath(path).slug, "home");
  }
});

test("quick-create actions are alphabetical and point to existing pages", () => {
  const labels = quickCreate.map((action) => action.label);
  assert.deepEqual(labels, alphabetical(labels));
  assert.equal(quickCreate.length, 8);
  assert.equal(new Set(quickCreate.map((action) => action.key)).size, 8);
  assert.ok(quickCreate.some((action) => action.key === "users/new-enrolment"));
  const keys = adminNav.flatMap((section) => section.pages.map((page) => `${section.slug}/${page.slug}`));
  for (const action of quickCreate) assert.ok(keys.includes(action.key), action.key);
});
