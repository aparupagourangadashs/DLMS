import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Role } from "../src/generated/prisma/client";
import { people } from "../src/lib/admin/demo-data";
import { addDays, fromIst, istToday } from "../src/lib/ist";
import { courses as sampleCourses } from "../src/lib/student/demo";
import { testimonialSource, testimonials, websiteVideos } from "../src/lib/website/community";
import { collections, publicBooks, publicCourses } from "../src/lib/website/content";
import { defaultSiteSettings, siteSettingKeys } from "../src/lib/website/site-defaults";
import { hashPassword } from "../src/server/auth/password";
import { createPrismaClient } from "../src/server/prisma-factory";
import { nextRegistrationNo } from "../src/server/services/registration";
import { getStorage, newStorageKey } from "../src/server/storage";

const prisma = createPrismaClient();

const branches = [
  { name: "Head Office – Mumbai", city: "Mumbai" },
  { name: "Pune Centre", city: "Pune" },
  { name: "Online", city: null },
];

async function seedReference() {
  for (const branch of branches) {
    await prisma.branch.upsert({ where: { name: branch.name }, update: {}, create: branch });
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set: skipped Super Admin creation.");
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super Admin ${email} already exists; left unchanged.`);
    return;
  }
  const head = await prisma.branch.findUniqueOrThrow({ where: { name: branches[0].name } });
  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      kind: "STAFF",
      role: "SUPER_ADMIN",
      emailVerifiedAt: new Date(),
      staffProfile: { create: { displayName: "Super Admin", branchId: head.id } },
    },
  });
  console.log(`Created Super Admin ${email}.`);
}

async function seedCatalog() {
  // Snapshot of the public IBMV listing; existing rows are never overwritten so admin edits survive re-seeding.
  const categoryIds = new Map<string, string>();
  for (const [index, item] of collections.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: item.slug },
      update: {},
      create: { slug: item.slug, title: item.title, shortLabel: item.short, description: item.description, color: item.color, sortOrder: index, status: "PUBLISHED" },
    });
    categoryIds.set(item.slug, row.id);
  }

  for (const [index, course] of publicCourses.entries()) {
    await prisma.course.upsert({
      where: { slug: course.slug },
      update: {},
      create: {
        slug: course.slug,
        title: course.title,
        summary: course.summary,
        categoryId: categoryIds.get(course.collection)!,
        language: course.language,
        format: course.mode,
        instructorName: course.instructor,
        duration: course.duration,
        imageUrl: course.image.src,
        imageWidth: course.image.width,
        imageHeight: course.image.height,
        officialUrl: course.officialUrl,
        status: "PUBLISHED",
        publishedAt: new Date(),
        sortOrder: index,
      },
    });
  }

  for (const [index, book] of publicBooks.entries()) {
    if (await prisma.book.findFirst({ where: { title: book.title, language: book.language } })) continue;
    await prisma.book.create({
      data: {
        title: book.title,
        language: book.language,
        publisher: "IBMV",
        imageUrl: book.image,
        sortOrder: index,
        status: "PUBLISHED",
        links: { create: [{ format: "Print", retailer: "IBMV book catalog", url: defaultSiteSettings.links.officialBooks }] },
      },
    });
  }

  for (const [index, item] of testimonials.entries()) {
    if (await prisma.testimonial.findFirst({ where: { name: item.name } })) continue;
    await prisma.testimonial.create({
      data: { name: item.name, imageUrl: item.image, quote: item.excerpt, sourceUrl: testimonialSource, sortOrder: index, status: "PUBLISHED" },
    });
  }

  for (const [index, video] of websiteVideos.entries()) {
    if (await prisma.video.findFirst({ where: { youtubeId: video.id } })) continue;
    await prisma.video.create({
      data: { youtubeId: video.id, speaker: video.speaker, title: video.title, thumbnailUrl: video.image, sortOrder: index, status: "PUBLISHED" },
    });
  }

  for (const key of siteSettingKeys) {
    await prisma.siteSetting.upsert({ where: { key }, update: {}, create: { key, value: defaultSiteSettings[key] as object } });
  }
  console.log(`Catalog ready: ${collections.length} categories, ${publicCourses.length} courses, ${publicBooks.length} books.`);
}

async function seedDemo() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seed must not run in production.");
  const password = process.env.SEED_DEMO_PASSWORD;
  const branchRows = await prisma.branch.findMany();
  const branchByName = new Map(branchRows.map((b) => [b.name, b.id]));
  const branchNames = branches.map((b) => b.name);

  // Staff directory shown on Users > Team. They can sign in only if a demo password is set.
  const staffRoles: Role[] = ["ADMIN", "INSTRUCTOR", "INSTRUCTOR", "CONTENT_EDITOR", "FINANCE", "SUPPORT"];
  const passwordHash = password ? await hashPassword(password) : null;
  const demoStaff = people(10, 132).map((person, i) => ({
    email: `demo.staff${i + 1}@ibmv.local`,
    name: person.name,
    phone: person.phone,
    role: staffRoles[i % staffRoles.length],
    branch: branchNames[i % branchNames.length],
  }));

  for (const staff of demoStaff) {
    await prisma.user.upsert({
      where: { email: staff.email },
      update: {},
      create: {
        email: staff.email,
        phone: staff.phone,
        passwordHash,
        kind: "STAFF",
        role: staff.role,
        emailVerifiedAt: new Date(),
        staffProfile: { create: { displayName: staff.name, branchId: branchByName.get(staff.branch) } },
      },
    });
  }

  const learner = await prisma.user.findUnique({ where: { email: "learner@ibmv.local" } });
  if (!learner) {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          email: "learner@ibmv.local",
          passwordHash,
          kind: "LEARNER",
          role: "LEARNER",
          emailVerifiedAt: new Date(),
          learnerProfile: { create: { name: "Demo Learner", registrationNo: await nextRegistrationNo(tx) } },
        },
      });
    });
  }

  // A directory of fictional learners for Users > Learners. Existing rows are left unchanged.
  const demoStates = ["REGISTERED", "REGISTERED", "REGISTERED", "REGISTERED", "REGISTERED", "ON_LEAVE", "REGISTERED", "ARCHIVED"] as const;
  for (const [i, person] of people(24, 122).entries()) {
    const email = `demo.learner${i + 1}@ibmv.local`;
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) continue;
    const state = demoStates[i % demoStates.length];
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          email,
          phone: person.phone,
          passwordHash,
          kind: "LEARNER",
          role: "LEARNER",
          status: state === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
          emailVerifiedAt: new Date(),
          learnerProfile: {
            create: { name: person.name, city: person.city, status: state, branchId: branchByName.get(branchNames[i % branchNames.length]), registrationNo: await nextRegistrationNo(tx) },
          },
        },
      });
    });
  }

  // Learners created before registration numbers existed get one now.
  const unnumbered = await prisma.learnerProfile.findMany({ where: { registrationNo: null }, orderBy: { createdAt: "asc" } });
  for (const profile of unnumbered) {
    await prisma.$transaction(async (tx) => {
      await tx.learnerProfile.update({ where: { id: profile.id }, data: { registrationNo: await nextRegistrationNo(tx) } });
    });
  }
  console.log(`Demo data ready${password ? " (demo accounts can sign in with SEED_DEMO_PASSWORD)" : " (no SEED_DEMO_PASSWORD: demo accounts cannot sign in)"}.`);
  await seedDemoLearning();
}

// A running batch so both portals have something to show. Sessions are placed relative to the day the seed runs, and topped up when none are left in the future.
async function seedDemoLearning() {
  const course = await prisma.course.findFirst({ where: { status: "PUBLISHED" }, orderBy: { title: "asc" } });
  const admin = await prisma.user.findFirst({ where: { kind: "STAFF", status: "ACTIVE", role: { in: ["SUPER_ADMIN", "ADMIN"] } }, orderBy: { createdAt: "asc" } });
  const teacher = await prisma.user.findUnique({ where: { email: "demo.staff2@ibmv.local" } });
  if (!course || !admin) return;

  const today = istToday();
  const name = "Demo Batch 1";
  const batch =
    (await prisma.batch.findUnique({ where: { name } })) ??
    (await prisma.batch.create({
      data: { name, courseId: course.id, startDate: new Date(`${addDays(today, -7)}T00:00:00Z`), endDate: new Date(`${addDays(today, 120)}T00:00:00Z`), instructorId: teacher?.id ?? admin.id, managerId: admin.id },
    }));

  if ((await prisma.session.count({ where: { batchId: batch.id, startsAt: { gte: new Date() } } })) === 0) {
    const topics = ["Introduction and expectations", "Reading with attention", "Questions and reflections", "Review and next steps"];
    await prisma.session.createMany({
      data: [0, 1, 3, 7].map((offset, i) => {
        const startsAt = fromIst(addDays(today, offset), "19:00");
        return { batchId: batch.id, title: `Demo class ${i + 1}`, startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000), joinUrl: "https://meet.example.org/ibmv-demo", topics: topics[i], instructorId: batch.instructorId };
      }),
    });
  }

  // Original sample lessons from the student previews, so the course player has something to show in development.
  const moduleIds: string[] = [];
  for (const [index, sample] of sampleCourses.slice(0, 2).entries()) {
    const name = `${sample.title} (demo)`;
    const existing = await prisma.module.findUnique({ where: { name }, select: { id: true } });
    const record =
      existing ??
      (await prisma.module.create({
        data: {
          name,
          description: sample.description,
          status: "PUBLISHED",
          contents: {
            create: [
              ...sample.lessons.map((lesson, order) => ({ type: "TEXT" as const, title: lesson.title, minutes: lesson.minutes, body: lesson.paragraphs.join("\n\n"), sortOrder: order })),
              ...(index === 0 ? [{ type: "LINK" as const, title: "Explore more courses on the IBMV website", minutes: 5, url: "https://www.ibmedu.org/", sortOrder: sample.lessons.length }] : []),
            ],
          },
        },
        select: { id: true },
      }));
    moduleIds.push(record.id);
  }
  await prisma.courseModule.createMany({ data: moduleIds.map((moduleId, sortOrder) => ({ courseId: course.id, moduleId, sortOrder })), skipDuplicates: true });

  const learners = await prisma.user.findMany({
    where: { email: { in: ["learner@ibmv.local", "demo.learner1@ibmv.local", "demo.learner2@ibmv.local", "demo.learner3@ibmv.local"] }, status: "ACTIVE" },
    select: { id: true },
  });
  for (const { id } of learners) {
    if (await prisma.enrolment.findFirst({ where: { userId: id, courseId: course.id, status: "ACTIVE" }, select: { id: true } })) continue;
    await prisma.enrolment.create({ data: { userId: id, courseId: course.id, batchId: batch.id, source: "ADMIN", createdById: admin.id } });
  }

  const notices = [
    { title: "Welcome to Demo Batch 1", body: "Your first class is on the calendar. Join from the link that appears 15 minutes before it starts, and bring one question for the group.", urgency: "HIGH", audience: "BATCH", tags: ["General", "Schedule"] },
    { title: "Making the most of your learning space", body: "Check the calendar for upcoming classes and the announcements page for notices from your teachers.", urgency: "LOW", audience: "ALL", tags: ["General"] },
  ] as const;
  for (const notice of notices) {
    if (await prisma.announcement.findFirst({ where: { title: notice.title }, select: { id: true } })) continue;
    await prisma.announcement.create({
      data: {
        title: notice.title,
        body: notice.body,
        urgency: notice.urgency,
        audience: notice.audience,
        tags: [...notice.tags],
        publishAt: new Date(Date.now() - 86_400_000),
        status: "PUBLISHED",
        createdById: admin.id,
        ...(notice.audience === "BATCH" ? { batches: { create: { batchId: batch.id } } } : {}),
      },
    });
  }
  console.log("Demo learning data ready: Demo Batch 1 with sessions, enrolments and announcements.");
}

/** The two launch artworks that were fixed on the website and student home, now editable banners. Existing banners are never replaced. */
async function seedBanners() {
  if ((await prisma.banner.count()) > 0) return;
  const artwork = async (file: string, name: string) => {
    const bytes = fs.readFileSync(path.join(process.cwd(), "public", file));
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    let key = (await prisma.asset.findFirst({ where: { sha256, storageKey: { not: null } }, select: { storageKey: true } }))?.storageKey ?? null;
    if (!key) {
      key = newStorageKey();
      await getStorage().put(key, bytes);
    }
    return prisma.asset.create({ data: { type: "IMAGE", name, status: "READY", fileName: file, storageKey: key, mimeType: "image/jpeg", sizeBytes: bytes.length, sha256 } });
  };
  const launch = await artwork("student-course-launch.jpg", "Bhakti Vedanta Module 3 launch banner");
  const shastri = await artwork("student-bhakti-shastri.jpg", "Bhakti Shastri (English) artwork");
  const module3 = "https://www.ibmedu.org/course-details/BhaktiVedantaModule-3-115238";
  await prisma.banner.createMany({
    data: [
      {
        name: "Bhakti Vedanta Module 3", imageAssetId: launch.id, placement: "WEBSITE_HOME", status: "PUBLISHED", sortOrder: 0, linkUrl: module3,
        description: "Explore the Eleventh and Twelfth Cantos of Srimad-Bhagavatam in Bhakti Vedanta Module 3. Visit the official course page for the schedule, eligibility and enrollment details.",
      },
      {
        name: "Bhakti Vedanta Module 3. 2 November 2026 to 12 May 2027, 7\u20139 PM IST, Monday\u2013Thursday", imageAssetId: launch.id, placement: "STUDENT_HOME", status: "PUBLISHED", sortOrder: 0, linkUrl: module3,
        description: "2 Nov 2026 \u2013 12 May 2027 \u00b7 7\u20139 PM IST \u00b7 Monday\u2013Thursday",
      },
      {
        name: "Bhakti Shastri (English) course artwork depicting Krishna teaching Arjuna", imageAssetId: shastri.id, placement: "STUDENT_HOME", status: "PUBLISHED", sortOrder: 1, linkUrl: "https://www.ibmedu.org/",
        description: "Explore Bhakti Shastri study opportunities through the official IBMV website.",
      },
    ],
  });
  console.log("Banners ready: 1 for the website home, 2 for the student home.");
}

async function main() {
  await seedReference();
  await seedCatalog();
  await seedBanners();
  if (process.env.SEED_DEMO !== "0") await seedDemo();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
