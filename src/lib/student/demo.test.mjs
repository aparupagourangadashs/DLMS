import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarDays, courseBanners, courses, initialStudentProfile, profileCompletion, progress, sessions, shiftCalendarDate, studentHref, studentNav, studentToday } from "./demo.ts";
import { existsSync } from "node:fs";

test("profile completion is calculated from the shared fictional profile", () => {
  assert.deepEqual(profileCompletion(initialStudentProfile), { completed: 3, total: 6, percent: 50 });
  assert.equal(profileCompletion({}).percent, 0);
  assert.equal(profileCompletion({ ...initialStudentProfile, mobile: " ", city: "", address: "\t" }).percent, 50);
  assert.equal(profileCompletion({ ...initialStudentProfile, mobile: "demo", city: "demo", address: "demo" }).percent, 100);
});

test("both reference carousel artworks are stored locally with official destinations", () => {
  assert.equal(courseBanners.length, 2);
  assert.equal(new Set(courseBanners.map((banner) => banner.image)).size, 2);
  for (const banner of courseBanners) {
    assert.ok(existsSync(new URL(`../../../public${banner.image}`, import.meta.url)));
    assert.ok(banner.alt && banner.width > 0 && banner.height > 0);
    assert.equal(new URL(banner.href).hostname, "www.ibmedu.org");
    assert.ok(!banner.href.includes("/myaccount/"));
  }
});

test("today's schedule uses IST at midnight boundaries and handles empty dates", () => {
  assert.equal(studentToday(new Date("2026-10-25T18:29:59Z")), "2026-10-25");
  assert.equal(studentToday(new Date("2026-10-25T18:30:00Z")), "2026-10-26");
  assert.equal(sessions.filter((session) => session.date === studentToday(new Date("2026-10-26T00:00:00Z"))).length, 1);
  assert.equal(sessions.filter((session) => session.date === studentToday(new Date("2026-10-27T00:00:00Z"))).length, 0);
});

test("student navigation has unique alphabetical labels and valid local destinations", () => {
  const labels = studentNav.map((item) => item.label);
  assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  const hrefs = studentNav.map((item) => studentHref(item.slug));
  assert.equal(new Set(hrefs).size, 12);
  assert.ok(hrefs.includes("/student"));
  assert.ok(hrefs.includes("/student/settings/profile"));
  assert.ok(hrefs.every((href) => href.startsWith("/student")));
});

test("course progress is bounded and sessions reference available sample courses", () => {
  assert.equal(new Set(courses.map((course) => course.slug)).size, courses.length);
  for (const course of courses) {
    assert.ok(course.lessons.length > 0);
    assert.ok(course.completed >= 0 && course.completed <= course.lessons.length);
    assert.ok(progress(course) >= 0 && progress(course) <= 100);
    assert.ok(course.lessons.every((lesson) => lesson.paragraphs.length && lesson.minutes > 0));
  }
  for (const session of sessions) assert.ok(courses.some((course) => course.slug === session.course));
});

test("calendar periods start Monday and contain the selected day", () => {
  for (const date of ["2026-10-26", "2026-11-01", "2026-12-31", "2028-02-29"]) {
    for (const [view, count] of [["day", 1], ["week", 7], ["month", 42]]) {
      const days = calendarDays(date, view);
      assert.equal(days.length, count);
      assert.equal(new Set(days).size, count);
      assert.ok(days.includes(date));
      if (view !== "day") assert.equal(new Date(`${days[0]}T00:00:00Z`).getUTCDay(), 1);
    }
  }
});

test("calendar navigation clamps month ends and handles year and leap boundaries", () => {
  assert.equal(shiftCalendarDate("2026-01-31", "month", 1), "2026-02-28");
  assert.equal(shiftCalendarDate("2028-01-31", "month", 1), "2028-02-29");
  assert.equal(shiftCalendarDate("2026-12-31", "day", 1), "2027-01-01");
  assert.equal(shiftCalendarDate("2026-01-01", "week", -1), "2025-12-25");
  assert.equal(shiftCalendarDate("2026-01-31", "month", -1), "2025-12-31");
});
