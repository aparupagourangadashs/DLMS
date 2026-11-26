import { can, type AnyRole, type Resource } from "@/server/auth/permissions";
import { adminNav, type NavSection } from "./navigation";

/**
 * Which resource's `read` permission opens each admin page. `null` means every signed-in staff member.
 * This only shapes the menus; the server still enforces access on every request.
 */
const pageResource: Record<string, Resource | null> = {
  "home/dashboard": null,
  "products/events": "events", "products/mentorships": "courses", "products/ebooks": "courses",
  "products/test-series": "courses", "products/playlists": "courses",
  "learning/batches": "batches", "learning/sessions": "sessions", "learning/announcements": "announcements",
  "learning/feedback-forms": "feedbackForms", "learning/module-library": "modules", "learning/question-bank": "questionBanks",
  "learning/asset-library": "assets", "learning/assessments": "assessments", "learning/submissions": "submissions",
  "learning/session-recordings": "recordings", "learning/certificates": "certificates",
  "users/learners": "learners", "users/team": "team", "users/segments": "segments", "users/new-enrolment": "enrolments",
  "engage/community": "communities", "engage/discussions": "communities", "engage/support": "supportRequests",
  "marketing/campaigns": "campaigns", "marketing/workflows": "campaigns", "marketing/blogs": "blogs",
  "marketing/marketing-banners": "banners", "marketing/leads": "leads", "marketing/promotional-templates": "templates",
  "marketing/promo-codes": "promoCodes", "marketing/testimonials": "testimonials",
  "sales/abandoned-cart": "orders", "sales/cheque-management": "cheques",
  "analytics/sales-enrollment": "reports", "analytics/batch-progress": "reports", "analytics/feedback-rating": "reports",
  "analytics/marketing-analytics": "reports", "analytics/trainer": "reports", "analytics/notification-logs": "reports",
  "analytics/community-analytics": "reports", "analytics/more": "reports", "analytics/advanced-analytics": "reports",
  "settings/my-profile": null, "settings/sub-organizations": "branches", "settings/system-notifications": "settings",
  "settings/audit-log": "audit",
  "settings/categories": "categories", "settings/custom-fields": "customFields", "settings/grading-system": "grading",
  "settings/miscellaneous-fees": "fees", "settings/international-selling": "fees", "settings/learner-experience": "settings",
  "settings/utility-wallet": "wallet",
  "products/courses": "courses",
  "website/site-settings": "siteContent", "website/books": "siteContent", "website/people": "siteContent",
  "website/magazines": "siteContent", "website/videos": "siteContent", "website/legal-pages": "siteContent",
};

/** Screens that exist to change data open on `write`, so a read-only role does not see a screen it cannot use. */
const writePages = new Set(["users/new-enrolment"]);

export function canViewPage(role: AnyRole, section: string, page: string) {
  const key = `${section}/${page}`;
  const resource = pageResource[key];
  // An unmapped page stays visible rather than silently disappearing.
  return resource === null || resource === undefined || can(role, `${resource}:${writePages.has(key) ? "write" : "read"}`);
}

export function visibleAdminNav(role: AnyRole): NavSection[] {
  return adminNav.flatMap((section) => {
    const pages = section.pages.filter((page) => canViewPage(role, section.slug, page.slug));
    if (pages.length === 0) return [];
    const landingPage = pages.some((page) => page.slug === section.landingPage) ? section.landingPage : pages[0].slug;
    return [{ ...section, pages, landingPage }];
  });
}
