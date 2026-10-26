import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { officialVideoPlaylist, publishedCommunityFigures, testimonials, testimonialSource, websiteVideos } from "./community.ts";

test("four source-attributed testimonial excerpts have local square portraits", async () => {
  assert.equal(testimonials.length, 4);
  assert.equal(new Set(testimonials.map((item) => item.name)).size, 4);
  assert.equal(testimonialSource, "https://www.ibmedu.org/#testimonial");
  assert.ok(testimonials.reduce((total, item) => total + item.excerpt.split(/\s+/).length, 0) < 100);
  for (const item of testimonials) {
    const file = new URL(`../../../public${item.image}`, import.meta.url);
    assert.ok(existsSync(file));
    const metadata = await sharp(fileURLToPath(file)).metadata();
    assert.equal(metadata.width, 131);
    assert.equal(metadata.height, 131);
  }
});

test("videos preserve the three source IDs, playlist and locally hosted 16:9 thumbnails", async () => {
  assert.deepEqual(websiteVideos.map((item) => item.id), ["XkYUq8nhmX4", "IYMnhzi2Zaw", "43SncYcpKcw"]);
  assert.equal(new URL(officialVideoPlaylist).hostname, "www.youtube.com");
  assert.equal(new URL(officialVideoPlaylist).searchParams.get("list"), "PLSoiyHqcjc8QGqsS9wKkSQbutg1E1WEox");
  for (const item of websiteVideos) {
    assert.match(item.id, /^[\w-]{11}$/);
    assert.ok(item.title.includes(item.speaker));
    const file = new URL(`../../../public${item.image}`, import.meta.url);
    assert.ok(existsSync(file));
    const metadata = await sharp(fileURLToPath(file)).metadata();
    assert.equal(metadata.width / metadata.height, 16 / 9);
  }
});

test("published community figures match the supplied legacy-site reference, not local catalog counts", () => {
  assert.deepEqual(publishedCommunityFigures.map(({ value }) => value), ["22,291+", "250+", "100K+", "42+"]);
  assert.deepEqual(publishedCommunityFigures.map(({ label }) => label), ["Active students", "Courses", "Community members", "Countries"]);
});
