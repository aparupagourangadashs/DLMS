import { addDays } from "@/lib/ist";

export type ReportColumn = { key: string; label: string; kind?: "text" | "number" | "percent" | "date" | "size" };
export type ReportRow = Record<string, string | number | null>;
export type ReportChart = { title: string; seriesLabel: string; labels: string[]; values: number[]; unit?: "%" };
export type ReportData = { columns: ReportColumn[]; rows: ReportRow[]; chart: ReportChart | null; truncated: boolean; sort?: { key: string; dir: "asc" | "desc" } };

export type ReportMeta = {
    key: string;
    title: string;
    description: string;
    /** The filters that change this report; the others are hidden. */
    filters: { range?: boolean; branch?: boolean; course?: boolean; status?: string[] };
    defaultSort: { key: string; dir: "asc" | "desc" };
    /** What the report is waiting for. A report that waits is listed but cannot be opened yet. */
    waitsFor?: string;
};

const waits = (key: string, title: string, description: string, waitsFor: string): ReportMeta => ({ key, title, description, filters: {}, defaultSort: { key: "date", dir: "desc" }, waitsFor });

/** Analytics pages that read the database. A page that is not here still shows its sample data. */
export const reportPages: Record<string, ReportMeta[]> = {
    "sales-enrollment": [
        { key: "product-enrollments", title: "Product Enrollments", description: "New learners and new enrolments for each day, and how many enrolments were paid for.", filters: { range: true, branch: true, course: true }, defaultSort: { key: "date", dir: "desc" } },
        waits("sales-overview", "Sales Overview", "Gross sales, discounts, refunds and net.", "Payments (phase B5)"),
        waits("payments-received", "Payments Received", "Settled payments by reference.", "Payments (phase B5)"),
        { key: "course-enrollments", title: "Course Wise Enrollments", description: "Enrolments for each course: new in the period, active now, completed and all together.", filters: { range: true, branch: true, course: true }, defaultSort: { key: "total", dir: "desc" } },
        waits("event-enrollments", "Event Enrollments", "Registrations and attendees for each event.", "Event tickets (phase B5)"),
        waits("membership-enrollments", "Membership Enrollments", "New, renewed and expired memberships.", "Memberships (phase B5)"),
        waits("gst-report", "GST Report", "Taxable value, GST and totals by invoice.", "Payments and the GST format (phase B5, decision D6)"),
    ],
    "batch-progress": [
        { key: "batch-progress", title: "Batch Progress", description: "Learners, average progress and completions for each batch, as they stand now.", filters: { branch: true, course: true, status: ["Active", "Completed", "Archived"] }, defaultSort: { key: "learners", dir: "desc" } },
        waits("batch-performance", "Batch Performance", "Pass rate and mean score for batch assessments.", "Assessments (phase B6)"),
        { key: "learner-progress", title: "Learner Progress", description: "Lessons completed and progress for each learner's enrolment.", filters: { branch: true, course: true, status: ["Active", "Completed"] }, defaultSort: { key: "progress", dir: "desc" } },
        { key: "attendance", title: "Attendance Report", description: "Expected and present learners for each class that has attendance marked.", filters: { range: true, branch: true, course: true }, defaultSort: { key: "date", dir: "desc" } },
        { key: "batch-attendance", title: "Batch Attendance", description: "Classes, expected and present learners, and attendance for each batch.", filters: { range: true, branch: true, course: true }, defaultSort: { key: "classes", dir: "desc" } },
        { key: "module-progress", title: "Module Progress", description: "For each module: learners who have it, lessons completed and progress.", filters: { branch: true, course: true }, defaultSort: { key: "learners", dir: "desc" } },
        waits("batch-assessment", "Batch Assessment", "Assessment assignments, submissions and passes.", "Assessments (phase B6)"),
        waits("assessment-attempts", "Assessment Attempts", "Score and time spent for each attempt.", "Assessments (phase B6)"),
        waits("issued-certificates", "Issued Certificates", "Certificates issued for each template.", "Certificates (phase B6)"),
        { key: "inactive-learners", title: "Inactive Learners", description: "Learners with an active enrolment and no sign-in or lesson for 14 days or more.", filters: { branch: true, course: true }, defaultSort: { key: "inactiveDays", dir: "desc" } },
    ],
    "marketing-analytics": [
        waits("campaign-performance", "Campaign Performance", "Delivered, opened, clicked and converted.", "Campaigns (phase B7)"),
        waits("promo-code-usage", "Promo Code Usage", "Redemptions and discount value for each code.", "Promo codes (phase B5)"),
        { key: "lead-sources", title: "Lead Sources", description: "Enquiries and conversions for each source.", filters: { range: true }, defaultSort: { key: "enquiries", dir: "desc" } },
    ],
    trainer: [
        { key: "trainer-summary", title: "Trainer Summary", description: "Classes, attendance and batches for each trainer. Ratings arrive with feedback forms.", filters: { range: true, branch: true, course: true }, defaultSort: { key: "classes", dir: "desc" } },
        { key: "session-log", title: "Session Log", description: "Every class in the period with its trainer, length and attendance.", filters: { range: true, branch: true, course: true, status: ["Held", "Upcoming", "Cancelled"] }, defaultSort: { key: "date", dir: "desc" } },
    ],
    more: [
        { key: "branch-statistics", title: "Branch Statistics", description: "Registrations, enrolments and active batches for each branch. Revenue arrives with payments.", filters: { range: true, branch: true }, defaultSort: { key: "enrolments", dir: "desc" } },
        { key: "storage-consumption", title: "Storage Consumption", description: "Files stored for each asset type, and what was added in the period.", filters: { range: true }, defaultSort: { key: "size", dir: "desc" } },
        waits("bandwidth", "Bandwidth Consumption", "Data transferred and requests.", "A download log (not built yet)"),
        waits("scheduled-tasks", "Scheduled Tasks", "Queued, completed and failed background tasks.", "The background job worker (phase B7)"),
        waits("user-time", "User-time Statistics", "Active users and time spent.", "Activity tracking (later in phase B8)"),
        waits("wallet-recharges", "Wallet Recharges", "Recharge amounts and credits.", "The Utility Wallet (phase B7)"),
    ],
};

export const isLiveReportPage = (page: string) => Object.hasOwn(reportPages, page);
export const findReport = (page: string, key: string) => (isLiveReportPage(page) ? reportPages[page].find((report) => report.key === key) : undefined);

/** The first and last day of a period that ends today (both included). */
export const lastDays = (today: string, days: number) => ({ from: addDays(today, 1 - days), to: today });
