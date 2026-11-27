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

async function seedB3b() {
  const fields = [
    { entity: "LEARNER" as const, placement: "SIGNUP" as const, label: "Preferred language", type: "Dropdown", required: true, options: ["English", "Hindi"], sortOrder: 0 },
    { entity: "LEARNER" as const, placement: "OFFLINE_ADMISSION" as const, label: "Spiritual name", type: "Text", required: false, options: undefined, sortOrder: 0 },
  ];
  for (const field of fields) {
    await prisma.customField.upsert({
      where: { entity_placement_label: { entity: field.entity, placement: field.placement, label: field.label } },
      update: {},
      create: field,
    });
  }

  if (!(await prisma.segment.findUnique({ where: { name: "Active learners" } }))) {
    const active = await prisma.segment.create({
      data: { name: "Active learners", type: "DYNAMIC", rules: { status: "REGISTERED", branchId: "", courseId: "" } },
    });
    const members = await prisma.user.findMany({ where: { kind: "LEARNER", status: "ACTIVE" }, select: { id: true }, take: 100 });
    if (members.length) await prisma.segmentMember.createMany({ data: members.map((member) => ({ segmentId: active.id, userId: member.id })), skipDuplicates: true });
  }
  console.log("B3b data ready: learner custom fields and the Active learners segment.");
}

async function seedB5() {
  const planSpecs = [
    { name: "Monthly Learner", description: "Monthly access to member-only learning updates.", priceMinor: 99900, interval: "MONTHLY" as const, benefits: ["Member community updates", "Priority support"] },
    { name: "Annual Learner", description: "A full year of member learning access.", priceMinor: 799900, interval: "YEARLY" as const, benefits: ["Member learning updates", "Priority support", "Annual programme offer"] },
  ];
  for (const [index, plan] of planSpecs.entries()) {
    await prisma.membershipPlan.upsert({
      where: { name: plan.name },
      update: {},
      create: { ...plan, status: "PUBLISHED", sortOrder: index },
    });
  }
  const learner = await prisma.learnerProfile.findFirst({ where: { user: { email: "learner@ibmv.local" } } });
  if (learner) {
    await prisma.referralCode.upsert({
      where: { learnerId: learner.id },
      update: {},
      create: { learnerId: learner.id, code: `IBMV-${learner.registrationNo?.replace(/[^A-Za-z0-9]/g, "").slice(-6) || "LEARN"}` },
    });
  }
  console.log("B5 data ready: 2 membership plans and learner referral code.");
}

async function seedB7() {
  const communitySpecs = [
    { name: "Study Circle", description: "A welcoming space for thoughtful questions and shared reflections.", layout: "MESSAGE" as const },
    { name: "Reading Room", description: "Reading habits, study prompts and a little encouragement.", layout: "FEED" as const },
  ];
  for (const [index, spec] of communitySpecs.entries()) {
    const community = await prisma.community.upsert({
      where: { name: spec.name },
      update: {},
      create: { ...spec, sortOrder: index },
    });
    const learner = await prisma.user.findUnique({ where: { email: "learner@ibmv.local" } });
    if (learner) {
      await prisma.communityMember.upsert({
        where: { communityId_userId: { communityId: community.id, userId: learner.id } },
        update: {},
        create: { communityId: community.id, userId: learner.id, role: "MEMBER" },
      });
      if (index === 0 && !(await prisma.communityPost.findFirst({ where: { communityId: community.id }, select: { id: true } }))) {
        await prisma.communityPost.create({
          data: {
            communityId: community.id,
            authorId: learner.id,
            body: "Welcome to the Study Circle. Introduce one thoughtful question for our next discussion.",
            pinned: true,
          },
        });
      }
    }
  }

  const templates = [
    { channel: "EMAIL" as const, name: "Course invitation", subject: "Explore your next course", body: "Hello {{learner_name}}, explore {{course_name}} with IBMV.", replyTo: "learning@example.com", unsubscribeText: "Unsubscribe from promotional emails" },
    { channel: "SMS" as const, name: "Session reminder", body: "Hello {{learner_name}}, your session starts soon." },
  ];
  for (const template of templates) {
    await prisma.messageTemplate.upsert({
      where: { channel_name: { channel: template.channel, name: template.name } },
      update: {},
      create: template,
    });
  }

  for (const channel of ["WHATSAPP", "SMS", "EMAIL", "AI"] as const) {
    await prisma.walletAccount.upsert({ where: { channel }, update: {}, create: { channel, balance: 0 } });
  }
  console.log("B7 data ready: 2 communities, 2 console templates and 4 wallet accounts.");
}

async function seedB6() {
  const grades = [
    { name: "A+", minPercent: 90, maxPercent: 100, remark: "Distinction", sortOrder: 0 },
    { name: "A", minPercent: 75, maxPercent: 89, remark: "First class", sortOrder: 1 },
    { name: "B", minPercent: 60, maxPercent: 74, remark: "Second class", sortOrder: 2 },
    { name: "C", minPercent: 40, maxPercent: 59, remark: "Pass", sortOrder: 3 },
    { name: "Not passed", minPercent: 0, maxPercent: 39, remark: "Retake required", sortOrder: 4 },
  ];
  for (const grade of grades) {
    const existing = await prisma.gradeBand.findFirst({ where: { name: grade.name }, select: { id: true } });
    if (existing) await prisma.gradeBand.update({ where: { id: existing.id }, data: grade });
    else await prisma.gradeBand.create({ data: grade });
  }

  const bankSpecs = [
    {
      code: "QB-1040",
      name: "Gita Chapter 2 MCQs",
      difficulty: "Medium",
      exam: "Bhakti Shastri Final",
      subject: "Bhagavad Gita",
      topic: "Verses",
      description: "Synthetic Chapter 2 multiple-choice questions for the demo learner.",
      question: {
        prompt: "According to Bhagavad-gita 2.47, what action is in our control?",
        options: ["The fruit of action", "Both action and the fruit", "The right to perform prescribed action", "The outcome of every action"],
        answer: { option: 2 },
        explanation: "The verse directs us to focus on action and not become attached to results.",
      },
    },
    {
      code: "QB-1041",
      name: "Sanskrit Grammar Basics",
      difficulty: "Easy",
      exam: "Weekly Quiz",
      subject: "Sanskrit",
      topic: "Grammar",
      description: "Synthetic introductory Sanskrit grammar questions.",
      question: {
        prompt: "What is the correct meaning of 'namaste'?",
        options: ["I salute you", "Good morning", "See you later", "Thank you"],
        answer: { option: 0 },
        explanation: "Namaste is a respectful greeting meaning salutations or I bow to you.",
      },
    },
  ];
  for (const spec of bankSpecs) {
    let bank = await prisma.questionBank.findUnique({ where: { code: spec.code } });
    if (!bank) {
      bank = await prisma.questionBank.create({
        data: {
          code: spec.code,
          name: spec.name,
          difficulty: spec.difficulty,
          exam: spec.exam,
          subject: spec.subject,
          topic: spec.topic,
          description: spec.description,
          status: "PUBLISHED",
          questions: {
            create: {
              type: "MCQ",
              prompt: spec.question.prompt,
              options: spec.question.options,
              answer: spec.question.answer,
              marks: 1,
              explanation: spec.question.explanation,
              sortOrder: 0,
            },
          },
        },
      });
    }
  }

  const course = await prisma.course.findFirst({ where: { status: "PUBLISHED" }, orderBy: { title: "asc" } });
  const bank = await prisma.questionBank.findUnique({ where: { code: "QB-1040" } });
  if (course && bank && !(await prisma.assessment.findFirst({ where: { name: "Chapter 2 knowledge check" }, select: { id: true } }))) {
    await prisma.assessment.create({
      data: {
        name: "Chapter 2 knowledge check",
        kind: "EXAM",
        status: "PUBLISHED",
        maxAttempts: 3,
        durationMinutes: 15,
        totalMarks: 1,
        passPercent: 60,
        bankId: bank.id,
        instructions: "Choose one answer. This synthetic check is for development and verification only.",
        courses: { create: { courseId: course.id } },
      },
    });
  }
  if (!(await prisma.certificateTemplate.findFirst({ where: { serialPrefix: "IBMV" }, select: { id: true } }))) {
    await prisma.certificateTemplate.create({
      data: {
        name: "Demo course completion certificate",
        serialPrefix: "IBMV",
        description: "Synthetic certificate used to verify the B6 issue and verification flows.",
        status: "ACTIVE",
        expiryRule: "LIFETIME",
        designSource: "BUILDER",
        layout: "LANDSCAPE",
        heading: "Certificate of completion",
        body: "Awarded to {{learner}} for completing {{course}}.",
        automation: "MANUAL",
        threshold: 100,
      },
    });
  }
  console.log("B6 data ready: 5 grade bands, 2 question banks and 1 demo exam.");
}

async function main() {
  await seedReference();
  await seedCatalog();
  await seedBanners();
  if (process.env.SEED_DEMO !== "0") await seedDemo();
  await seedB3b();
  await seedB5();
  await seedB7();
  await seedB6();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
