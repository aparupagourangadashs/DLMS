import { formatDate } from "@/lib/format";
import { announcementTags } from "./announcements";
import { assetTypeLabels, fileAssetTypes, linkAssetTypes } from "./assets";
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
import { batchForm, certificateForm, eventForm, feedbackForm } from "./editor-definitions";
import { recordingStatuses } from "./recordings";
import type { FormField, ListConfig, Row } from "./types";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function rows<T extends Omit<Row, "id">>(count: number, make: (i: number) => T): Row[] {
  return Array.from({ length: count }, (_, i) => ({ id: String(i + 1), ...make(i) }) as Row);
}

const configs: Record<string, () => ListConfig> = {
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
          startDate: start,
          endDate: addDays(start, 120),
          instructor: b.instructor,
          module: `Module ${int(1, 6)} of 8`,
          manager: pick(["Hari Prasad", "Vrinda Joshi", "Mukund Rao"]),
          progress: status === "Completed" || status === "Archived" ? 100 : int(5, 92),
          status,
        };
      }),
      form: batchForm,
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
      form: feedbackForm,
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
          { key: "exam", label: "Exam", type: "text", required: true },
          { key: "subject", label: "Subject", type: "text", required: true },
          { key: "topic", label: "Topic", type: "text", required: true },
          { key: "description", label: "Short description", type: "textarea", required: true },
        ],
        defaults: { code: "QB-NEW" },
      },
      rowActions: ["edit", "duplicate", "delete"],
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
      form: certificateForm,
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
          { key: "email", label: "Email", type: "email", required: true, help: "Cannot be changed after the account is created." },
          { key: "phone", label: "Mobile", type: "tel" },
          { key: "role", label: "Role", type: "select", options: ["Administrator", "Instructor", "Content Editor", "Finance", "Support"], required: true },
          { key: "branch", label: "Branch", type: "select", options: ["Head Office – Mumbai", "Pune Centre", "Online"], required: true },
        ],
        defaults: { addedOn: DEMO_TODAY, state: "Active" },
      },
      rowActions: ["edit", "archive", "restore"],
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

  "marketing/leads": () => ({
    title: "Leads",
    description: "Enquiries from the website bulk-book form and manual entries. Follow up and move each lead forward.",
    entityName: "lead",
    primaryAction: "Add Lead",
    exportable: true,
    searchKeys: ["name", "email", "phone"],
    searchPlaceholder: "Search name, email or phone",
    dateFilterKey: "receivedOn",
    tabs: { key: "stage", items: [{ label: "All" }, { label: "New", value: "New" }, { label: "Contacted", value: "Contacted" }, { label: "Converted", value: "Converted" }, { label: "Closed", value: "Closed" }] },
    filters: [{ key: "source", label: "Source", options: ["Contact form", "Bulk book enquiry", "Campaign", "Event", "Manual entry"] }],
    columns: [
      { key: "name", label: "Name", type: "primary", subKey: "city", sortable: true },
      { key: "email", label: "Contact", type: "primary", subKey: "phone" },
      { key: "source", label: "Source" },
      { key: "interest", label: "Interested in" },
      { key: "receivedOn", label: "Received on", type: "date", sortable: true },
      { key: "stage", label: "Stage", type: "badge", tones: { New: "info", Contacted: "warning", Converted: "success", Closed: "neutral" } },
      { key: "details", label: "Details", hidden: true },
      { key: "consent", label: "Agreed to be contacted", hidden: true },
    ],
    rows: [],
    form: {
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "phone", label: "Mobile", type: "tel" },
        { key: "interest", label: "Interested in", type: "text" },
        { key: "stage", label: "Stage", type: "select", options: ["New", "Contacted", "Converted", "Closed"], required: true, help: "Move the lead forward after each follow-up." },
      ],
      defaults: { stage: "New" },
    },
    rowActions: ["view", "edit", "delete"],
  }),

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
      name: ["Bhagavata Mahavidyalaya", "Self-study Courses", "Ancient Wisdom", "Kids & Parents", "Level-wise", "Live Classes"][i],
      slug: ["/bhagavata-mahavidyalaya", "/self-study", "/ancient-wisdom", "/kids-parents", "/level-wise", "/live-classes"][i],
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

const statusTones = { Published: "success", Draft: "neutral", Hidden: "neutral", Archived: "warning" } as const;
const statusTabs = [{ label: "All" }, { label: "Published", value: "Published" }, { label: "Draft", value: "Draft" }, { label: "Archived", value: "Archived" }];
const statusSelect: FormField = { key: "status", label: "Status", type: "select", options: ["Draft", "Published", "Archived"], required: true, defaultValue: "Draft" };
const orderField: FormField = { key: "sortOrder", label: "Display order", type: "number", min: 0, help: "Lower numbers appear first. Leave empty to keep the current position." };

// Screens backed by the database: rows come from the API, so `rows` stays empty here.
const catalogConfigs: Record<string, () => ListConfig> = {
  "learning/module-library": () => ({
    title: "Module Library",
    description: "Reusable modules of lessons. Add a module to a course (Products > Courses) and its lessons appear in the learner's course player.",
    entityName: "module",
    primaryAction: "Add Module",
    searchKeys: ["name", "description"],
    searchPlaceholder: "Search modules",
    tabs: { key: "status", items: statusTabs },
    columns: [
      { key: "name", label: "Module name", type: "primary", subKey: "usedIn", sortable: true },
      { key: "content", label: "Content" },
      { key: "status", label: "Status", type: "badge", tones: statusTones },
      { key: "updatedOn", label: "Updated", type: "date", sortable: true },
    ],
    rows: [],
    form: {
      defaults: { status: "Published" },
      fields: [
        { key: "name", label: "Module name", type: "text", required: true },
        { key: "description", label: "Description", type: "textarea" },
        { key: "status", label: "Status", type: "select", options: ["Published", "Draft", "Archived"], required: true, defaultValue: "Published", help: "Learners see only published modules that a course includes." },
        {
          key: "lessons",
          label: "Lesson",
          type: "repeat",
          itemFields: [
            { key: "title", label: "Lesson title", type: "text", required: true },
            { key: "type", label: "Type", type: "select", options: ["Text", "Video", "Link", "File"], defaultValue: "Text", required: true, help: "Text is written here. Video is a YouTube address. Link opens another website. File is an item from the Asset Library (PDF, audio, video, image or document)." },
            { key: "minutes", label: "Minutes (optional)", type: "number", min: 1, max: 600 },
            { key: "content", label: "Lesson text (Markdown)", type: "textarea", format: "markdown", required: true, showWhen: { key: "type", values: ["Text"] } },
            { key: "url", label: "Address", type: "url", required: true, placeholder: "https://", showWhen: { key: "type", values: ["Video", "Link"] } },
            { key: "asset", label: "File", type: "select", options: [], required: true, showWhen: { key: "type", values: ["File"] }, help: "Add the file under Learning > Asset Library first. Learners open it only through this lesson." },
          ],
        },
      ],
    },
    rowActions: ["edit", "duplicate", "archive", "delete"],
  }),
  "users/learners": () => ({
    title: "Learners",
    description: "Everyone registered on the platform, with enrolment status worked out from batches.",
    entityName: "learner",
    primaryAction: "Add Learner",
    exportable: true,
    configurableColumns: true,
    searchKeys: ["name", "email", "phone", "regNo"],
    searchPlaceholder: "Search name, email, phone or reg. no.",
    dateFilterKey: "addedOn",
    tabs: { key: "status", items: [{ label: "All" }, { label: "Registered", value: "Registered" }, { label: "Enrolled", value: "Enrolled" }, { label: "Completed", value: "Completed" }, { label: "On Leave", value: "On leave" }, { label: "Archived", value: "Archived" }] },
    filters: [{ key: "course", label: "Course", options: [] }, { key: "batch", label: "Batch", options: [] }, { key: "branch", label: "Branch", options: [] }, { key: "city", label: "City", options: [] }],
    columns: [
      { key: "name", label: "Learner's name", type: "primary", subKey: "city", sortable: true },
      { key: "email", label: "Contact details", type: "primary", subKey: "phone" },
      { key: "addedOn", label: "Date added", type: "date", sortable: true },
      { key: "status", label: "Status", type: "badge", tones: { Registered: "info", Enrolled: "success", Completed: "accent", "On leave": "warning", Archived: "neutral" } },
      { key: "regNo", label: "Registration no." },
      { key: "branch", label: "Branch", hidden: true },
      { key: "course", label: "Course", hidden: true },
      { key: "batch", label: "Batch", hidden: true },
    ],
    rows: [],
    form: {
      defaults: { standing: "Registered" },
      fields: [
        { key: "name", label: "Full name", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true, help: "The sign-in address. It cannot be changed after the account is created; the learner is emailed a link to choose a password." },
        { key: "phone", label: "Mobile (with country code)", type: "tel", placeholder: "+91 98xxxxxxxx" },
        { key: "city", label: "City", type: "text" },
        { key: "branch", label: "Branch", type: "select", options: [] },
        { key: "standing", label: "Account status", type: "select", options: ["Registered", "On leave", "Archived"], required: true, defaultValue: "Registered", help: "Enrolled and Completed are worked out from the learner's batches. On leave pauses a learner without blocking sign-in; Archived blocks it." },
      ],
    },
    rowActions: ["view", "edit", "reset-password", "archive", "restore"],
  }),

  "learning/announcements": () => ({
    title: "Announcements",
    description: "Share notices with learners. Urgency controls how prominently they appear; a notice with a later publish time stays hidden until then.",
    entityName: "announcement",
    primaryAction: "New Announcement",
    showIndex: true,
    searchKeys: ["name"],
    searchPlaceholder: "Search by name",
    dateFilterKey: "date",
    filters: [{ key: "tags", label: "Tag", options: [...announcementTags] }],
    columns: [
      { key: "date", label: "Date & time", type: "datetime", sortable: true },
      { key: "name", label: "Name", type: "primary", subKey: "audience", sortable: true },
      { key: "urgency", label: "Urgency", type: "badge", tones: { High: "danger", Medium: "warning", Low: "neutral" } },
      { key: "tags", label: "Tags", type: "tags" },
      { key: "status", label: "Status", type: "badge", tones: statusTones },
    ],
    rows: [],
    form: {
      defaults: { urgency: "Medium", status: "Published", tags: ["General"] },
      fields: [
        { key: "name", label: "Title", type: "text", required: true },
        { key: "audience", label: "Audience", type: "select", options: [], required: true, help: "Everyone, or the learners enrolled in one batch." },
        { key: "urgency", label: "Urgency", type: "select", options: ["High", "Medium", "Low"], required: true, defaultValue: "Medium" },
        { key: "date", label: "Publish at (IST)", type: "datetime-local", required: true, help: "Choose a later time to schedule it; learners see it from then on." },
        { key: "tags", label: "Tags", type: "multiselect", options: [...announcementTags] },
        { key: "message", label: "Message", type: "textarea", required: true },
        { key: "status", label: "Status", type: "select", options: ["Published", "Draft", "Archived"], required: true, defaultValue: "Published", help: "Drafts and archived notices are not shown to learners." },
      ],
    },
    rowActions: ["edit", "duplicate", "archive", "delete"],
  }),

  "learning/batches": () => ({
    title: "Batches",
    description: "Course batches with their instructor, managers and progress. Modules and batch communities arrive with the module library and communities.",
    entityName: "batch",
    primaryAction: "Create Batch",
    showIndex: true,
    configurableColumns: true,
    searchKeys: ["name", "course"],
    searchPlaceholder: "Search batches",
    tabs: { key: "status", items: [{ label: "Active", value: "Active" }, { label: "Completed", value: "Completed" }, { label: "Archived", value: "Archived" }, { label: "All" }] },
    filters: [{ key: "course", label: "Course", options: [] }, { key: "instructor", label: "Instructor", options: [] }],
    columns: [
      { key: "name", label: "Batch name", type: "primary", sortable: true },
      { key: "course", label: "Course", sortable: true },
      { key: "duration", label: "Duration" },
      { key: "instructor", label: "Instructor" },
      { key: "manager", label: "Batch manager" },
      { key: "learners", label: "Learners", type: "number" },
      { key: "progress", label: "Batch progress", type: "progress" },
      { key: "branch", label: "Branch", hidden: true },
      { key: "status", label: "Status", type: "badge", hidden: true },
    ],
    rows: [],
    form: {
      defaults: { status: "Active" },
      fields: [
        { key: "name", label: "Batch name", type: "text", required: true },
        { key: "course", label: "Course", type: "select", options: [], required: true },
        { key: "startDate", label: "Start date", type: "date", required: true },
        { key: "endDate", label: "End date", type: "date", required: true },
        { key: "instructor", label: "Instructor", type: "select", options: [], required: true },
        { key: "manager", label: "Primary manager", type: "select", options: [], required: true },
        { key: "additionalManagers", label: "Additional managers", type: "multiselect", options: [] },
        { key: "branch", label: "Branch", type: "select", options: [], help: "Leave empty for a batch that belongs to no branch." },
        { key: "status", label: "Status", type: "select", options: ["Active", "Completed", "Archived"], required: true, defaultValue: "Active", help: "Completing a batch stops new sessions and enrolments; archiving keeps every record." },
      ],
    },
    rowActions: ["edit", "duplicate", "archive"],
  }),

  "learning/asset-library": (): ListConfig => ({
    title: "Asset Library",
    description: "Files and links for lessons, kept in one place with their usage and storage. Images are public; every other file is only open to staff and to learners through the lessons that use it.",
    entityName: "asset",
    primaryAction: "Add Asset",
    showIndex: true,
    searchKeys: ["name", "fileName"],
    searchPlaceholder: "Search assets",
    filters: [
      { key: "usage", label: "Usage", options: ["Used", "Unused"] },
      { key: "type", label: "Asset type", options: [...assetTypeLabels] },
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
    rows: [],
    form: {
      fields: [
        { key: "type", label: "Asset type", type: "select", options: [...assetTypeLabels], required: true },
        { key: "name", label: "Asset name", type: "text", required: true },
        { key: "description", label: "Description", type: "textarea" },
        { key: "localFile", label: "File", type: "file", max: 25, required: true, upload: "asset", showWhen: { key: "type", values: [...fileAssetTypes] }, help: "The type of a saved file cannot change; to replace the file, choose a new one of the same type." },
        { key: "link", label: "Address", type: "url", required: true, showWhen: { key: "type", values: [...linkAssetTypes] }, help: "A full https:// address. YouTube assets need a YouTube video address. Links are stored, never fetched or run." },
      ],
    },
    rowActions: ["edit", "delete"],
  }),

  "learning/session-recordings": () => ({
    title: "Session Recordings",
    description: "Links to recorded classes, grouped by the status of their batch. Learners see a recording on its class once it is Available.",
    entityName: "recording",
    primaryAction: "Add Recording",
    showIndex: true,
    searchKeys: ["name", "batch"],
    searchPlaceholder: "Search by class or batch",
    dateFilterKey: "date",
    tabs: { key: "batchStatus", items: [{ label: "Active Batches", value: "Active" }, { label: "Completed Batches", value: "Completed" }, { label: "Archived Batches", value: "Archived" }] },
    filters: [{ key: "batch", label: "Batch", options: [] }],
    columns: [
      { key: "name", label: "Class name", type: "primary", subKey: "date", sortable: true },
      { key: "batch", label: "Batch" },
      { key: "instructor", label: "Instructor" },
      { key: "url", label: "Recording", type: "link" },
      { key: "status", label: "Status", type: "badge", tones: { Available: "success", Processing: "warning", Failed: "danger" } },
    ],
    rows: [],
    form: {
      defaults: { status: "Available" },
      fields: [
        { key: "session", label: "Class", type: "select", options: [], required: true, help: "Classes that have already started, newest first. Cancelled classes and archived batches are not listed." },
        { key: "title", label: "Recording title (optional)", type: "text", help: "Shown to learners. Leave empty to use the class title." },
        { key: "url", label: "Recording link", type: "url", required: true, placeholder: "https://…", help: "The full https:// address of the recording, for example a YouTube or Vimeo link. Uploading files arrives with the asset library." },
        { key: "status", label: "Status", type: "select", options: [...recordingStatuses], required: true, defaultValue: "Available", help: "Only Available recordings are shown to learners." },
      ],
    },
    rowActions: ["edit", "delete"],
  }),
  "products/courses": () => ({
    title: "Courses",
    description: "The public course catalog. Published courses appear on the website under their collection.",
    entityName: "course",
    primaryAction: "Add Course",
    showIndex: true,
    searchKeys: ["title", "slug", "instructorName"],
    searchPlaceholder: "Search title, URL name or teacher",
    tabs: { key: "status", items: statusTabs },
    filters: [{ key: "category", label: "Category", options: [] }, { key: "language", label: "Language", options: [] }],
    columns: [
      { key: "title", label: "Course", type: "primary", subKey: "slug", sortable: true },
      { key: "category", label: "Category" },
      { key: "language", label: "Language" },
      { key: "format", label: "Format" },
      { key: "instructorName", label: "Teacher or team" },
      { key: "status", label: "Status", type: "badge", tones: statusTones },
      { key: "updatedOn", label: "Updated", type: "date", sortable: true },
    ],
    rows: [],
    form: {
      steps: ["Basics", "Offer and details", "Publishing"],
      defaults: { isFree: "No", certificateOffered: "No", comingSoon: "No", status: "Draft", language: "Not listed", format: "Self-paced" },
      fields: [
        { key: "title", label: "Course title", type: "text", required: true, step: 0 },
        { key: "slug", label: "URL name", type: "text", step: 0, placeholder: "bhakti-shastri-english", help: "Leave blank to create it from the title. Lowercase letters, numbers, dashes and underscores." },
        { key: "category", label: "Category (collection)", type: "select", options: [], required: true, step: 0 },
        { key: "language", label: "Language", type: "select", options: ["English", "Hindi", "Not listed"], step: 0 },
        { key: "format", label: "Study format", type: "select", options: ["Self-paced", "Live classes", "Structured study"], step: 0 },
        { key: "instructorName", label: "Teacher or team", type: "text", step: 0 },
        { key: "duration", label: "Listed duration", type: "text", placeholder: "96 Hours", step: 0 },
        { key: "summary", label: "Short summary", type: "textarea", required: true, step: 0, help: "Shown on cards and at the top of the course page." },
        { key: "description", label: "Description (Markdown)", type: "textarea", format: "markdown", step: 0 },
        { key: "isFree", label: "Free course", type: "select", options: ["No", "Yes"], defaultValue: "No", step: 1 },
        { key: "price", label: "Price (₹)", type: "number", min: 0, step: 1, showWhen: { key: "isFree", values: ["No"] }, help: "Leave empty to show \"see the official page\"." },
        { key: "certificateOffered", label: "Certificate offered", type: "select", options: ["No", "Yes"], defaultValue: "No", step: 1 },
        { key: "startDate", label: "Start date", type: "date", step: 1 },
        { key: "endDate", label: "End date", type: "date", step: 1 },
        { key: "scheduleNote", label: "Schedule details", type: "textarea", step: 1, help: "Class days, times and time zone." },
        { key: "officialUrl", label: "Official course page", type: "url", required: true, step: 1, placeholder: "https://www.ibmedu.org/course-details/…" },
        { key: "enrollmentUrl", label: "Enrollment link (optional)", type: "url", step: 1 },
        { key: "eligibility", label: "Eligibility", type: "textarea", step: 1 },
        { key: "materials", label: "Course materials", type: "textarea", step: 1 },
        { key: "audience", label: "Who it is for", type: "textarea", step: 1 },
        { key: "assessmentPlan", label: "Assessment", type: "textarea", step: 1 },
        { key: "requirements", label: "Requirements", type: "textarea", step: 1 },
        { key: "imageUrl", label: "Image path or URL", type: "text", step: 2, placeholder: "/website/courses/course-112924.webp", help: "A site path or an https:// link. Uploading arrives with the asset library." },
        { ...statusSelect, step: 2 },
        { key: "comingSoon", label: "Show as coming soon", type: "select", options: ["No", "Yes"], defaultValue: "No", step: 2 },
        { ...orderField, step: 2 },
        { key: "faqs", label: "FAQs", type: "repeat", step: 2, itemFields: [{ key: "question", label: "Question", type: "text", required: true }, { key: "answer", label: "Answer", type: "textarea", required: true }] },
        { key: "modules", label: "Module", type: "repeat", step: 2, itemFields: [{ key: "module", label: "Module", type: "select", options: [], required: true }], help: "Lessons that enrolled learners study, in order. Build them under Learning > Module Library." },
      ],
    },
    rowActions: ["edit", "duplicate", "archive", "delete"],
  }),

  "website/books": () => ({
    title: "Books",
    description: "Publications shown on the website Books page, grouped by language.",
    entityName: "book",
    primaryAction: "Add Book",
    searchKeys: ["title", "publisher"],
    searchPlaceholder: "Search title or publisher",
    tabs: { key: "status", items: statusTabs },
    filters: [{ key: "language", label: "Language", options: ["English", "Hindi"] }],
    columns: [
      { key: "title", label: "Title", type: "primary", subKey: "publisher", sortable: true },
      { key: "language", label: "Language", type: "badge", tones: { English: "info", Hindi: "gold" } },
      { key: "linkCount", label: "Retailer links", type: "number" },
      { key: "status", label: "Status", type: "badge", tones: statusTones },
      { key: "updatedOn", label: "Updated", type: "date", sortable: true },
    ],
    rows: [],
    form: {
      defaults: { status: "Draft", language: "English" },
      fields: [
        { key: "title", label: "Title", type: "text", required: true },
        { key: "language", label: "Language", type: "select", options: ["English", "Hindi"], required: true },
        { key: "publisher", label: "Publisher", type: "text" },
        { key: "imageUrl", label: "Cover image path or URL", type: "text", placeholder: "/website/books/cover.webp", help: "600 x 840 pixels works best." },
        { key: "links", label: "Retailer links", type: "repeat", itemFields: [{ key: "format", label: "Format", type: "select", options: ["Print", "Digital"], defaultValue: "Print", required: true }, { key: "retailer", label: "Retailer", type: "text", required: true }, { key: "url", label: "Link", type: "url", required: true }] },
        statusSelect,
        orderField,
      ],
    },
    rowActions: ["edit", "archive", "delete"],
  }),

  "website/people": () => ({
    title: "People",
    description: "Advisory board members and the team listed on the About pages. Only published entries appear.",
    entityName: "person",
    primaryAction: "Add Person",
    searchKeys: ["name", "roleTitle"],
    searchPlaceholder: "Search name or role",
    tabs: { key: "status", items: statusTabs },
    filters: [{ key: "group", label: "Group", options: ["Advisory Board", "Team"] }],
    columns: [
      { key: "name", label: "Name", type: "primary", subKey: "roleTitle", sortable: true },
      { key: "group", label: "Group", type: "badge", tones: { "Advisory Board": "gold", Team: "info" } },
      { key: "status", label: "Status", type: "badge", tones: statusTones },
      { key: "updatedOn", label: "Updated", type: "date", sortable: true },
    ],
    rows: [],
    form: {
      defaults: { status: "Draft", group: "Team" },
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "roleTitle", label: "Role or title", type: "text", required: true },
        { key: "group", label: "Group", type: "select", options: ["Advisory Board", "Team"], required: true },
        { key: "bio", label: "Short biography", type: "textarea", help: "Publish only text the person has approved." },
        { key: "imageUrl", label: "Photo path or URL", type: "text" },
        statusSelect,
        orderField,
      ],
    },
    rowActions: ["edit", "archive", "delete"],
  }),

  "website/magazines": () => ({
    title: "Magazines",
    description: "Issues of the e-magazine shown in the public archive, newest first.",
    entityName: "magazine issue",
    primaryAction: "Add Issue",
    searchKeys: ["title", "issueLabel"],
    searchPlaceholder: "Search title or issue",
    tabs: { key: "status", items: statusTabs },
    columns: [
      { key: "title", label: "Title", type: "primary", subKey: "issueLabel", sortable: true },
      { key: "language", label: "Language" },
      { key: "issueDate", label: "Issue date", type: "date" },
      { key: "status", label: "Status", type: "badge", tones: statusTones },
    ],
    rows: [],
    form: {
      defaults: { status: "Draft", language: "English" },
      fields: [
        { key: "title", label: "Title", type: "text", required: true },
        { key: "issueLabel", label: "Issue label", type: "text", placeholder: "Issue 12" },
        { key: "issueDate", label: "Issue date", type: "date" },
        { key: "language", label: "Language", type: "select", options: ["English", "Hindi"], required: true },
        { key: "coverUrl", label: "Cover image path or URL", type: "text" },
        { key: "fileUrl", label: "Reading or download link", type: "url" },
        statusSelect,
        orderField,
      ],
    },
    rowActions: ["edit", "archive", "delete"],
  }),

  "website/videos": () => ({
    title: "Videos",
    description: "Videos shown in the home page video section. Playback loads from YouTube only after a visitor chooses a video.",
    entityName: "video",
    primaryAction: "Add Video",
    searchKeys: ["title", "speaker"],
    searchPlaceholder: "Search title or speaker",
    tabs: { key: "status", items: statusTabs },
    columns: [
      { key: "title", label: "Title", type: "primary", subKey: "speaker", sortable: true },
      { key: "youtubeId", label: "YouTube id" },
      { key: "status", label: "Status", type: "badge", tones: statusTones },
      { key: "updatedOn", label: "Updated", type: "date", sortable: true },
    ],
    rows: [],
    form: {
      defaults: { status: "Draft" },
      fields: [
        { key: "youtubeId", label: "YouTube link or video id", type: "text", required: true, placeholder: "https://www.youtube.com/watch?v=…" },
        { key: "speaker", label: "Speaker", type: "text", required: true },
        { key: "title", label: "Title", type: "text", required: true },
        { key: "thumbnailUrl", label: "Thumbnail path or URL", type: "text", help: "Thumbnails are hosted on this site so YouTube loads only on play. 960 x 540 works best." },
        statusSelect,
        orderField,
      ],
    },
    rowActions: ["edit", "archive", "delete"],
  }),

  "website/legal-pages": () => ({
    title: "Legal Pages",
    description: "Terms and Privacy text. Published text is not edited; create a new version instead.",
    entityName: "legal document",
    primaryAction: "New Document",
    searchKeys: ["title"],
    searchPlaceholder: "Search title",
    tabs: { key: "status", items: statusTabs },
    filters: [{ key: "type", label: "Type", options: ["Terms", "Privacy"] }],
    columns: [
      { key: "title", label: "Title", type: "primary", subKey: "type" },
      { key: "version", label: "Version", type: "number" },
      { key: "status", label: "Status", type: "badge", tones: statusTones },
      { key: "publishedOn", label: "Published on", type: "date" },
    ],
    rows: [],
    form: {
      defaults: { status: "Draft", type: "Privacy" },
      fields: [
        { key: "type", label: "Document", type: "select", options: ["Terms", "Privacy"], required: true },
        { key: "title", label: "Title", type: "text", required: true },
        { key: "body", label: "Text (Markdown)", type: "textarea", format: "markdown", required: true, help: "Only institution-approved wording should be published." },
        { key: "status", label: "Status", type: "select", options: ["Draft", "Published"], required: true, defaultValue: "Draft", help: "Publishing needs an administrator and archives the previous published version." },
      ],
    },
    rowActions: ["edit", "duplicate", "archive", "delete"],
  }),

  "products/events": (): ListConfig => ({
    title: "Events",
    description: "Festivals, workshops, quizzes and retreats, with their days, visibility and status. Selling tickets arrives with payments.",
    entityName: "event",
    primaryAction: "Create Event",
    showIndex: true,
    searchKeys: ["name"],
    searchPlaceholder: "Search events",
    filters: [{ key: "visibility", label: "Visibility", options: ["Public", "Private", "Unlisted"] }],
    tabs: { key: "status", items: [{ label: "All" }, { label: "Active", value: "Active" }, { label: "Draft", value: "Draft" }, { label: "Inactive", value: "Inactive" }] },
    columns: [
      { key: "name", label: "Event name", type: "primary", subKey: "where", sortable: true },
      { key: "date", label: "Event date", type: "datetime", sortable: true },
      { key: "visibility", label: "Visibility", type: "badge", tones: { Public: "info", Private: "neutral", Unlisted: "gold" } },
      { key: "status", label: "Status", type: "badge", tones: { Active: "success", Draft: "neutral", Inactive: "warning" } },
    ],
    rows: [],
    form: eventForm,
    rowActions: ["edit", "duplicate", "delete"],
  }),

  "marketing/blogs": (): ListConfig => ({
    title: "Blogs",
    description: "Articles published on the public website. Only published articles are visible; hide one to take it offline without losing it.",
    entityName: "blog",
    primaryAction: "Create New Blog",
    showIndex: true,
    searchKeys: ["name", "summary"],
    searchPlaceholder: "Search blogs",
    dateFilterKey: "createdOn",
    tabs: { key: "_all", items: [{ label: "All" }] },
    filters: [{ key: "status", label: "Visibility", options: ["Published", "Draft", "Hidden"] }],
    columns: [
      { key: "thumbnail", label: "Cover", type: "thumbnail" },
      { key: "name", label: "Blog name", type: "primary", subKey: "byline", sortable: true },
      { key: "status", label: "Status", type: "badge", tones: statusTones },
      { key: "views", label: "Views", type: "number", sortable: true },
      { key: "publishedOn", label: "Published on", type: "date", sortable: true },
      { key: "createdOn", label: "Created on", type: "date", sortable: true },
    ],
    rows: [],
    form: {
      defaults: { status: "Draft" },
      fields: [
        { key: "name", label: "Title", type: "text", required: true },
        { key: "summary", label: "Summary (optional)", type: "textarea", help: "One or two sentences for the blog list and search results. If you leave it empty, the start of the article is used." },
        { key: "body", label: "Article (Markdown)", type: "textarea", format: "markdown", required: true, help: "Markdown: **bold**, *italic*, # heading, and - or 1. lists. Plain text is preserved; HTML and links are never executed." },
        { key: "cover", label: "Cover image (optional)", type: "file", max: 5, upload: "Image", help: "A 16:9 picture such as 1280 \u00d7 720 px works best. PNG, JPG or WebP, up to 5 MB." },
        { key: "author", label: "Author", type: "select", options: [], help: "Shown as the byline. If you leave it empty, you are the author." },
        { key: "status", label: "Visibility", type: "select", options: ["Draft", "Published", "Hidden"], required: true, defaultValue: "Draft", help: "Only published articles are on the website. Hidden articles are taken offline but kept." },
        { key: "slug", label: "Web address (optional)", type: "text", placeholder: "why-study-the-bhagavad-gita", help: "The end of the article's address. Leave it empty to create it from the title. Changing it later breaks links people already have." },
      ],
    },
    rowActions: ["edit", "duplicate", "delete"],
  }),

  "marketing/marketing-banners": (): ListConfig => ({
    title: "Marketing Banners",
    description: "Promotional images with an optional link. A banner shows on the website home or the student portal home while it is published and inside its dates.",
    entityName: "banner",
    primaryAction: "Add Banner",
    showIndex: true,
    searchKeys: ["name", "description"],
    searchPlaceholder: "Search banners",
    tabs: { key: "status", items: statusTabs },
    filters: [{ key: "placement", label: "Placement", options: ["Website home", "Student portal home"] }],
    columns: [
      { key: "thumbnail", label: "Image", type: "thumbnail" },
      { key: "name", label: "Banner name", type: "primary", subKey: "placement", sortable: true },
      { key: "window", label: "Dates" },
      { key: "showing", label: "On the site", type: "badge", tones: { "Showing now": "success", Scheduled: "info", Ended: "warning", "Not published": "neutral" } },
      { key: "sortOrder", label: "Order", type: "number" },
      { key: "status", label: "Status", type: "badge", tones: statusTones },
    ],
    rows: [],
    form: {
      defaults: { placement: "Website home", status: "Draft" },
      fields: [
        { key: "name", label: "Banner name", type: "text", required: true, help: "Also read aloud as the image's description, so say what the banner shows." },
        { key: "description", label: "Short text (optional)", type: "textarea", help: "Shown beside the image on the website home." },
        { key: "placement", label: "Placement", type: "select", options: ["Website home", "Student portal home"], required: true, help: "The website home shows its first live banner; the student portal rotates through all of its live banners." },
        { key: "image", label: "Banner image", type: "file", max: 5, required: true, upload: "Image", help: "A wide image works best, about 1920 \u00d7 574 px. PNG, JPG or WebP, up to 5 MB." },
        { key: "link", label: "Link (optional)", type: "text", placeholder: "https://\u2026 or /student/my-learning", help: "A full https:// address, or a page on this site that starts with /." },
        { key: "startDate", label: "Show from (optional)", type: "date" },
        { key: "endDate", label: "Show until (optional)", type: "date", help: "The last day it shows." },
        orderField,
        { ...statusSelect, help: "Only published banners can show. Drafts and archived banners stay hidden." },
      ],
    },
    rowActions: ["edit", "duplicate", "archive", "delete"],
  }),

  "marketing/testimonials": () => ({
    title: "Testimonials",
    description: "Testimonials shown on the public website home page. Only published entries appear.",
    entityName: "testimonial",
    primaryAction: "Add Testimonial",
    searchKeys: ["name", "course"],
    searchPlaceholder: "Search name or course",
    tabs: { key: "status", items: [{ label: "All" }, { label: "Published", value: "Published" }, { label: "Hidden", value: "Hidden" }, { label: "Archived", value: "Archived" }] },
    columns: [
      { key: "name", label: "Name", type: "primary", subKey: "city", sortable: true },
      { key: "course", label: "Course" },
      { key: "format", label: "Format", type: "badge", tones: { Text: "neutral", Video: "accent" } },
      { key: "rating", label: "Rating", type: "number" },
      { key: "status", label: "Status", type: "badge", tones: statusTones },
      { key: "updatedOn", label: "Updated", type: "date", sortable: true },
    ],
    rows: [],
    form: {
      defaults: { status: "Hidden", format: "Text" },
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "city", label: "City", type: "text" },
        { key: "course", label: "Course (optional)", type: "text" },
        { key: "format", label: "Format", type: "select", options: ["Text", "Video"], required: true },
        { key: "quote", label: "Testimonial", type: "textarea", required: true },
        { key: "imageUrl", label: "Photo path or URL", type: "text" },
        { key: "sourceUrl", label: "Source link", type: "url", help: "Where the full testimonial can be read." },
        { key: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5 },
        { key: "status", label: "Status", type: "select", options: ["Hidden", "Published", "Archived"], required: true, defaultValue: "Hidden", help: "Publish only with the person's consent." },
        orderField,
      ],
    },
    rowActions: ["edit", "archive", "delete"],
  }),
};

export function getListConfig(key: string): ListConfig | null {
  const make = catalogConfigs[key] ?? configs[key];
  return make ? make() : null;
}

export function listConfigKeys() {
  return [...new Set([...Object.keys(configs), ...Object.keys(catalogConfigs)])];
}
