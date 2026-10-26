import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { collections, filterPublicCourses, institutionLinks, publicBooks, publicCourses, publicPages } from "./content.ts";

const defaults = { query: "", language: "all", format: "all", teacher: "all" };

test("public route inventory includes every collection and institutional page", () => {
  assert.equal(publicPages.length, 16);
  assert.equal(new Set(publicPages).size, publicPages.length);
  for (const { slug } of [...collections, ...institutionLinks]) assert.ok(publicPages.includes(slug));
  for (const slug of ["books", "e-magazines", "contact", "account", "terms", "privacy"]) assert.ok(publicPages.includes(slug));
});

test("all 127 official courses preserve the six source collection counts and unique detail routes", () => {
  assert.equal(publicCourses.length, 127);
  assert.equal(new Set(publicCourses.map((course) => course.slug)).size, 127);
  assert.deepEqual(collections.map(({ slug }) => publicCourses.filter((course) => course.collection === slug).length), [3, 72, 29, 9, 10, 4]);
  for (const course of publicCourses) {
    const url = new URL(course.officialUrl);
    assert.equal(url.origin, "https://www.ibmedu.org");
    assert.ok(url.pathname.startsWith("/course-details/"));
    assert.match(course.slug, /^[a-z0-9_-]+$/);
    assert.ok(course.title && course.summary && course.duration && course.instructor);
    assert.ok(!course.officialUrl.includes("Signature="));
  }
});

test("all 122 unique authorized artworks are local and have correct dimensions", async () => {
  const images = [...new Map(publicCourses.map((course) => [course.image.src, course.image])).values()];
  assert.equal(images.length, 122);
  for (const image of images) {
    assert.match(image.src, /^\/website\/courses\/course-\d+\.webp$/);
    const file = new URL(`../../../public${image.src}`, import.meta.url);
    assert.ok(existsSync(file), image.src);
    const meta = await sharp(fileURLToPath(file)).metadata();
    assert.equal(meta.width, image.width);
    assert.equal(meta.height, image.height);
  }
});

test("catalog search trims and matches real course names and listed teachers case-insensitively", () => {
  assert.equal(filterPublicCourses(publicCourses, defaults).length, 127);
  assert.ok(filterPublicCourses(publicCourses, { ...defaults, query: "  MAHABHARATA AN OVERVIEW  " }).some((item) => item.title === "Mahabharata An Overview"));
  assert.ok(filterPublicCourses(publicCourses, { ...defaults, query: "Madhumangal Das" }).some((item) => item.title === "Lessons from the Legends"));
  assert.equal(filterPublicCourses(publicCourses, { ...defaults, query: "no-match-123" }).length, 0);
});

test("all nine public book covers preserve the English/Hindi collection and local dimensions", async () => {
  assert.deepEqual(["English", "Hindi"].map((language) => publicBooks.filter((book) => book.language === language).length), [3, 6]);
  for (const book of publicBooks) {
    const file = new URL(`../../../public${book.image}`, import.meta.url);
    assert.ok(existsSync(file));
    const meta = await sharp(fileURLToPath(file)).metadata();
    assert.equal(meta.width, 600);
    assert.equal(meta.height, 840);
  }
});

test("language, study format and teacher filters combine without changing source data", () => {
  const before = JSON.stringify(publicCourses);
  const item = publicCourses.find((course) => course.title === "Lessons from the Legends");
  assert.ok(item);
  const results = filterPublicCourses(publicCourses, { ...defaults, query: item.title, language: item.language, format: item.mode, teacher: item.instructor });
  assert.deepEqual(results.map((course) => course.slug), [item.slug]);
  assert.equal(filterPublicCourses(publicCourses, { ...defaults, format: "Unavailable format" }).length, 0);
  assert.equal(JSON.stringify(publicCourses), before);
});
