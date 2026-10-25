import type { ListConfig, Row } from "./types";
import { formatDate } from "@/lib/format";
import {
  DEMO_TODAY,
  addDays,
  at,
  batches,
  cities,
  courses,
  helpers,
  instructors,
  people,
} from "./demo-data";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function rows<T extends Omit<Row, "id">>(count: number, make: (i: number) => T): Row[] {
  return Array.from({ length: count }, (_, i) => ({ id: String(i + 1), ...make(i) }) as Row);
}

const configs: Record<string, () => ListConfig> = {
  "products/events": () => {
    const { pick, int } = helpers(11);
    const names = ["Kartik Deepotsav Workshop", "Gita Jayanti Quiz", "Youth Bhakti Retreat", "Sanskrit Shloka Contest", "Parents' Satsang", "Janmashtami Online Festival", "Book Distribution Training", "Kirtan Evening"];
    return {
      title: "Events",
      description: "Create and manage events, their visibility and status.",
      entityName: "event",
      primaryAction: "Create Event",
      showIndex: true,
      searchKeys: ["name"],
      searchPlaceholder: "Search events",
      filters: [{ key: "visibility", label: "Visibility", options: ["Public", "Private", "Unlisted"] }],
      tabs: { key: "status", items: [{ label: "All" }, { label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }] },
      columns: [
        { key: "name", label: "Event name", type: "primary", subKey: "venue", sortable: true },
        { key: "date", label: "Event date", type: "datetime", sortable: true },
        { key: "visibility", label: "Visibility", type: "badge", tones: { Public: "info", Private: "neutral", Unlisted: "gold" } },
        { key: "status", label: "Status", type: "badge" },
      ],
      rows: rows(names.length, (i) => ({
        name: names[i],
        venue: pick(["Online (Zoom)", "Online (YouTube Live)", "IBMV Campus, Mumbai", "Hybrid"]),
        date: at(addDays(DEMO_TODAY, int(-20, 45)), pick(["10:00", "17:30", "19:00"])),
        visibility: pick(["Public", "Public", "Private", "Unlisted"]),
        status: i % 4 === 3 ? "Inactive" : "Active",
      })),
      form: {
        fields: [
          { key: "name", label: "Event name", type: "text", required: true },
          { key: "date", label: "Event date and time", type: "datetime-local", required: true, help: "Times are in India Standard Time (IST)." },
          { key: "venue", label: "Venue or link type", type: "text", placeholder: "Online (Zoom)" },
          { key: "visibility", label: "Visibility", type: "select", options: ["Public", "Private", "Unlisted"], required: true },
        ],
        defaults: { status: "Active" },
      },
      rowActions: ["edit", "duplicate", "delete"],
    };
  },

  "learning/batches": () => {
    const { pick, int } = helpers(21);
    return {
      title: "Batches",
      description: "Course batches with instructors, managers and progress.",
      entityName: "batch",
      primaryAction: "Create Batch",
      showIndex: true,
      configurableColumns: true,
      searchKeys: ["name", "course"],
      searchPlaceholder: "Search batches",
      tabs: { key: "status", items: [{ label: "Active", value: "Active" }, { label: "Completed", value: "Completed" }, { label: "Archived", value: "Archived" }, { label: "All" }] },
      filters: [
        { key: "course", label: "Course", options: [...courses] },
        { key: "instructor", label: "Instructor", options: [...instructors] },
      ],
      columns: [
        { key: "name", label: "Batch name", type: "primary", sortable: true },
        { key: "course", label: "Course", sortable: true },
        { key: "duration", label: "Duration" },
        { key: "instructor", label: "Module & instructor", type: "primary", subKey: "module" },
        { key: "manager", label: "Batch manager" },
        { key: "progress", label: "Batch progress", type: "progress", sortable: true },
        { key: "status", label: "Status", type: "badge", hidden: true },
      ],
      rows: rows(batches.length, (i) => {
        const b = batches[i];
        const start = addDays(DEMO_TODAY, int(-150, 20));
        const status = i % 7 === 6 ? "Archived" : i % 4 === 3 ? "Completed" : "Active";
        return {
          name: b.name,
          course: b.course,
          duration: `${formatDate(start)} – ${formatDate(addDays(start, 120))}`,
          instructor: b.instructor,
          module: `Module ${int(1, 6)} of 8`,
          manager: pick(["Hari Prasad", "Vrinda Joshi", "Mukund Rao"]),
          progress: status === "Completed" || status === "Archived" ? 100 : int(5, 92),
          status,
        };
      }),
      form: {
        fields: [
          { key: "name", label: "Batch name", type: "text", required: true, placeholder: "BGFC-2026-B3" },
          { key: "course", label: "Course", type: "select", options: [...courses], required: true },
          { key: "instructor", label: "Instructor", type: "select", options: [...instructors], required: true },
          { key: "manager", label: "Batch manager", type: "text" },
          { key: "duration", label: "Duration", type: "select", options: ["8 weeks", "12 weeks", "16 weeks", "6 months", "1 year"], required: true },
        ],
        defaults: { status: "Active", progress: 0, module: "Module 1 of 8" },
      },
      rowActions: ["edit", "duplicate", "archive"],
    };
  },

  "learning/announcements": () => {
    const { pick, int } = helpers(31);
    const titles = ["Class rescheduled to Sunday", "Kartik month special sessions", "Assignment 3 deadline extended", "Holiday on Diwali", "New recordings uploaded", "Exam guidelines published", "Welcome to the new batch", "Zoom link updated", "Certificate distribution", "Feedback form for Module 2"];
    return {
      title: "Announcements",
      description: "Share notices with learners. Urgency controls how prominently they appear.",
      entityName: "announcement",
      primaryAction: "New Announcement",
      showIndex: true,
      searchKeys: ["name"],
      searchPlaceholder: "Search by name",
      dateFilterKey: "date",
      filters: [{ key: "tags", label: "Tag", options: ["General", "Schedule", "Exams", "Holiday", "Recordings"] }],
      columns: [
        { key: "date", label: "Date & time", type: "datetime", sortable: true },
        { key: "name", label: "Name", type: "primary", subKey: "audience" },
        { key: "urgency", label: "Urgency", type: "badge" },
        { key: "tags", label: "Tags", type: "tags" },
      ],
      rows: rows(titles.length, (i) => ({
        date: at(addDays(DEMO_TODAY, -int(0, 40)), pick(["09:00", "12:30", "18:45"])),
        name: titles[i],
        audience: pick(["All learners", ...batches.slice(0, 5).map((b) => b.name)]),
        urgency: pick(["High", "Medium", "Low", "Low"]),
        tags: [pick(["General", "Schedule", "Exams", "Holiday", "Recordings"])],
      })),
      form: {
        fields: [
          { key: "name", label: "Title", type: "text", required: true },
          { key: "audience", label: "Audience", type: "select", options: ["All learners", ...batches.map((b) => b.name)], required: true },
          { key: "urgency", label: "Urgency", type: "select", options: ["High", "Medium", "Low"], required: true },
          { key: "date", label: "Publish at", type: "datetime-local", required: true, help: "Schedule for later or choose the current time." },
          { key: "message", label: "Message", type: "textarea", required: true },
        ],
        defaults: { tags: ["General"] },
      },
      rowActions: ["edit", "delete"],
    };
  },

  "learning/feedback-forms": () => {
    const { int, pick } = helpers(41);
    const names = ["Module 1 feedback", "Teacher rating – Gita course", "Event satisfaction survey", "Course completion survey", "Kids club parent feedback", "Live class audio/video quality"];
    return {
      title: "Feedback Forms",
      description: "Build forms to collect feedback and ratings from learners.",
      entityName: "form",
      primaryAction: "Create New Form",
      showIndex: true,
      searchKeys: ["name"],
      columns: [
        { key: "name", label: "Form name", type: "primary" },
        { key: "createdOn", label: "Created on", type: "date", sortable: true },
        { key: "type", label: "Type", type: "badge", tones: { Rating: "gold", Survey: "info", Quiz: "accent" } },
        { key: "conversions", label: "Conversions", type: "number", sortable: true },
      ],
      rows: rows(names.length, (i) => ({
        name: names[i],
        createdOn: addDays(DEMO_TODAY, -int(3, 120)),
        type: pick(["Rating", "Survey", "Survey"]),
        conversions: int(12, 640),
      })),
      form: {
        fields: [
          { key: "name", label: "Form name", type: "text", required: true },
          { key: "type", label: "Type", type: "select", options: ["Rating", "Survey"], required: true },
        ],
        defaults: { createdOn: DEMO_TODAY, conversions: 0 },
      },
      rowActions: ["edit", "duplicate", "delete"],
    };
  },

  "learning/module-library": () => {
    const { int } = helpers(51);
    const names = ["Introduction to the Gita", "Karma Yoga", "Jnana Yoga", "Bhakti Yoga", "Sanskrit Alphabet", "Sandhi Rules", "Stories for Children", "Parenting with Values", "Canto 1 – Chapters 1–5", "Nectar of Devotion – Part 1"];
    return {
      title: "Module Library",
      description: "Reusable modules that can be added to any course or batch.",
      entityName: "module",
      primaryAction: "Add Module",
      searchKeys: ["name"],
      searchPlaceholder: "Search modules",
      tabs: { key: "_all", items: [{ label: "All" }] },
      columns: [
        { key: "name", label: "Module name", type: "primary", subKey: "usedIn" },
        { key: "content", label: "Content" },
      ],
      rows: rows(names.length, (i) => ({
        name: names[i],
        usedIn: `Used in ${int(1, 4)} course(s)`,
        content: `${int(3, 14)} lessons · ${int(1, 6)} PDFs · ${int(0, 3)} quizzes`,
      })),
      form: {
        fields: [
          { key: "name", label: "Module name", type: "text", required: true },
          { key: "description", label: "Description", type: "textarea" },
        ],
        defaults: { usedIn: "Not used yet", content: "0 lessons" },
      },
      rowActions: ["edit", "duplicate", "delete"],
    };
  },

  "learning/question-bank": () => {
    const { pick } = helpers(61);
    const names = ["Gita Chapter 2 MCQs", "Sanskrit Grammar Basics", "Bhakti Shastri – NOD", "Isopanishad Verses", "Bhagavatam Canto 1 Quiz", "Kids Gita Stories Quiz", "Vaishnava Etiquette"];
    return {
      title: "Question Bank",
      description: "Question banks organised by exam, subject and topic.",
      entityName: "question bank",
      primaryAction: "New Question Bank",
      showIndex: true,
      searchKeys: ["name", "subject", "topic"],
      tabs: { key: "_all", items: [{ label: "All" }] },
      filters: [{ key: "difficulty", label: "Difficulty", options: ["Easy", "Medium", "Hard"] }],
      columns: [
        { key: "code", label: "ID" },
        { key: "name", label: "Name", type: "primary" },
        { key: "difficulty", label: "Difficulty", type: "badge", tones: { Easy: "success", Medium: "warning", Hard: "danger" } },
        { key: "exam", label: "Exam" },
        { key: "subject", label: "Subject" },
        { key: "topic", label: "Topic" },
      ],
      rows: rows(names.length, (i) => ({
        code: `QB-${1040 + i}`,
        name: names[i],
        difficulty: pick(["Easy", "Medium", "Hard"]),
        exam: pick(["Bhakti Shastri Final", "Module Test", "Weekly Quiz"]),
        subject: pick(["Bhagavad Gita", "Sanskrit", "Srimad Bhagavatam", "Nectar of Devotion"]),
        topic: pick(["Verses", "Philosophy", "Grammar", "Stories"]),
      })),
      form: {
        fields: [
          { key: "name", label: "Name", type: "text", required: true },
          { key: "difficulty", label: "Difficulty", type: "select", options: ["Easy", "Medium", "Hard"], required: true },
          { key: "exam", label: "Exam", type: "text" },
          { key: "subject", label: "Subject", type: "text", required: true },
          { key: "topic", label: "Topic", type: "text" },
        ],
        defaults: { code: "QB-NEW" },
      },
      rowActions: ["edit", "duplicate", "delete"],
    };
  },

  "learning/asset-library": (): ListConfig => {
    const { int, pick } = helpers(71);
    const types = ["Video", "Audio", "PDF", "YouTube", "Image", "Doc", "Sheet", "Slide", "Text/HTML", "Zip", "SCORM Zip", "Link/Embed", "Epub"];
    const data = rows(24, (i) => {
      const type = pick(["Video", "Video", "PDF", "PDF", "Audio", "YouTube", "Image", "Slide", "Doc"]);
      const size = type === "Video" ? int(180, 1400) : type === "YouTube" ? 0 : int(1, 40);
      return {
        name: `${pick(["Lecture", "Notes", "Recitation", "Worksheet", "Slides", "Reading"])} ${i + 1} – ${pick(courses)}`,
        fileName: type === "YouTube" ? "youtube.com/watch" : `asset_${1000 + i}.${{ Video: "mp4", PDF: "pdf", Audio: "mp3", Image: "jpg", Slide: "pptx", Doc: "docx" }[type] ?? "bin"}`,
        uploadedBy: pick(instructors),
        uploadedOn: addDays(DEMO_TODAY, -int(1, 200)),
        size,
        sizeLabel: size === 0 ? "—" : `${size} MB`,
        type,
        usage: i % 6 === 5 ? "Unused" : "Used",
        downloads: int(0, 900),
      };
    });
    return {
      title: "Asset Library",
      description: "All learning assets in one place, with usage and storage at a glance.",
      entityName: "asset",
      primaryAction: "Add Asset",
      showIndex: true,
      searchKeys: ["name", "fileName"],
      searchPlaceholder: "Search assets",
      summary: [
        { label: "Total assets", value: String(data.length) },
        { label: "Storage used", value: "7.8 GB", hint: "of 50 GB" },
        { label: "Unused assets", value: String(data.filter((r) => r.usage === "Unused").length), tone: "warning" },
        { label: "Storage saved", value: "1.2 GB", hint: "via de-duplication", tone: "success" },
        { label: "Largest asset", value: "1.4 GB", hint: "Lecture video" },
      ],
      filters: [
        { key: "usage", label: "Usage", options: ["Used", "Unused"] },
        { key: "type", label: "Asset type", options: types },
      ],
      columns: [
        { key: "name", label: "Asset name", type: "primary", subKey: "fileName" },
        { key: "uploadedBy", label: "Uploaded by" },
        { key: "uploadedOn", label: "Uploaded on", type: "date", sortable: true },
        { key: "sizeLabel", label: "Size" },
        { key: "type", label: "Asset type", type: "badge", tones: { Video: "accent", PDF: "danger", Audio: "info", YouTube: "danger", Image: "gold" } },
        { key: "usage", label: "Usage", type: "badge", tones: { Used: "success", Unused: "warning" } },
        { key: "downloads", label: "Downloads", type: "number", sortable: true },
      ],
      rows: data,
      form: {
        fields: [
          { key: "type", label: "Asset type", type: "select", options: types, required: true },
          { key: "name", label: "Asset name", type: "text", required: true },
          { key: "fileName", label: "File name or link", type: "text", required: true, help: "File upload will connect to media storage in the backend phase." },
        ],
        defaults: { uploadedBy: "Demo Admin", uploadedOn: DEMO_TODAY, sizeLabel: "—", usage: "Unused", downloads: 0 },
      },
      rowActions: ["edit", "delete"],
    };
  },

  "learning/assessments": () => {
    const { int, pick } = helpers(81);
    const names = ["Gita Chapter 1–3 Assignment", "Sanskrit Writing Practice", "Bhakti Shastri Mid-term", "Kids Story Drawing", "Canto 1 Essay", "Weekly Verse Recitation", "Final Project – Parenting"];
    return {
      title: "Assessments",
      description: "Assignment-based and custom-link assessments linked to courses.",
      entityName: "assessment",
      primaryAction: "Add Assessment",
      showIndex: true,
      searchKeys: ["name"],
      tabs: { key: "kind", items: [{ label: "Assignment Based", value: "Assignment" }, { label: "Custom Link", value: "Custom link" }, { label: "All" }] },
      columns: [
        { key: "name", label: "Assessment name", type: "primary", subKey: "kind" },
        { key: "courses", label: "Linked courses", type: "tags" },
        { key: "price", label: "Price", type: "currency", sortable: true },
        { key: "attempts", label: "Total attempts", type: "number", sortable: true },
        { key: "unique", label: "Unique attempts", type: "number" },
        { key: "registered", label: "Registered", type: "number" },
      ],
      rows: rows(names.length, (i) => {
        const attempts = int(20, 400);
        return {
          name: names[i],
          kind: i % 3 === 2 ? "Custom link" : "Assignment",
          courses: [pick(courses)],
          price: pick([0, 0, 199, 499]),
          attempts,
          unique: Math.round(attempts * 0.8),
          registered: attempts + int(5, 60),
        };
      }),
      form: {
        fields: [
          { key: "name", label: "Assessment name", type: "text", required: true },
          { key: "kind", label: "Type", type: "select", options: ["Assignment", "Custom link"], required: true },
          { key: "price", label: "Price (₹)", type: "number", placeholder: "0 for free" },
        ],
        defaults: { courses: [], attempts: 0, unique: 0, registered: 0 },
      },
      rowActions: ["edit", "duplicate", "delete"],
    };
  },

  "learning/submissions": () => {
    const { int, pick } = helpers(91);
    const learners = people(30, 92);
    return {
      title: "Submissions",
      description: "Review learner submissions and record marks.",
      entityName: "submission",
      searchKeys: ["learner", "email"],
      searchPlaceholder: "Search learner name or email",
      dateFilterKey: "submittedOn",
      tabs: { key: "evaluation", items: [{ label: "Not Evaluated", value: "Not evaluated" }, { label: "Evaluated", value: "Evaluated" }, { label: "All" }] },
      filters: [{ key: "batch", label: "Batch", options: batches.map((b) => b.name) }],
      configurableColumns: true,
      columns: [
        { key: "learner", label: "Learner name", type: "primary", subKey: "email" },
        { key: "assessment", label: "Assessment name" },
        { key: "evaluation", label: "Evaluation status", type: "badge" },
        { key: "submittedOn", label: "Submission date", type: "date", sortable: true },
        { key: "timeliness", label: "Timeliness", type: "badge", tones: { "On time": "success", Late: "danger" } },
        { key: "kind", label: "Assessment type", hidden: true },
        { key: "marks", label: "Marks obtained", type: "number" },
        { key: "total", label: "Total marks", type: "number" },
        { key: "percentage", label: "Percentage", type: "percent", sortable: true },
        { key: "product", label: "Product name", hidden: true },
        { key: "batch", label: "Batch name" },
      ],
      rows: rows(learners.length, (i) => {
        const evaluated = i % 3 !== 0;
        const total = pick([20, 50, 100]);
        const marks = evaluated ? int(Math.round(total * 0.4), total) : null;
        const b = pick(batches);
        return {
          learner: learners[i].name,
          email: learners[i].email,
          assessment: pick(["Gita Chapter 1–3 Assignment", "Sanskrit Writing Practice", "Canto 1 Essay"]),
          evaluation: evaluated ? "Evaluated" : "Not evaluated",
          submittedOn: addDays(DEMO_TODAY, -int(0, 30)),
          timeliness: i % 5 === 4 ? "Late" : "On time",
          kind: "Assignment",
          marks,
          total,
          percentage: marks === null ? null : Math.round((marks / total) * 100),
          product: b.course,
          batch: b.name,
        };
      }),
      rowActions: ["review"],
    };
  },

  "learning/session-recordings": () => {
    const { int, pick } = helpers(101);
    return {
      title: "Session Recordings",
      description: "Recordings of live classes, grouped by batch.",
      entityName: "recording",
      selectable: true,
      showIndex: true,
      searchKeys: ["name"],
      searchPlaceholder: "Search recordings",
      dateFilterKey: "date",
      tabs: { key: "batchStatus", items: [{ label: "Active Batches", value: "Active" }, { label: "Completed Batches", value: "Completed" }, { label: "Archived Batches", value: "Archived" }] },
      filters: [{ key: "batch", label: "Batch", options: batches.map((b) => b.name) }],
      columns: [
        { key: "name", label: "Class name", type: "primary", subKey: "date" },
        { key: "batch", label: "Batches" },
        { key: "instructor", label: "Instructor" },
        { key: "status", label: "Status", type: "badge", tones: { Available: "success", Processing: "warning", Failed: "danger" } },
      ],
      rows: rows(22, (i) => {
        const b = pick(batches);
        return {
          name: `${b.course.split(" – ")[0]} – Class ${int(1, 30)}`,
          date: addDays(DEMO_TODAY, -int(0, 60)),
          batch: b.name,
          instructor: b.instructor,
          status: i % 9 === 8 ? "Processing" : "Available",
          batchStatus: i % 6 === 5 ? "Completed" : i % 11 === 10 ? "Archived" : "Active",
        };
      }),
      rowActions: ["view", "delete"],
    };
  },

  "learning/certificates": () => {
    const { int } = helpers(111);
    return {
      title: "Certificates",
      description: "Certificate templates and the rules for issuing them.",
      entityName: "certificate",
      primaryAction: "New Certificate",
      searchKeys: ["name"],
      columns: [
        { key: "name", label: "Certificate name", type: "primary", subKey: "rule" },
        { key: "course", label: "Linked course" },
        { key: "issued", label: "Issued", type: "number", sortable: true },
        { key: "validity", label: "Validity" },
        { key: "status", label: "Status", type: "badge" },
      ],
      rows: rows(6, (i) => ({
        name: `${courses[i]} – Certificate of Completion`,
        rule: "Issued when progress reaches 100% and final exam ≥ 60%",
        course: courses[i],
        issued: int(0, 420),
        validity: i % 3 === 0 ? "2 years" : "Lifetime",
        status: i === 5 ? "Draft" : "Active",
      })),
      form: {
        fields: [
          { key: "name", label: "Certificate name", type: "text", required: true },
          { key: "course", label: "Linked course", type: "select", options: [...courses], required: true },
          { key: "validity", label: "Validity", type: "select", options: ["Lifetime", "1 year", "2 years"], required: true },
          { key: "rule", label: "Issuance rule", type: "textarea", placeholder: "e.g. 100% progress and final exam ≥ 60%" },
        ],
        defaults: { issued: 0, status: "Draft" },
      },
      rowActions: ["edit", "duplicate", "delete"],
    };
  },

  "users/learners": () => {
    const { int, pick } = helpers(121);
    const list = people(48, 122);
    return {
      title: "Learners",
      description: "Everyone registered on the platform, with enrolment status.",
      entityName: "learner",
      primaryAction: "Add Learner(s)",
      selectable: true,
      exportable: true,
      configurableColumns: true,
      searchKeys: ["name", "email", "phone", "regNo"],
      searchPlaceholder: "Search name, email, phone or reg. no.",
      dateFilterKey: "addedOn",
      tabs: { key: "status", items: [{ label: "All" }, { label: "Registered", value: "Registered" }, { label: "Enrolled", value: "Enrolled" }, { label: "Completed", value: "Completed" }, { label: "On Leave", value: "On leave" }, { label: "Archived", value: "Archived" }] },
      filters: [
        { key: "course", label: "Course", options: [...courses] },
        { key: "batch", label: "Batch", options: batches.map((b) => b.name) },
        { key: "city", label: "City", options: [...cities] },
      ],
      columns: [
        { key: "name", label: "Learner's name", type: "primary", subKey: "city", sortable: true },
        { key: "email", label: "Contact details", type: "primary", subKey: "phone" },
        { key: "addedOn", label: "Date added", type: "date", sortable: true },
        { key: "status", label: "Status", type: "badge" },
        { key: "regNo", label: "Registration no." },
        { key: "course", label: "Course", hidden: true },
        { key: "batch", label: "Batch", hidden: true },
      ],
      rows: rows(list.length, (i) => {
        const b = pick(batches);
        return {
          ...list[i],
          addedOn: addDays(DEMO_TODAY, -int(0, 300)),
          status: pick(["Enrolled", "Enrolled", "Enrolled", "Enrolled", "Enrolled", "Enrolled", "Registered", "Registered", "Completed", "Completed", "On leave", "Archived"]),
          regNo: `IBMV/26/${String(1200 + i).padStart(5, "0")}`,
          course: b.course,
          batch: b.name,
        };
      }),
      form: {
        fields: [
          { key: "name", label: "Full name", type: "text", required: true },
          { key: "email", label: "Email", type: "email", required: true },
          { key: "phone", label: "Mobile (with country code)", type: "tel", required: true, placeholder: "+91 98xxxxxxxx" },
          { key: "city", label: "City", type: "text" },
        ],
        defaults: { addedOn: DEMO_TODAY, status: "Registered", regNo: "Pending" },
      },
      rowActions: ["view", "edit", "archive"],
    };
  },

  "users/team": () => {
    const { int, pick } = helpers(131);
    const list = people(12, 132);
    return {
      title: "Team",
      description: "Staff accounts with their roles and branches.",
      entityName: "team member",
      primaryAction: "Add Users",
      exportable: true,
      searchKeys: ["name", "email"],
      tabs: { key: "state", items: [{ label: "Active Users", value: "Active" }, { label: "Archived Users", value: "Archived" }] },
      columns: [
        { key: "name", label: "Name", type: "primary", sortable: true },
        { key: "role", label: "Role", type: "badge", tones: { "Super Admin": "danger", Administrator: "accent", Instructor: "info", "Content Editor": "gold", Finance: "success", Support: "neutral" } },
        { key: "email", label: "Contact details", type: "primary", subKey: "phone" },
        { key: "addedOn", label: "Date added", type: "date", sortable: true },
        { key: "branch", label: "Branch" },
      ],
      rows: rows(list.length, (i) => ({
        ...list[i],
        role: i === 0 ? "Super Admin" : pick(["Administrator", "Instructor", "Instructor", "Content Editor", "Finance", "Support"]),
        addedOn: addDays(DEMO_TODAY, -int(10, 700)),
        branch: pick(["Head Office – Mumbai", "Pune Centre", "Online"]),
        state: i === 11 ? "Archived" : "Active",
      })),
      form: {
        fields: [
          { key: "name", label: "Full name", type: "text", required: true },
          { key: "email", label: "Email", type: "email", required: true },
          { key: "phone", label: "Mobile", type: "tel" },
          { key: "role", label: "Role", type: "select", options: ["Administrator", "Instructor", "Content Editor", "Finance", "Support"], required: true },
          { key: "branch", label: "Branch", type: "select", options: ["Head Office – Mumbai", "Pune Centre", "Online"], required: true },
        ],
        defaults: { addedOn: DEMO_TODAY, state: "Active" },
      },
      rowActions: ["edit", "archive"],
    };
  },

  "users/segments": () => {
    const { int } = helpers(141);
    const names = ["Gita course completers", "Inactive for 30 days", "Kids club parents", "Paid learners – 2026", "Maharashtra learners", "Sanskrit interested"];
    return {
      title: "Segments",
      description: "Groups of learners used for campaigns and reports.",
      entityName: "segment",
      primaryAction: "Create New Segment",
      searchKeys: ["name"],
      tabs: { key: "_all", items: [{ label: "All" }] },
      columns: [
        { key: "name", label: "Segment name", type: "primary" },
        { key: "type", label: "Type", type: "badge", tones: { Dynamic: "accent", Static: "neutral" } },
        { key: "learners", label: "Learners", type: "number", sortable: true },
        { key: "createdOn", label: "Created on", type: "date", sortable: true },
      ],
      rows: rows(names.length, (i) => ({
        name: names[i],
        type: i % 2 ? "Static" : "Dynamic",
        learners: int(40, 2400),
        createdOn: addDays(DEMO_TODAY, -int(2, 200)),
      })),
      form: {
        fields: [
          { key: "name", label: "Segment name", type: "text", required: true },
          { key: "type", label: "Type", type: "select", options: ["Dynamic", "Static"], required: true, help: "Dynamic segments update automatically from rules." },
        ],
        defaults: { learners: 0, createdOn: DEMO_TODAY },
      },
      rowActions: ["edit", "duplicate", "delete"],
    };
  },

  "marketing/campaigns": () => {
    const { int, pick } = helpers(151);
    const names = ["Gita Jayanti invitation", "New batch launch – Bhakti Shastri", "Kartik reminder", "Course completion congratulations", "Re-engage inactive learners", "Kids summer camp", "Diwali greetings", "Book release announcement"];
    return {
      title: "Campaigns",
      description: "Bulk messages to learners over email, WhatsApp, SMS and push.",
      entityName: "campaign",
      primaryAction: "Create Campaign",
      showIndex: true,
      searchKeys: ["name"],
      searchPlaceholder: "Search campaigns",
      dateFilterKey: "createdOn",
      tabs: { key: "_all", items: [{ label: "All" }] },
      filters: [
        { key: "channel", label: "Channel", options: ["Email", "WhatsApp", "SMS", "Push"] },
        { key: "status", label: "Status", options: ["Draft", "Scheduled", "Sent", "Failed"] },
      ],
      columns: [
        { key: "name", label: "Campaign name", type: "primary" },
        { key: "type", label: "Type" },
        { key: "channel", label: "Channel", type: "badge", tones: { Email: "info", WhatsApp: "success", SMS: "gold", Push: "accent" } },
        { key: "status", label: "Status", type: "badge" },
        { key: "scheduledAt", label: "Scheduled time", type: "datetime", sortable: true },
        { key: "createdOn", label: "Created on", type: "date", sortable: true },
        { key: "sent", label: "Sent", type: "number" },
      ],
      rows: rows(names.length, (i) => {
        const status = pick(["Sent", "Sent", "Scheduled", "Draft", "Failed"]);
        const created = addDays(DEMO_TODAY, -int(1, 60));
        return {
          name: names[i],
          type: pick(["Promotional", "Transactional", "Announcement"]),
          channel: pick(["Email", "WhatsApp", "SMS", "Push"]),
          status,
          scheduledAt: at(addDays(created, int(0, 10)), "10:00"),
          createdOn: created,
          sent: status === "Sent" ? int(200, 5000) : 0,
        };
      }),
      form: {
        fields: [
          { key: "name", label: "Campaign name", type: "text", required: true },
          { key: "type", label: "Type", type: "select", options: ["Promotional", "Transactional", "Announcement"], required: true },
          { key: "channel", label: "Channel", type: "select", options: ["Email", "WhatsApp", "SMS", "Push"], required: true, help: "WhatsApp and SMS need approved templates from IBMV's provider accounts." },
          { key: "scheduledAt", label: "Schedule for", type: "datetime-local", required: true },
        ],
        defaults: { status: "Scheduled", createdOn: DEMO_TODAY, sent: 0 },
      },
      rowActions: ["edit", "duplicate", "delete"],
    };
  },

  "marketing/blogs": () => {
    const { int, pick } = helpers(161);
    const names = ["Why study the Bhagavad Gita today", "5 tips for learning Sanskrit", "Raising children with values", "What is Bhakti Yoga?", "Kartik month explained", "Student story: from beginner to Bhakti Shastri", "How our live classes work"];
    return {
      title: "Blogs",
      description: "Articles published on the public website.",
      entityName: "blog",
      primaryAction: "Create New Blog",
      showIndex: true,
      searchKeys: ["name"],
      searchPlaceholder: "Search blogs",
      dateFilterKey: "createdOn",
      tabs: { key: "_all", items: [{ label: "All" }] },
      filters: [{ key: "status", label: "Visibility", options: ["Published", "Draft", "Hidden"] }],
      columns: [
        { key: "name", label: "Blog name", type: "primary", subKey: "author" },
        { key: "status", label: "Status", type: "badge" },
        { key: "views", label: "Views", type: "number", sortable: true },
        { key: "createdOn", label: "Created on", type: "date", sortable: true },
      ],
      rows: rows(names.length, (i) => {
        const status = pick(["Published", "Published", "Draft", "Hidden"]);
        return { name: names[i], author: pick(instructors), status, views: status === "Published" ? int(80, 9000) : 0, createdOn: addDays(DEMO_TODAY, -int(1, 180)) };
      }),
      form: {
        fields: [
          { key: "name", label: "Title", type: "text", required: true },
          { key: "author", label: "Author", type: "select", options: [...instructors], required: true },
          { key: "status", label: "Visibility", type: "select", options: ["Draft", "Published", "Hidden"], required: true },
          { key: "body", label: "Content", type: "textarea", help: "A rich-text editor will replace this field." },
        ],
        defaults: { views: 0, createdOn: DEMO_TODAY },
      },
      rowActions: ["edit", "duplicate", "delete"],
    };
  },

  "marketing/marketing-banners": () => ({
    title: "Marketing Banners",
    description: "Banners shown on the website and student portal home.",
    entityName: "banner",
    primaryAction: "Add Banner",
    showIndex: true,
    tabs: { key: "_all", items: [{ label: "All" }] },
    columns: [
      { key: "thumbnail", label: "Thumbnail", type: "thumbnail" },
      { key: "name", label: "Banner name", type: "primary", subKey: "placement" },
      { key: "status", label: "Status", type: "badge" },
    ],
    rows: rows(5, (i) => ({
      thumbnail: ["accent", "gold", "lotus", "accent", "gold"][i],
      name: ["Bhakti Shastri admissions open", "Gita Jayanti 2026", "Kids Gita Club – Join now", "Download our app", "Donate for scholarships"][i],
      placement: i % 2 ? "Student portal home" : "Website home",
      status: i === 4 ? "Inactive" : "Active",
    })),
    form: {
      fields: [
        { key: "name", label: "Banner name", type: "text", required: true },
        { key: "placement", label: "Placement", type: "select", options: ["Website home", "Student portal home"], required: true },
        { key: "link", label: "Link (optional)", type: "url", placeholder: "https://" },
      ],
      defaults: { thumbnail: "accent", status: "Active" },
    },
    rowActions: ["edit", "delete"],
  }),

  "marketing/leads": () => {
    const { int, pick } = helpers(171);
    const list = people(18, 172);
    return {
      title: "Leads",
      description: "Enquiries from the website contact form, bulk book enquiries and campaigns.",
      entityName: "lead",
      exportable: true,
      searchKeys: ["name", "email", "phone"],
      dateFilterKey: "receivedOn",
      tabs: { key: "stage", items: [{ label: "All" }, { label: "New", value: "New" }, { label: "Contacted", value: "Contacted" }, { label: "Converted", value: "Converted" }, { label: "Closed", value: "Closed" }] },
      filters: [{ key: "source", label: "Source", options: ["Contact form", "Bulk book enquiry", "Campaign", "Event"] }],
      columns: [
        { key: "name", label: "Name", type: "primary", subKey: "city" },
        { key: "email", label: "Contact", type: "primary", subKey: "phone" },
        { key: "source", label: "Source" },
        { key: "interest", label: "Interested in" },
        { key: "receivedOn", label: "Received on", type: "date", sortable: true },
        { key: "stage", label: "Stage", type: "badge", tones: { New: "info", Contacted: "warning", Converted: "success", Closed: "neutral" } },
      ],
      rows: rows(list.length, () => ({})).map((r, i) => ({
        ...r,
        ...list[i],
        source: pick(["Contact form", "Bulk book enquiry", "Campaign", "Event"]),
        interest: pick([...courses.slice(0, 5), "Bhagavad Gita (bulk, 50 copies)"]),
        receivedOn: addDays(DEMO_TODAY, -int(0, 45)),
        stage: pick(["New", "New", "Contacted", "Converted", "Closed"]),
      })),
      form: {
        fields: [
          { key: "name", label: "Name", type: "text", required: true },
          { key: "email", label: "Email", type: "email", required: true },
          { key: "phone", label: "Mobile", type: "tel" },
          { key: "interest", label: "Interested in", type: "text" },
          { key: "stage", label: "Stage", type: "select", options: ["New", "Contacted", "Converted", "Closed"], required: true, help: "Move the lead forward after each follow-up." },
        ],
      },
      rowActions: ["view", "edit", "delete"],
    };
  },

  "marketing/promo-codes": () => {
    const { int, pick } = helpers(181);
    const codes = ["GITA20", "KARTIK15", "WELCOME10", "KIDS50", "EARLYBIRD", "ALUMNI25"];
    return {
      title: "Promo Codes",
      description: "Discount codes with validity windows and usage limits.",
      entityName: "promo code",
      primaryAction: "Create Promo Code",
      searchKeys: ["code"],
      tabs: { key: "status", items: [{ label: "All" }, { label: "Active", value: "Active" }, { label: "Expired", value: "Expired" }] },
      columns: [
        { key: "code", label: "Code", type: "primary", subKey: "appliesTo" },
        { key: "discount", label: "Discount" },
        { key: "validUntil", label: "Valid until", type: "date", sortable: true },
        { key: "used", label: "Used / limit" },
        { key: "status", label: "Status", type: "badge" },
      ],
      rows: rows(codes.length, (i) => {
        const limit = pick([50, 100, 500]);
        return {
          code: codes[i],
          appliesTo: pick(["All courses", ...courses.slice(0, 4)]),
          discount: pick(["10%", "15%", "20%", "₹500 off"]),
          validUntil: addDays(DEMO_TODAY, i % 4 === 3 ? -int(1, 30) : int(5, 90)),
          used: `${int(0, limit)} / ${limit}`,
          status: i % 4 === 3 ? "Expired" : "Active",
        };
      }),
      form: {
        fields: [
          { key: "code", label: "Code", type: "text", required: true, placeholder: "GITA20" },
          { key: "discount", label: "Discount", type: "text", required: true, placeholder: "20% or ₹500 off" },
          { key: "appliesTo", label: "Applies to", type: "select", options: ["All courses", ...courses], required: true },
          { key: "validUntil", label: "Valid until", type: "date", required: true },
        ],
        defaults: { used: "0 / 100", status: "Active" },
      },
      rowActions: ["edit", "delete"],
    };
  },

  "marketing/testimonials": () => {
    const { pick } = helpers(191);
    const list = people(6, 192);
    return {
      title: "Testimonials",
      description: "Learner testimonials and videos shown on the public website.",
      entityName: "testimonial",
      primaryAction: "Add Testimonial",
      searchKeys: ["name", "course"],
      columns: [
        { key: "name", label: "Learner", type: "primary", subKey: "city" },
        { key: "course", label: "Course" },
        { key: "format", label: "Format", type: "badge", tones: { Text: "neutral", Video: "accent" } },
        { key: "rating", label: "Rating", type: "number" },
        { key: "status", label: "Status", type: "badge" },
      ],
      rows: rows(list.length, (i) => ({ ...list[i], course: pick(courses), format: i % 2 ? "Video" : "Text", rating: pick([4, 5, 5]), status: i === 5 ? "Hidden" : "Published" })),
      form: {
        fields: [
          { key: "name", label: "Learner name", type: "text", required: true },
          { key: "course", label: "Course", type: "select", options: [...courses], required: true },
          { key: "format", label: "Format", type: "select", options: ["Text", "Video"], required: true },
          { key: "quote", label: "Testimonial", type: "textarea", required: true },
        ],
        defaults: { rating: 5, status: "Hidden", city: "—" },
      },
      rowActions: ["edit", "delete"],
    };
  },

  "sales/abandoned-cart": () => {
    const { int, pick } = helpers(201);
    const list = people(26, 202);
    const data = rows(list.length, (i) => {
      const items = [pick(courses)];
      return {
        name: list[i].name,
        email: list[i].email,
        phone: list[i].phone,
        items,
        value: pick([499, 999, 1499, 2499, 4999]),
        abandonedOn: addDays(DEMO_TODAY, -int(0, 60)),
        state: i % 5 === 4 ? "Completed" : "Abandoned",
      };
    });
    const abandoned = data.filter((r) => r.state === "Abandoned");
    const value = abandoned.reduce((s, r) => s + Number(r.value), 0);
    return {
      title: "Abandoned Cart",
      description: "Checkouts started but not paid. Follow up to recover sales.",
      entityName: "cart",
      exportable: true,
      showIndex: true,
      searchKeys: ["name", "email"],
      dateFilterKey: "abandonedOn",
      summary: [
        { label: "Total abandons", value: String(abandoned.length) },
        { label: "Abandoned value", value: inr(value), tone: "warning" },
        { label: "Last 30 days", value: String(abandoned.filter((r) => String(r.abandonedOn) >= addDays(DEMO_TODAY, -30)).length) },
        { label: "Recovered", value: String(data.length - abandoned.length), tone: "success" },
      ],
      tabs: { key: "state", items: [{ label: "Abandoned", value: "Abandoned" }, { label: "Completed", value: "Completed" }] },
      filters: [{ key: "items", label: "Course", options: [...courses] }],
      columns: [
        { key: "name", label: "Learner name", type: "primary" },
        { key: "email", label: "Learner details", type: "primary", subKey: "phone" },
        { key: "items", label: "Checkout items", type: "tags" },
        { key: "value", label: "Cart value", type: "currency", sortable: true },
        { key: "abandonedOn", label: "Abandoned on", type: "date", sortable: true },
      ],
      rows: data,
      rowActions: ["view"],
    };
  },

  "settings/sub-organizations": () => ({
    title: "Sub-Organizations",
    description: "Branches and centres under IBMV, each with its own admins.",
    entityName: "sub-organization",
    primaryAction: "Add Sub-Organization",
    columns: [
      { key: "name", label: "Name", type: "primary", subKey: "city" },
      { key: "admins", label: "Admins", type: "number" },
      { key: "learners", label: "Learners", type: "number" },
      { key: "status", label: "Status", type: "badge" },
    ],
    rows: rows(3, (i) => ({ name: ["Head Office – Mumbai", "Pune Centre", "Online"][i], city: ["Mumbai", "Pune", "—"][i], admins: [4, 2, 3][i], learners: [1840, 420, 3100][i], status: "Active" })),
    form: {
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "city", label: "City", type: "text" },
      ],
      defaults: { admins: 0, learners: 0, status: "Active" },
    },
    rowActions: ["edit", "archive"],
  }),

  "settings/categories": () => ({
    title: "Categories",
    description: "Categories used to group courses in catalogs and reports.",
    entityName: "category",
    primaryAction: "Add Category",
    searchKeys: ["name"],
    columns: [
      { key: "name", label: "Category", type: "primary", subKey: "slug" },
      { key: "courses", label: "Courses", type: "number" },
      { key: "status", label: "Status", type: "badge" },
    ],
    rows: rows(6, (i) => ({
      name: ["Bhagavata Mahavidyalaya", "Vedvarsity", "Ancient Wisdom", "Kids & Parents", "Level-wise", "Live Classes"][i],
      slug: ["/bhagavata-mahavidyalaya", "/vedvarsity", "/ancient-wisdom", "/kids-parents", "/level-wise", "/live-classes"][i],
      courses: [8, 5, 6, 4, 9, 7][i],
      status: "Active",
    })),
    form: { fields: [{ key: "name", label: "Category name", type: "text", required: true }, { key: "slug", label: "URL path", type: "text", required: true, placeholder: "/my-category" }], defaults: { courses: 0, status: "Active" } },
    rowActions: ["edit", "delete"],
  }),

  "settings/custom-fields": () => ({
    title: "Custom Fields",
    description: "Extra fields captured on learner profiles and enrolment forms.",
    entityName: "custom field",
    primaryAction: "Add Field",
    columns: [
      { key: "name", label: "Field label", type: "primary", subKey: "appliesTo" },
      { key: "fieldType", label: "Type", type: "badge", tones: {} },
      { key: "required", label: "Required" },
    ],
    rows: rows(4, (i) => ({
      name: ["Spiritual name (if any)", "How did you hear about us?", "Preferred language", "Parent/guardian contact"][i],
      appliesTo: ["Learner profile", "Registration", "Learner profile", "Kids enrolment"][i],
      fieldType: ["Text", "Dropdown", "Dropdown", "Phone"][i],
      required: ["No", "Yes", "Yes", "Yes"][i],
    })),
    form: {
      fields: [
        { key: "name", label: "Field label", type: "text", required: true },
        { key: "fieldType", label: "Type", type: "select", options: ["Text", "Number", "Date", "Dropdown", "Phone"], required: true },
        { key: "appliesTo", label: "Applies to", type: "select", options: ["Learner profile", "Registration", "Kids enrolment"], required: true },
        { key: "required", label: "Required", type: "select", options: ["Yes", "No"], required: true },
      ],
    },
    rowActions: ["edit", "delete"],
  }),

  "settings/grading-system": () => ({
    title: "Grading System",
    description: "Grade bands applied to assessment percentages.",
    entityName: "grade",
    primaryAction: "Add Grade",
    columns: [
      { key: "name", label: "Grade", type: "primary", subKey: "remark" },
      { key: "min", label: "From (%)", type: "number" },
      { key: "max", label: "To (%)", type: "number" },
    ],
    rows: rows(5, (i) => ({ name: ["A+", "A", "B", "C", "Not passed"][i], remark: ["Distinction", "First class", "Second class", "Pass", "Retake required"][i], min: [90, 75, 60, 40, 0][i], max: [100, 89, 74, 59, 39][i] })),
    form: { fields: [{ key: "name", label: "Grade", type: "text", required: true }, { key: "min", label: "From (%)", type: "number", required: true }, { key: "max", label: "To (%)", type: "number", required: true }, { key: "remark", label: "Remark", type: "text" }] },
    rowActions: ["edit", "delete"],
  }),

  "settings/miscellaneous-fees": () => ({
    title: "Miscellaneous Fees",
    description: "Additional fees that can be added to a product at checkout.",
    entityName: "fee",
    primaryAction: "Add Fee",
    columns: [
      { key: "name", label: "Fee", type: "primary", subKey: "appliesTo" },
      { key: "amount", label: "Amount", type: "currency" },
      { key: "status", label: "Status", type: "badge" },
    ],
    rows: rows(3, (i) => ({ name: ["Printed study material", "Exam re-evaluation", "Courier charges"][i], appliesTo: ["Bhakti Shastri", "All assessments", "Book orders"][i], amount: [600, 250, 120][i], status: "Active" })),
    form: { fields: [{ key: "name", label: "Fee name", type: "text", required: true }, { key: "amount", label: "Amount (₹)", type: "number", required: true }, { key: "appliesTo", label: "Applies to", type: "text" }], defaults: { status: "Active" } },
    rowActions: ["edit", "delete"],
  }),

  "settings/utility-wallet": () => {
    const { int, pick } = helpers(211);
    return {
      title: "Utility Wallet",
      description: "Prepaid credits used for SMS, WhatsApp and email delivery.",
      entityName: "transaction",
      exportable: true,
      summary: [
        { label: "Wallet balance", value: inr(18450), tone: "success" },
        { label: "Spent this month", value: inr(3120) },
        { label: "WhatsApp messages", value: "4,812", hint: "this month" },
        { label: "SMS sent", value: "2,104", hint: "this month" },
      ],
      dateFilterKey: "date",
      columns: [
        { key: "date", label: "Date", type: "date", sortable: true },
        { key: "description", label: "Description", type: "primary" },
        { key: "kind", label: "Type", type: "badge", tones: { Credit: "success", Debit: "neutral" } },
        { key: "amount", label: "Amount", type: "currency", sortable: true },
      ],
      rows: rows(14, (i) => ({
        date: addDays(DEMO_TODAY, -i * 3),
        description: i % 5 === 0 ? "Wallet recharge" : `${pick(["WhatsApp", "SMS", "Email"])} campaign – ${pick(["Kartik reminder", "Batch launch", "Session reminders"])}`,
        kind: i % 5 === 0 ? "Credit" : "Debit",
        amount: i % 5 === 0 ? 10000 : int(80, 900),
      })),
    };
  },
};

export function getListConfig(key: string): ListConfig | null {
  const make = configs[key];
  return make ? make() : null;
}

export function listConfigKeys() {
  return Object.keys(configs);
}
