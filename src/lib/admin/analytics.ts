export type ReportColumn = { key: string; label: string; unit?: "INR" | "%" | "minutes" | "GB" };
export type Report = { title: string; description: string; subject: string; columns: ReportColumn[] };
export type AnalyticsPageData = { reports: Report[]; restricted?: boolean };
export type ReportRow = Record<string, string | number>;

export const REPORT_AS_OF = "2026-10-26";
export const reportBranches = ["Main Campus", "North Branch", "Online"];
export const reportCourses = ["Bhakti Shastri", "Sanskrit for Beginners", "Vedic Parenting"];

function report(title: string, description: string, subject: string, metrics: Array<string | [string, ReportColumn["unit"]] >): Report {
  return {
    title, description, subject,
    columns: [
      { key: "date", label: "Date" }, { key: "branch", label: "Branch" },
      { key: "course", label: "Course" }, { key: "subject", label: subject }, { key: "status", label: "Status" },
      ...metrics.map((metric, i) => ({ key: `metric${i}`, label: typeof metric === "string" ? metric : metric[0], unit: typeof metric === "string" ? undefined : metric[1] })),
    ],
  };
}

export const analytics: Record<string, AnalyticsPageData> = {
  "sales-enrollment": { reports: [
    report("Product Enrollments", "Daily product registrations and paid enrollments.", "Product", ["Enrollments", "Paid enrollments"]),
    report("Sales Overview", "Synthetic gross, discounts, refunds and net, in INR.", "Product", [["Gross", "INR"], ["Discounts", "INR"], ["Refunds", "INR"], ["Net", "INR"]]),
    report("Payments Received", "Demo settled payments; references are not gateway records.", "Payment reference", [["Amount", "INR"]]),
    report("Course Wise Enrollments", "Daily cohort active and completed enrollments.", "Course cohort", ["Active", "Completed", "Total"]),
    report("Event Enrollments", "Registrations and attendees per demo event.", "Event", ["Registered", "Attended"]),
    report("Membership Enrollments", "Daily new, renewed and expired memberships.", "Membership", ["New", "Renewed", "Expired"]),
    report("GST Report", "Illustrative 18% GST only; not a filing or tax calculation.", "Invoice", [["Taxable", "INR"], ["GST (18%)", "INR"], ["Total", "INR"]]),
  ] },
  "batch-progress": { reports: [
    report("Batch Progress", "Progress of synthetic dated learner cohorts.", "Batch", ["Learners", ["Progress", "%"], "Completed"]),
    report("Batch Performance", "Pass rate and mean score for batch assessments.", "Batch", ["Assessed", "Passed", ["Mean score", "%"]]),
    report("Learner Progress", "Lessons completed and progress for demo learners.", "Learner", ["Lessons assigned", "Lessons completed", ["Progress", "%"]]),
    report("Attendance Report", "Course-level expected and present learners.", "Session", ["Expected", "Present", ["Attendance", "%"]]),
    report("Batch Attendance", "Separate batch-level attendance rollup.", "Batch", ["Expected", "Present", ["Attendance", "%"]]),
    report("Module Progress", "Module assignments and completion.", "Module", ["Assigned", "Completed", ["Progress", "%"]]),
    report("Batch Assessment", "Assessment assignments, submissions and passes.", "Assessment", ["Assigned", "Submitted", "Passed"]),
    report("Assessment Attempts", "Demo attempt score and time spent.", "Attempt", [["Score", "%"], ["Time spent", "minutes"]]),
    report("Issued Certificates", "Certificates issued to synthetic cohorts.", "Certificate template", ["Issued"]),
    report("Inactive Learners", "Demo learners with 14 or more inactive days.", "Learner", ["Inactive days"]),
  ] },
  "feedback-rating": { reports: [
    report("Course Ratings", "Response count and mean course rating out of five.", "Course", ["Responses", "Rating / 5"]),
    report("Form Responses", "Submitted and invited feedback responses.", "Feedback form", ["Invited", "Responses"]),
    report("Instructor Ratings", "Ratings of demo instructors out of five.", "Instructor", ["Responses", "Rating / 5"]),
    report("Session Feedback", "Session-specific feedback responses and rating.", "Session", ["Responses", "Rating / 5"]),
    report("Batch Rating", "Separate batch rating and response count.", "Batch", ["Responses", "Rating / 5"]),
    report("Trainer Feedback", "Trainer feedback and recommendation percentage.", "Trainer", ["Responses", ["Recommend", "%"]]),
    report("Event Feedback", "Event feedback responses and mean rating.", "Event", ["Responses", "Rating / 5"]),
  ] },
  "marketing-analytics": { reports: [
    report("Campaign Performance", "Synthetic delivered, opened, clicked and converted funnel.", "Campaign", ["Delivered", "Opened", "Clicked", "Converted"]),
    report("Promo Code Usage", "Demo redemptions and discounts, unrelated to local code edits.", "Promo code", ["Redemptions", ["Discount value", "INR"]]),
    report("Lead Sources", "Enquiries and conversions by source.", "Lead source", ["Enquiries", "Converted"]),
  ] },
  trainer: { reports: [
    report("Trainer Summary", "Trainer sessions, attendance and mean rating.", "Instructor", ["Sessions", ["Attendance", "%"], "Rating / 5"]),
    report("Session Log", "Dated demo sessions, duration and participant count.", "Session", [["Duration", "minutes"], "Participants"]),
  ] },
  "notification-logs": { reports: [
    report("Delivery Log", "Demo message deliveries; no provider is connected.", "Channel", ["Sent", "Delivered", "Failed"]),
    report("Failures", "Synthetic failed deliveries by channel, not a retry queue.", "Channel", ["Failed"]),
    report("Opt-outs", "Synthetic unsubscribe events, not actual learner preferences.", "Channel", ["Opt-outs"]),
  ] },
  "community-analytics": { reports: [
    report("Community Activity", "Posts, replies and active members per community.", "Community", ["Posts", "Replies", "Active members"]),
    report("Community Overall Activity", "Daily total messages and contributors.", "Community", ["Messages", "Contributors"]),
    report("Inbox Activity", "Inbox conversations opened, replied and unresolved.", "Inbox", ["Opened", "Replied", "Unresolved"]),
    report("Course Engagement", "Course views, discussions and participating learners.", "Course community", ["Views", "Discussions", "Participants"]),
    report("Member Participation", "Posts, replies and active minutes per demo member.", "Member", ["Posts", "Replies", ["Time spent", "minutes"]]),
    report("Top Contributors", "Contribution totals per synthetic member; sortable in preview.", "Member", ["Posts", "Replies", "Contributions"]),
  ] },
  more: { reports: [
    report("Branch Statistics", "Registrations, enrollments and revenue by branch.", "Branch cohort", ["Registrations", "Enrollments", ["Revenue", "INR"]]),
    report("Storage Consumption", "Daily synthetic storage additions, not current occupied storage.", "Asset type", [["Added", "GB"]]),
    report("Bandwidth Consumption", "Daily transferred data and requests.", "Asset type", [["Transferred", "GB"], "Requests"]),
    report("Scheduled Tasks", "Synthetic daily queued, completed and failed tasks.", "Task type", ["Queued", "Completed", "Failed"]),
    report("User-time Statistics", "Dated active users and total time spent.", "User group", ["Active users", ["Time spent", "minutes"]]),
    report("Wallet Recharges", "Synthetic recharge amounts and credits, not real wallet transactions.", "Recharge channel", [["Amount", "INR"], "Credits"]),
  ] },
  "advanced-analytics": { restricted: true, reports: [
    report("Custom Report Builder", "Local column selection and filtered CSV only; no scheduled or saved production reports.", "Cohort", ["Users", "Enrollments", ["Progress", "%"]]),
    report("Cohort Analysis", "Synthetic cohort retention; not verified against the restricted live route.", "Cohort", ["Joined", "Retained", ["Retention", "%"]]),
    report("Advanced User Analytics", "Proposed synthetic activity preview; live route access was restricted.", "User group", ["Active users", ["Time spent", "minutes"]]),
    report("Advanced Test Analytics", "Proposed test performance preview; live fields remain unverified.", "Test", ["Attempts", "Passed", ["Mean score", "%"]]),
    report("Advanced Course Analytics", "Proposed course completion preview; live fields remain unverified.", "Course cohort", ["Enrolled", "Completed", ["Completion", "%"]]),
  ] },
};

const subjects: Record<string, string[]> = {
  Channel: ["Email", "SMS", "WhatsApp", "Push"], Instructor: ["Demo trainer A", "Demo trainer B", "Demo trainer C"],
  Trainer: ["Demo trainer A", "Demo trainer B", "Demo trainer C"], "Lead source": ["Website", "Referral", "Campaign"],
  "Asset type": ["Video", "Documents", "Audio"], "Task type": ["Notification", "Report export", "Certificate generation"],
  "Recharge channel": ["Demo UPI", "Demo card", "Demo bank transfer"], "Promo code": ["DEMO10", "DEMO20", "WELCOME"],
};

/** A deterministic fixture anchored to the audit date, never a production query. */
export function getReportRows(report: Report, days: number): ReportRow[] {
  const seed = [...report.title].reduce((n, c) => n + c.charCodeAt(0), 0);
  return Array.from({ length: days * 3 }, (_, index) => {
    const day = Math.floor(index / 3);
    const branch = index % 3;
    const date = new Date(`${REPORT_AS_OF}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - day);
    const n = (seed + day * 17 + branch * 13) % 83 + 18;
    const part = Math.floor(n * 0.72);
    const row: ReportRow = {
      date: date.toISOString().slice(0, 10), branch: reportBranches[branch],
      course: reportCourses[(day + branch) % 3],
      subject: subjects[report.subject]?.[(day + branch) % subjects[report.subject].length] ?? `${report.subject} ${1 + (day + branch) % 8}`,
      status: report.title === "Failures" ? "Failed" : report.title === "Opt-outs" ? "Unsubscribed" :
        ["Payments Received", "GST Report", "Wallet Recharges"].includes(report.title) ? "Settled" :
        report.title === "Issued Certificates" ? "Issued" : ["Completed", "Pending", "Active"][(day + branch) % 3],
    };
    report.columns.slice(5).forEach((column, i) => {
      const label = column.label;
      let value = Math.max(1, n - i * 12);
      if (column.unit === "INR") value = n * 100;
      if (column.unit === "%") value = Math.round(part / n * 100);
      if (column.unit === "GB") value = Number((n / 30).toFixed(2));
      if (column.unit === "minutes") value = n * 4;
      if (label === "Rating / 5") value = Number((3.5 + (n % 16) / 10).toFixed(1));
      if (["Completed", "Present", "Retained", "Paid enrollments", "Lessons completed", "Submitted", "Attended"].includes(label)) value = part;
      if (label === "Total" && report.title === "Course Wise Enrollments") value = n + part;
      if (label === "Progress" && report.title === "Batch Progress") value = Math.round(part / n * 100);
      if (report.title === "Sales Overview") value = [n * 100, n * 10, n * 5, n * 85][i];
      if (report.title === "GST Report") value = [n * 100, n * 18, n * 118][i];
      if (report.title === "Campaign Performance") value = [n * 100, n * 45, n * 8, n][i];
      if (report.title === "Delivery Log") value = [n * 10, n * 9, n][i];
      if (report.title === "Inbox Activity") value = [n, part, n - part][i];
      if (report.title === "Scheduled Tasks") value = [n, part, n - part][i];
      if (report.title === "Batch Assessment") value = [n, part, Math.floor(part * 0.8)][i];
      if (report.title === "Cohort Analysis") value = [n, part, Math.round(part / n * 100)][i];
      if (report.title === "Promo Code Usage") value = i === 0 ? n : n * 50;
      if (report.title === "Top Contributors" && i === 2) value = n + n - 12;
      if (label === "Inactive days") value = 14 + n;
      row[column.key] = value;
    });
    return row;
  });
}
