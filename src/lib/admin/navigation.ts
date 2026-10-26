import {
  ChartColumn,
  GraduationCap,
  House,
  Megaphone,
  MessagesSquare,
  Package,
  Settings,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Status of a screen relative to the observed specification:
 * - "ready": screen designed from the observed spec (demo data).
 * - "proposed": spec only listed the menu; fields are our proposal for IBMV review.
 * - "decision": requirements must be confirmed by IBMV before design.
 */
export type ScreenStatus = "ready" | "proposed" | "decision";

export type NavPage = {
  slug: string;
  label: string;
  description: string;
  status: ScreenStatus;
};

export type NavSection = {
  slug: string;
  label: string;
  icon: LucideIcon;
  landingPage: string;
  pages: NavPage[];
};

const sections: Omit<NavSection, "landingPage">[] = [
  {
    slug: "home",
    label: "Home",
    icon: House,
    pages: [
      { slug: "dashboard", label: "Dashboard", description: "Weekly performance, enrollments and today's sessions.", status: "ready" },
    ],
  },
  {
    slug: "products",
    label: "Products",
    icon: Package,
    pages: [
      { slug: "events", label: "Events", description: "Create and manage events, visibility and status.", status: "ready" },
      { slug: "mentorships", label: "Mentorships", description: "One-to-one and group mentorship programmes.", status: "decision" },
      { slug: "ebooks", label: "eBooks", description: "Sell and distribute digital books.", status: "decision" },
      { slug: "test-series", label: "Test Series", description: "Bundled practice tests sold as a product.", status: "decision" },
      { slug: "playlists", label: "Playlists", description: "Curated collections of recorded content.", status: "decision" },
    ],
  },
  {
    slug: "learning",
    label: "Learning",
    icon: GraduationCap,
    pages: [
      { slug: "batches", label: "Batches", description: "Course batches, instructors, managers and progress.", status: "ready" },
      { slug: "sessions", label: "Sessions", description: "Live-class calendar with list, day, week and month views.", status: "ready" },
      { slug: "announcements", label: "Announcements", description: "Notices to learners with urgency and tags.", status: "ready" },
      { slug: "feedback-forms", label: "Feedback Forms", description: "Custom feedback and survey forms.", status: "ready" },
      { slug: "module-library", label: "Module Library", description: "Reusable course modules and their content.", status: "ready" },
      { slug: "question-bank", label: "Question Bank", description: "Question banks by exam, subject and topic.", status: "ready" },
      { slug: "asset-library", label: "Asset Library", description: "Videos, documents and other learning assets.", status: "ready" },
      { slug: "assessments", label: "Assessments", description: "Assignment-based and custom-link assessments.", status: "ready" },
      { slug: "submissions", label: "Submissions", description: "Review and evaluate learner submissions.", status: "ready" },
      { slug: "session-recordings", label: "Session Recordings", description: "Recorded classes by batch and instructor.", status: "ready" },
      { slug: "certificates", label: "Certificates", description: "Demo certificate design, validity and issuance configuration.", status: "ready" },
    ],
  },
  {
    slug: "users",
    label: "Users",
    icon: Users,
    pages: [
      { slug: "learners", label: "Learners", description: "Learner directory, status and registration.", status: "ready" },
      { slug: "team", label: "Team", description: "Staff accounts, roles and branches.", status: "ready" },
      { slug: "segments", label: "Segments", description: "Learner groups for targeting and reporting.", status: "ready" },
      { slug: "new-enrolment", label: "New Enrolment", description: "Single, bulk and advanced enrolment.", status: "ready" },
    ],
  },
  {
    slug: "engage",
    label: "Engage",
    icon: MessagesSquare,
    pages: [
      { slug: "community", label: "Community", description: "Learner communities, members, messages and pins.", status: "ready" },
      { slug: "discussions", label: "Discussions", description: "Course discussion threads.", status: "decision" },
    ],
  },
  {
    slug: "marketing",
    label: "Marketing",
    icon: Megaphone,
    pages: [
      { slug: "campaigns", label: "Campaigns", description: "Email, WhatsApp, SMS and push campaigns.", status: "ready" },
      { slug: "workflows", label: "Workflows", description: "Automated, trigger-based communication.", status: "decision" },
      { slug: "blogs", label: "Blogs", description: "Blog posts with visibility and view counts.", status: "ready" },
      { slug: "marketing-banners", label: "Marketing Banners", description: "Promotional banners shown to learners.", status: "ready" },
      { slug: "leads", label: "Leads", description: "Enquiries from the website and campaigns.", status: "proposed" },
      { slug: "promotional-templates", label: "Promotional Templates", description: "Browser-local Email, SMS, WhatsApp and Push template drafts.", status: "ready" },
      { slug: "promo-codes", label: "Promo Codes", description: "Demo discount codes with validity, visibility and usage limits.", status: "ready" },
      { slug: "testimonials", label: "Testimonials", description: "Learner testimonials for the website.", status: "proposed" },
    ],
  },
  {
    slug: "sales",
    label: "Sales",
    icon: ShoppingCart,
    pages: [
      { slug: "abandoned-cart", label: "Abandoned Cart", description: "Checkouts that were not completed.", status: "ready" },
      { slug: "cheque-management", label: "Cheque Management", description: "Synthetic cheque register, filters and proposed local status handling.", status: "ready" },
    ],
  },
  {
    slug: "analytics",
    label: "Analytics",
    icon: ChartColumn,
    pages: [
      { slug: "sales-enrollment", label: "Sales & Enrollment", description: "Enrollments, sales, payments and GST reports.", status: "ready" },
      { slug: "batch-progress", label: "Batch & Progress", description: "Batch completion and learner progress.", status: "proposed" },
      { slug: "feedback-rating", label: "Feedback & Rating", description: "Ratings and feedback form results.", status: "proposed" },
      { slug: "marketing-analytics", label: "Marketing", description: "Campaign reach and conversion.", status: "proposed" },
      { slug: "trainer", label: "Trainer", description: "Instructor sessions, attendance and ratings.", status: "proposed" },
      { slug: "notification-logs", label: "Notification Logs", description: "Delivery logs for every channel.", status: "proposed" },
      { slug: "community-analytics", label: "Community Analytics", description: "Community activity and engagement.", status: "proposed" },
      { slug: "more", label: "More", description: "Synthetic branch, storage, bandwidth, task, user-time and wallet reports.", status: "ready" },
      { slug: "advanced-analytics", label: "Advanced Analytics", description: "Custom cross-module reports.", status: "proposed" },
    ],
  },
  {
    slug: "settings",
    label: "Settings",
    icon: Settings,
    pages: [
      { slug: "my-profile", label: "My Profile", description: "Your personal details, preferences and password.", status: "ready" },
      { slug: "sub-organizations", label: "Sub-Organizations", description: "Demo branches, managers and activity.", status: "ready" },
      { slug: "system-notifications", label: "System Notifications", description: "Event-family preferences and unconnected delivery channels.", status: "ready" },
      { slug: "categories", label: "Categories", description: "Course and product category hierarchy.", status: "ready" },
      { slug: "custom-fields", label: "Custom Fields", description: "Scoped fields and registration placement.", status: "ready" },
      { slug: "grading-system", label: "Grading System", description: "Validated demo grade-band configuration.", status: "ready" },
      { slug: "miscellaneous-fees", label: "Miscellaneous Fees", description: "Demo fee templates with descriptions.", status: "ready" },
      { slug: "international-selling", label: "International Selling", description: "Demo currencies, branch availability and pricing.", status: "ready" },
      { slug: "learner-experience", label: "Learner Experience", description: "Learner-menu configuration and visibility preview.", status: "ready" },
      { slug: "utility-wallet", label: "Utility Wallet", description: "Synthetic messaging credits, usage and recharge history.", status: "ready" },
    ],
  },
];

const byLabel = (a: { label: string }, b: { label: string }) =>
  a.label.localeCompare(b.label, "en", { sensitivity: "base" });

export const adminNav: NavSection[] = sections
  .map((section) => ({
    ...section,
    landingPage: section.pages[0].slug,
    pages: [...section.pages].sort(byLabel),
  }))
  .sort(byLabel);

export function pageHref(section: string, page: string) {
  return section === "home" ? "/admin" : `/admin/${section}/${page}`;
}

export function findPage(section: string, page: string) {
  const sec = adminNav.find((s) => s.slug === section);
  const pg = sec?.pages.find((p) => p.slug === page);
  return sec && pg ? { section: sec, page: pg } : null;
}

export const HELP_HOME = "/admin/help";

export function helpHref(section: string, page: string) {
  return `${HELP_HOME}/${section}/${page}`;
}

/** Splits an admin URL into its section/page, for both normal pages and their help articles. */
export function parseAdminPath(pathname: string): { help: boolean; section?: string; page?: string } {
  const parts = pathname.split("/").filter(Boolean);
  const help = parts[1] === "help";
  const rest = parts.slice(help ? 2 : 1);
  if (rest.length === 0) return help ? { help } : { help, section: "home", page: "dashboard" };
  return { help, section: rest[0], page: rest[1] };
}

export function findSectionByPath(pathname: string) {
  const { section } = parseAdminPath(pathname);
  return adminNav.find((s) => s.slug === section) ?? adminNav.find((s) => s.slug === "home") ?? adminNav[0];
}

export const quickCreate = [
  { label: "Batch", key: "learning/batches" },
  { label: "Session", key: "learning/sessions" },
  { label: "Announcement", key: "learning/announcements" },
  { label: "Learner", key: "users/learners" },
  { label: "Event", key: "products/events" },
  { label: "Campaign", key: "marketing/campaigns" },
  { label: "Blog", key: "marketing/blogs" },
  { label: "Enrolment", key: "users/new-enrolment" },
].sort(byLabel);

export const statusLabel: Record<ScreenStatus, string> = {
  ready: "Designed from spec",
  proposed: "Proposed design",
  decision: "Needs IBMV decision",
};
