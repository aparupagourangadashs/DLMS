import type { SummaryCard } from "./types";
import { courses, instructors } from "./demo-data";

export type Report = { title: string; description: string; preview?: { columns: string[]; rows: string[][] } };
export type AnalyticsPageData = {
  kpis: SummaryCard[];
  chart?: { title: string; labels: string[]; series: Array<{ label: string; values: number[]; colorClass: string; swatchClass: string }>; currency?: boolean };
  reports: Report[];
};

const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];

export const analytics: Record<string, AnalyticsPageData> = {
  "sales-enrollment": {
    kpis: [
      { label: "Revenue (30 days)", value: "₹3,74,400", hint: "+14% vs previous", tone: "success" },
      { label: "Enrollments (30 days)", value: "671" },
      { label: "Payments received", value: "512" },
      { label: "Average order value", value: "₹731" },
    ],
    chart: {
      title: "Monthly enrollments and revenue",
      labels: months,
      series: [
        { label: "Enrollments", values: [410, 452, 498, 530, 588, 671], colorClass: "fill-accent", swatchClass: "bg-accent" },
        { label: "Paid enrollments", values: [260, 288, 310, 344, 401, 452], colorClass: "fill-gold", swatchClass: "bg-gold" },
      ],
    },
    reports: [
      { title: "Product Enrollments", description: "Enrollments per product, by period." },
      { title: "Sales Overview", description: "Gross sales, discounts, refunds and net revenue." },
      {
        title: "Payments Received",
        description: "Successful payments with gateway reference.",
        preview: {
          columns: ["Date", "Learner", "Product", "Amount", "Method"],
          rows: [
            ["26 Oct 2026", "Ananya Iyer", "Bhakti Shastri", "₹2,499", "UPI"],
            ["25 Oct 2026", "Rohan Mehta", "Sanskrit for Beginners", "₹999", "Card"],
            ["25 Oct 2026", "Meera Nair", "Vedic Parenting", "₹1,499", "UPI"],
            ["24 Oct 2026", "Vikram Das", "Bhagavad Gita – Foundation Course", "₹499", "Net banking"],
          ],
        },
      },
      {
        title: "Course Wise Enrollments",
        description: "Active, completed and total enrollments per course.",
        preview: {
          columns: ["Course", "Active", "Completed", "Total"],
          rows: courses.slice(0, 6).map((c, i) => [c, String(120 - i * 13), String(60 + i * 7), String(180 - i * 6)]),
        },
      },
      { title: "Event Enrollments", description: "Registrations and attendance for events." },
      { title: "Membership Enrollments", description: "New, renewed and expired memberships." },
      { title: "GST Report", description: "Tax summary for filing. Format to be confirmed with IBMV." },
    ],
  },
  "batch-progress": {
    kpis: [
      { label: "Active batches", value: "16" },
      { label: "Average progress", value: "58%" },
      { label: "Completion rate", value: "71%", tone: "success" },
      { label: "At-risk learners", value: "84", tone: "warning", hint: "no activity in 14 days" },
    ],
    reports: [
      {
        title: "Batch Progress",
        description: "Progress and completion for each batch.",
        preview: { columns: ["Batch", "Learners", "Avg. progress", "Completed"], rows: [["BGFC-2026-B1", "48", "72%", "21"], ["BS-2026-B1", "36", "54%", "8"], ["SFB-2026-B2", "52", "41%", "3"]] },
      },
      { title: "Learner Progress", description: "Lesson-level progress per learner." },
      { title: "Attendance Report", description: "Live-class attendance by batch and learner." },
      { title: "Inactive Learners", description: "Learners with no activity in a chosen period." },
    ],
  },
  "feedback-rating": {
    kpis: [
      { label: "Average rating", value: "4.7 / 5", tone: "success" },
      { label: "Responses (30 days)", value: "1,284" },
      { label: "Forms active", value: "6" },
    ],
    reports: [
      { title: "Course Ratings", description: "Average rating and distribution per course." },
      { title: "Form Responses", description: "Responses to each feedback form." },
      { title: "Instructor Ratings", description: "Ratings given to each instructor." },
    ],
  },
  "marketing-analytics": {
    kpis: [
      { label: "Campaigns sent (30 days)", value: "14" },
      { label: "Messages delivered", value: "38,210" },
      { label: "Click-through rate", value: "6.4%" },
      { label: "Leads converted", value: "112", tone: "success" },
    ],
    reports: [
      { title: "Campaign Performance", description: "Delivery, opens, clicks and conversions per campaign." },
      { title: "Promo Code Usage", description: "Redemptions and discount value per code." },
      { title: "Lead Sources", description: "Where enquiries come from and how they convert." },
    ],
  },
  trainer: {
    kpis: [
      { label: "Instructors", value: String(instructors.length) },
      { label: "Sessions taken (30 days)", value: "96" },
      { label: "Average attendance", value: "78%" },
    ],
    reports: [
      {
        title: "Trainer Summary",
        description: "Sessions, attendance and rating per instructor.",
        preview: { columns: ["Instructor", "Sessions", "Attendance", "Rating"], rows: instructors.slice(0, 4).map((n, i) => [n, String(18 - i * 2), `${82 - i * 3}%`, (4.9 - i * 0.1).toFixed(1)]) },
      },
      { title: "Session Log", description: "Every session with start time, duration and sign-in." },
    ],
  },
  "notification-logs": {
    kpis: [
      { label: "Sent today", value: "2,418" },
      { label: "Delivered", value: "97.8%", tone: "success" },
      { label: "Failed", value: "53", tone: "danger" },
    ],
    reports: [
      { title: "Delivery Log", description: "Every message with channel, status and provider response." },
      { title: "Failures", description: "Failed deliveries with reason, for follow-up." },
      { title: "Opt-outs", description: "Learners who unsubscribed, per channel." },
    ],
  },
  "community-analytics": {
    kpis: [
      { label: "Communities", value: "2" },
      { label: "Messages (30 days)", value: "1,906" },
      { label: "Active members", value: "642" },
    ],
    reports: [
      { title: "Community Activity", description: "Posts, replies and active members over time." },
      { title: "Top Contributors", description: "Most active members per community." },
    ],
  },
  "advanced-analytics": {
    kpis: [
      { label: "Saved reports", value: "0" },
      { label: "Scheduled exports", value: "0" },
    ],
    reports: [
      { title: "Custom Report Builder", description: "Choose data, filters and columns. Scope to be agreed with IBMV." },
      { title: "Cohort Analysis", description: "Compare learner groups over time." },
    ],
  },
};
