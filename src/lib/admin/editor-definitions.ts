import { courses, instructors, DEMO_TODAY } from "./demo-data";
import type { FormField, ListConfig } from "./types";

type Form = NonNullable<ListConfig["form"]>;
const managers = ["Hari Prasad", "Vrinda Joshi", "Mukund Rao"];
const modules = ["Introduction to the Gita", "Karma Yoga", "Jnana Yoga", "Bhakti Yoga", "Sanskrit Alphabet", "Sandhi Rules", "Stories for Children", "Parenting with Values"];
const assetTypes = ["Video", "Audio", "PDF", "YouTube", "Image", "Doc", "Sheet", "Slide", "Text/HTML", "Zip", "SCORM Zip", "Link/Embed", "Epub"];
const fileTypes = assetTypes.filter((v) => !["YouTube", "Link/Embed"].includes(v));
const questionFields: FormField[] = [
  { key: "prompt", label: "Question", type: "text", required: true },
  { key: "type", label: "Answer type", type: "select", options: ["Rating", "Text", "Choice"], defaultValue: "Rating", required: true },
  { key: "required", label: "Required answer", type: "select", options: ["Yes", "No"], defaultValue: "Yes", required: true },
  { key: "options", label: "Options (one per line)", type: "textarea", showWhen: { key: "type", values: ["Choice"] }, required: true },
];

export const eventForm: Form = {
  editor: "event", steps: ["Event details & schedule", "Access & organization", "Pricing"],
  defaults: { status: "Active", visibility: "Public" },
  fields: [
    { key: "name", label: "Event name", type: "text", required: true },
    { key: "description", label: "Description (Markdown)", type: "textarea", format: "markdown", required: true, help: "Markdown: **bold**, *italic*, # heading, and - or 1. lists. Plain text is preserved; HTML and links are never executed." },
    { key: "image", label: "Event image (local preview)", type: "file", accept: ".png,.jpg,.jpeg,.webp", max: 5 },
    { key: "days", label: "Event days", type: "repeat", minItems: 1, required: true, help: "Local wall-clock times in IST. Add one start/end pair per day, in chronological order.", itemFields: [
      { key: "start", label: "Start date and time (IST)", type: "datetime-local", required: true },
      { key: "end", label: "End date and time (IST)", type: "datetime-local", required: true },
    ] },
    { key: "status", label: "Publication status", type: "select", options: ["Draft", "Active", "Inactive"], required: true, step: 1 },
    { key: "visibility", label: "Visibility", type: "select", options: ["Public", "Private", "Unlisted"], required: true, step: 1 },
    { key: "platform", label: "Platform", type: "select", options: ["In person", "Zoom", "YouTube Live", "Other online", "Hybrid"], required: true, step: 1 },
    { key: "venue", label: "Venue / address", type: "text", required: true, step: 1, showWhen: { key: "platform", values: ["In person", "Hybrid"] } },
    { key: "meetingLink", label: "Meeting link", type: "url", required: true, step: 1, showWhen: { key: "platform", values: ["Zoom", "YouTube Live", "Other online", "Hybrid"] }, help: "Stored as configuration only. No meeting is created." },
    { key: "guestAccess", label: "Guest access", type: "select", options: ["Allowed", "Members only"], defaultValue: "Members only", required: true, step: 1 },
    { key: "manager", label: "Event manager", type: "select", options: managers, required: true, step: 1 },
    { key: "category", label: "Category", type: "select", options: ["Workshop", "Festival", "Retreat", "Quiz", "Other"], required: true, step: 1 },
    { key: "membership", label: "Membership eligibility", type: "select", options: ["Everyone", "Active members", "Premium members"], defaultValue: "Everyone", required: true, step: 1 },
    { key: "feedback", label: "Feedback form", type: "select", options: ["None", "Event satisfaction survey", "Module 1 feedback"], defaultValue: "None", step: 1 },
    { key: "pricing", label: "Pricing", type: "select", options: ["Free", "Paid"], defaultValue: "Free", required: true, step: 2, help: "Local pricing configuration, not verified live pricing parity. No checkout or payment integration." },
    { key: "price", label: "Ticket price", type: "number", min: 0.01, required: true, step: 2, showWhen: { key: "pricing", values: ["Paid"] } },
    { key: "currency", label: "Currency", type: "select", options: ["INR", "USD", "EUR"], defaultValue: "INR", required: true, step: 2, showWhen: { key: "pricing", values: ["Paid"] } },
    { key: "capacity", label: "Ticket capacity (blank for unlimited)", type: "number", min: 1, step: 2 },
    { key: "pricingNotes", label: "Pricing / refund notes", type: "textarea", step: 2 },
  ],
};

export const batchForm: Form = {
  editor: "batch", defaults: { status: "Active", progress: 0 },
  fields: [
    { key: "name", label: "Batch name", type: "text", required: true },
    { key: "course", label: "Course", type: "select", options: [...courses], required: true },
    { key: "startDate", label: "Start date", type: "date", required: true },
    { key: "endDate", label: "End date", type: "date", required: true },
    { key: "instructor", label: "Instructor", type: "select", options: [...instructors], required: true },
    { key: "manager", label: "Primary manager", type: "select", options: managers, required: true },
    { key: "additionalManagers", label: "Additional managers", type: "multiselect", options: managers },
    { key: "modules", label: "Modules", type: "multiselect", options: modules, required: true },
    { key: "community", label: "Batch community", type: "select", options: ["None", "Create batch community", "Use existing community"], defaultValue: "None", required: true },
    { key: "communityName", label: "Community name", type: "text", required: true, showWhen: { key: "community", values: ["Create batch community", "Use existing community"] }, help: "Saved as batch configuration only. Does not provision a real community." },
    { key: "status", label: "Status", type: "select", options: ["Active", "Completed", "Archived"], required: true },
  ],
};

export const feedbackForm: Form = {
  editor: "feedback", steps: ["Type & template", "Questions & preview"],
  defaults: { createdOn: DEMO_TODAY, conversions: 0 },
  fields: [
    { key: "name", label: "Form name", type: "text", required: true },
    { key: "type", label: "Form type", type: "select", options: ["Session feedback", "Course-linked", "General survey"], required: true },
    { key: "course", label: "Linked course", type: "select", options: [...courses], required: true, showWhen: { key: "type", values: ["Course-linked"] } },
    { key: "session", label: "Session name", type: "text", required: true, showWhen: { key: "type", values: ["Session feedback"] } },
    { key: "template", label: "Starting template", type: "select", options: ["Blank", "Session essentials", "Course completion"], required: true, help: "Changing to a preset replaces current questions. Choose Blank to retain/edit questions yourself." },
    { key: "description", label: "Introduction", type: "textarea", step: 1 },
    { key: "questions", label: "Questions", type: "repeat", itemFields: questionFields, minItems: 1, required: true, step: 1 },
  ],
};

export const assetForm: Form = {
  editor: "asset", defaults: { uploadedBy: "Demo Admin (local)", uploadedOn: DEMO_TODAY, usage: "Unused", downloads: 0 },
  fields: [
    { key: "type", label: "Asset type", type: "select", options: assetTypes, required: true },
    { key: "name", label: "Asset name", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "localFile", label: "Local file", type: "file", max: 25, required: true, showWhen: { key: "type", values: fileTypes } },
    { key: "link", label: "External URL", type: "url", required: true, showWhen: { key: "type", values: ["YouTube", "Link/Embed"] }, help: "Stored as a link only. External embeds are not executed or fetched." },
  ],
};

export const certificateForm: Form = {
  editor: "certificate", steps: ["Identity & validity", "Design & preview", "Automation & notifications"],
  defaults: { issued: 0, status: "Draft" },
  fields: [
    { key: "name", label: "Certificate name", type: "text", required: true },
    { key: "serialPrefix", label: "Serial prefix", type: "text", required: true, help: "Preview uses PREFIX-0001; unique serial generation is deferred." },
    { key: "description", label: "Description", type: "textarea", required: true },
    { key: "status", label: "Template status", type: "select", options: ["Draft", "Active"], required: true, help: "Active is metadata only; no certificates are issued." },
    { key: "expiry", label: "Expiry rule", type: "select", options: ["Lifetime", "After days", "Fixed date"], defaultValue: "Lifetime", required: true },
    { key: "expiryDays", label: "Days after issuance", type: "number", min: 1, required: true, showWhen: { key: "expiry", values: ["After days"] } },
    { key: "expiryDate", label: "Expiry date", type: "date", required: true, showWhen: { key: "expiry", values: ["Fixed date"] } },
    { key: "design", label: "Design source", type: "select", options: ["Builder", "Local template"], defaultValue: "Builder", required: true, step: 1 },
    { key: "templateFile", label: "Local template (image or PDF)", type: "file", accept: ".png,.jpg,.jpeg,.webp,.pdf", max: 5, required: true, step: 1, showWhen: { key: "design", values: ["Local template"] } },
    { key: "layout", label: "Layout", type: "select", options: ["Landscape", "Portrait"], defaultValue: "Landscape", step: 1, showWhen: { key: "design", values: ["Builder"] } },
    { key: "heading", label: "Heading", type: "text", defaultValue: "Certificate of completion", required: true, step: 1, showWhen: { key: "design", values: ["Builder"] } },
    { key: "body", label: "Certificate body", type: "textarea", defaultValue: "Awarded to {{learner}} for completing {{course}} on {{date}}. Serial: {{serial}}", required: true, step: 1, showWhen: { key: "design", values: ["Builder"] } },
    { key: "signatory", label: "Signatory name / title", type: "text", step: 1, showWhen: { key: "design", values: ["Builder"] } },
    { key: "customFields", label: "Custom fields", type: "repeat", step: 1, itemFields: [
      { key: "label", label: "Field label", type: "text", required: true },
      { key: "value", label: "Preview value", type: "text", required: true },
    ] },
    { key: "automation", label: "Issuance trigger", type: "select", options: ["Manual", "Course completion", "Exam passed"], defaultValue: "Manual", required: true, step: 2, help: "Configuration only. No background automation or PDF generation is implemented." },
    { key: "course", label: "Course", type: "select", options: [...courses], required: true, step: 2, showWhen: { key: "automation", values: ["Course completion"] } },
    { key: "exam", label: "Exam name", type: "text", required: true, step: 2, showWhen: { key: "automation", values: ["Exam passed"] } },
    { key: "threshold", label: "Minimum completion / pass percentage", type: "number", min: 1, max: 100, defaultValue: "100", required: true, step: 2, showWhen: { key: "automation", values: ["Course completion", "Exam passed"] } },
    { key: "notify", label: "Notification configuration", type: "select", options: ["Disabled", "Email", "In-app", "Email and in-app"], defaultValue: "Disabled", required: true, step: 2, help: "No provider is connected. Saving never sends a notification." },
    { key: "notificationSubject", label: "Notification subject", type: "text", required: true, step: 2, showWhen: { key: "notify", values: ["Email", "In-app", "Email and in-app"] } },
    { key: "notificationBody", label: "Notification message", type: "textarea", defaultValue: "Hello {{learner}}, your certificate for {{course}} is ready.", required: true, step: 2, showWhen: { key: "notify", values: ["Email", "In-app", "Email and in-app"] } },
  ],
};
