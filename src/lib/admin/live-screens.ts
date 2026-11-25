/**
 * Admin screens whose data comes from the database, not from demo fixtures.
 * Registered list screens must be listed here (a server test enforces it); custom screens are added by hand.
 */
export const liveScreens: ReadonlySet<string> = new Set([
    "users/team",
    "users/learners",
    "users/new-enrolment",
    "learning/batches",
    "learning/sessions",
    "learning/announcements",
    "learning/module-library",
    "engage/support",
    "settings/my-profile",
    "settings/sub-organizations",
    "settings/categories",
    "products/courses",
    "marketing/leads",
    "marketing/testimonials",
    "website/site-settings",
    "website/books",
    "website/people",
    "website/magazines",
    "website/videos",
    "website/legal-pages",
]);
