# Admin Panel: Observed Feature and Development Specification

## 1. Purpose and inspection scope

This document records a read-only inspection of the administrator interface for
ISKCON Bhagavata Mahavidyalaya. It is intended as a feature and navigation
reference for building a comparable admin panel; it is not a description of
the site's implementation or backend API.

- Public site: `https://www.ibmedu.org/`
- Admin application observed at: `https://courses.ibmedu.org/v2/app/`
- Inspection date: 2026-10-19
- The sign-in flow succeeded and the application displayed an administrator
  role. Credentials and personal learner/account information are intentionally
  not recorded here.
- No records, settings, or messages were intentionally created, edited,
  deleted, or sent. Navigation was tested across the visible menus. No
  create/edit forms were submitted.

The application is a hosted LMS admin interface. Observations below are
classified as:

- **Observed** — visible directly in a menu or page during inspection.
- **Inferred** — likely purpose based on the menu label; the page's actions
  were not verified.

Some pages showed empty tables, prolonged loading, or failed data requests
(including HTTP 400/404 responses in the browser console). This means a blank
or incomplete result should not be interpreted as proof that a feature has no
data or no further actions.

## 2. Application shell and navigation

### Header

Observed shared header elements:

- Global search, with a `Ctrl+K` shortcut hint.
- A **New** menu for quick creation actions (contents not fully inspected).
- A notification entry point.
- Signed-in user/profile menu with the account role.

### Primary navigation

The persistent left navigation has nine sections:

1. Home
2. Products
3. Learning
4. Users
5. Engage
6. Marketing
7. Sales
8. Analytics
9. Settings

Selecting a section exposes a secondary navigation list. Menu routes use a
hash-based organization route pattern, e.g. `#/organization/dashboard`.

## 3. Menu and page inventory

### Home

**Dashboard** — observed at `#/organization/dashboard`.

- Weekly performance cards: average time spent, total views, and average
  rating, with comparison to the previous week.
- Daily active users metric.
- Enrollment chart with a `Signup vs Enrollments` / `Sales` selector.
- Today's sessions panel with date navigation, date selection, and a **View
  Calendar** link.
- Session summary metrics: scheduled/cancelled sessions, sign-ins,
  non-sign-ins, and attendance.
- Session list with sign-in/action controls and a **Mark as Holiday** action.
- **Schedule Session** and **What's New** entry points.

### Products

| Submenu | Function recorded |
|---|---|
| Events | **Observed:** Event management list; event status/visibility filter; `Create Event` action; list columns include event name, event date, visibility, status, and actions. An inactive state label was shown. |
| Mentorships | **Observed:** Route opened but remained in a loading state during inspection; controls and fields could not be confirmed. |
| eBooks | **Observed:** Page displayed a **Coming Soon** state; no management controls or list fields were available. |
| Test Series | **Observed:** Page displayed a **Coming Soon** state; no management controls or list fields were available. |
| Playlists | **Observed:** Page displayed a **Coming Soon** state; no management controls or list fields were available. |

Event creation/editing flows remain to be confirmed.

### Learning

| Submenu | Function recorded |
|---|---|
| Batches | **Observed:** Batch list; filters for batch status, course, module, and instructor; tabs for Active, Completed, Archived, and All; `Create Batch` action; batch table includes course, duration, module/instructor, batch manager, progress, and actions. |
| Sessions | **Observed:** Calendar view with List, Day, Week, and Month options; date navigation and `Create Session` action. The dashboard also links here as View Calendar. |
| Announcements | **Observed:** Announcement list with `New Announcement`; date-range and tag filters; search by name; fields include date/time, name, urgency, tags, and actions. |
| Feedback Forms | **Observed:** Custom feedback-form area with `Create New Form`. |
| Module Library | **Observed:** Module list with `Add Module`; search and All tab; fields include module name, content, and actions. |
| Question Bank | **Observed:** Question Banks page with `New Question Bank`. |
| Asset Library | **Observed:** Asset overview with total assets, storage used, unused assets, storage saved, and largest asset; filters for usage and asset type; search and `Add Asset`. The add flow offered Video, Audio, PDF, YouTube, Image, Doc, Sheet, Slide, Text/HTML, Zip, SCORM Zip, Link/Embed, and Epub asset types. |
| Assessments | **Observed:** `Add Assessment` action; Assignment Based and Custom Link tabs; table columns include assessment name, linked courses, price, attempts, unique attempts, registrations, and actions. |
| Submissions | **Observed:** Review list with Not Evaluated, Evaluated, and All tabs; date/other filters; learner name/email search. Fields include learner, assessment, evaluation status, submission date, timeliness, assessment type, marks obtained, total marks, percentage, product, batch, and review action. |
| Session Recordings | **Observed:** Filters for date range and batch; Active, Completed, and Archived batch tabs; recording/class list with class name, batch, instructor, status, and actions. |
| Certificates | **Observed:** Certificates page with a `New Certificate` action; list fields were not exposed in the page snapshot. |

### Users

| Submenu | Function recorded |
|---|---|
| Learners | **Observed:** Learner directory with `Add Learner(s)`; filters for date range, course, batch, and additional filters; tabs for All, Registered, Enrolled, Completed, On Leave, and Archived; configurable columns and Export. List fields include learner name, contact details, date added, status, registration number, and actions. |
| Team | **Observed:** Directory with Active Users and Archived Users tabs; `Add Users` and Export. Fields include name, role, contact details, date added, branch, and actions. |
| Segments | **Observed:** List with `Create New Segment`, All tab, and search; fields include segment name, type, learners, created date, and actions. |
| New Enrolment | **Observed:** Entry page with Single Enrollment, Bulk Enrollment, Learner Registration, and Advanced Bulk Enrollment modes; email input and `Proceed`. Form submission was not tested. |

### Engage

| Submenu | Function recorded |
|---|---|
| Community | **Observed:** Community area with community selection and a community detail view. The inspected account showed two communities. Detail controls included Manage Members, Messages, and Pins. |
| Discussions | **Observed:** Selecting this entry left the V2 interface and opened a legacy `/app/` route with a deprecation notice, package selector, and discussion content. The legacy page was not explored further. |

### Marketing

| Submenu | Function recorded |
|---|---|
| Campaigns | **Observed:** Campaign list with filters for date range, channel type, and status. Table fields include campaign name, type, channel, status, scheduled time, created date, sent count, and actions. |
| Workflows | **Observed:** Route displayed **Access Restricted** for the inspected account. |
| Blogs | **Observed:** List with `Create New Blog`; date-range and visibility filters; search; All tab. Fields include blog name, status, views, created date, and actions. |
| Marketing Banners | **Observed:** List with `Add Banner`; All tab. Fields include thumbnail, banner name, status, and edit action. |
| Leads | **Observed:** Selection navigated away from V2 to a legacy enquiries route; details could not be verified. |
| Promotional Templates | **Not verified:** Navigation was interrupted by a legacy-route transition. |
| Promo Codes | **Not verified:** Navigation was interrupted by a legacy-route transition. |
| Testimonials | **Not verified:** Navigation was interrupted by a legacy-route transition. |

### Sales

| Submenu | Function recorded |
|---|---|
| Abandoned Cart | **Observed:** Abandoned-cart totals/value and last-30-day summary; date-range and course filters; Abandoned/Completed tabs; Export; table includes learner, contact/details, checkout items, cart value, abandoned date, and actions. |
| Cheque Management | **Observed:** Menu entry was visible; page contents and fields were not verified. |

### Analytics

Observed submenu labels:

- Sales & Enrollment
- Batch & Progress
- Feedback & Rating
- Marketing
- Trainer
- Notification Logs
- Community Analytics
- Advanced Analytics
- More

The visible Analytics Suite described itself as a reporting suite for learners,
courses, and tests. Report cards observed included:

- Product Enrollments
- Sales Overview
- Payments Received
- Course Wise Enrollments
- Event Enrollments
- Membership Enrollments
- GST Report

Other report families were shown for batch/progress, feedback/rating,
marketing, trainer, community, and advanced reporting. Individual reports and
filters were not opened or validated.

### Settings

Observed settings groups and entries:

| Group | Entries | Function recorded |
|---|---|---|
| Profile & Organization | My Profile; Sub-Organizations | My Profile displayed field labels for Name, Username, Date of Birth, Gender, Mobile, Alternate Mobile, Email, Permanent Address, State, City, Pincode, Residential Address, notification preferences, and timezone. The page offered `Edit Profile` and `Change password`. Sub-Organizations appears to manage organization hierarchy. |
| System Notifications | System Notifications | Notification/system-message settings; detailed controls were not inspected. |
| Setup & Customization | Categories; Custom Fields; Grading System; Miscellaneous Fees; International Selling; Learner Experience | Configuration areas for catalog taxonomies, extensible fields, grading, fees, international selling, and learner-facing behavior (purpose inferred from labels; detailed fields not inspected). |
| Manage Billing | Utility Wallet | Billing/credit balance area. A wallet balance entry point was also visible in the dashboard header. |

## 4. Routes observed

The following route fragments were visible in the application during
inspection. Routes beyond this list should be confirmed from the running
application rather than guessed.

| Page | Route fragment |
|---|---|
| Dashboard | `#/organization/dashboard` |
| Events | `#/organization/events` |
| Batches | `#/organization/batches` |
| Calendar / Sessions | `#/organization/schedule/calendar` |
| Learners | `#/organization/users/learners` |
| Community | `#/organization/engage/community` |
| Campaigns | `#/organization/marketing/campaigns` |
| Abandoned Cart | `#/organization/sales/abandoned-cart` |
| Sales & Enrollment analytics | `#/organization/analytics/sales-enrollment` |
| Settings / My Profile | `#/organization/settings/my-profile` |
| Feedback Forms | `#/organization/feedback-forms` |
| Question Bank | `#/organization/question-bank` |
| Assessments | `#/organization/assessments/assignmentbased` |
| Session Recordings | `#/organization/recordings` |
| Asset Library | `#/organization/asset-library` |
| Announcements | `#/organization/announcements` |
| Module Library | `#/organization/module-library` |
| Submissions | `#/organization/submissions` |
| Certificates | `#/organization/certificates` |
| Team | `#/organization/users/team` |
| Segments | `#/organization/segments` |
| New Enrolment | `#/organization/users/new-enrollments` |
| Blogs | `#/organization/marketing/blogs` |
| Marketing Banners | `#/organization/marketing/marketing-banners` |

## 5. Visible list fields and screen controls

This records the visible list columns or major page controls. `Actions` and
`Review` denote row-level controls; the individual operations behind them
were not opened. Sequence-number and selection columns are noted when visible.

| Page | Visible columns / fields | Filters, tabs, or primary controls |
|---|---|---|
| Dashboard sessions | Session, attendance, status, topics, actions | Date selection/navigation; View Calendar; Mark as Holiday; Schedule Session |
| Events | Event name, event date, visibility, status, actions; sequence number | Visibility filter; All tab; Create Event; status shown as inactive |
| Batches | Batch name, course, duration, module & instructor, batch manager, batch progress, actions; sequence number | Batch status, course, module, instructor; Active, Completed, Archived, All; Create Batch; Columns |
| Announcements | Date & time, name, urgency, tags, actions; sequence number | Date range; tags; name search; All; New Announcement |
| Feedback Forms | Form name, created on, type, conversions, action; sequence number | Create New Form |
| Module Library | Module name, content, actions | Search; All; Add Module |
| Question Bank | ID, name, difficulty, exam, subject, topic, actions; sequence number | Search; All; New Question Bank |
| Asset Library | Asset name, file name, uploaded by, uploaded on, size, asset type, usage, downloads, actions; sequence number | Usage and asset-type filters; search; Add Asset |
| Assessments | Assessment name, linked courses, price, total attempts, unique attempts, registered, actions; sequence number | Assignment Based, Custom Link, All; Add Assessment |
| Submissions | Learner name, assessment name, evaluation status, submission date, timeliness, assessment type, marks obtained, total marks, percentage, product name, batch name, review | Not Evaluated, Evaluated, All; date and other filters; learner name/email search |
| Session Recordings | Class name, batches, instructor, status, actions; selection and sequence number | Date range; batch; Active Batches, Completed Batches, Archived Batches; recording search |
| Learners | Learner's name, contact details, date added, status, registration no., actions; selection | Date range; course; batch; more filters; All, Registered, Enrolled, Completed, On Leave, Archived; Columns; Export; Add Learner(s) |
| Team | Name, role, contact details, date added, branch, actions | Active Users, Archived Users; search; Add Users; Export |
| Segments | Segment name, type, learners, created on, actions | Search; All; Create New Segment |
| Campaigns | Campaign name, type, channel, status, scheduled time, created on, sent, actions; sequence number | Date range; channel type; status; All; campaign search |
| Blogs | Blog name, status, views, created on, actions; sequence number | Date range; visibility; All; Search Blogs; Create New Blog |
| Marketing Banners | Thumbnail, banner name, status, edit; sequence number | All; Add Banner |
| Abandoned Cart | Learner name, learner details/contact, checkout items, cart value, abandoned on, actions; sequence number | Date range; course; Abandoned, Completed; Export; summary cards for total abandons, abandoned value, last 30 days |

Other screens were dashboards, calendars, feature landing pages, or
restricted/unavailable pages and did not expose a list table during
inspection. Analytics report cards were visible, but individual report result
columns remain unverified.

### Verification status

- All visible V2 primary sections and submenu labels were recorded.
- Exact list fields are included above where a table was visible.
- Some menu entries lead to Coming Soon, Access Restricted, a loading page, or
  the legacy interface; these are not verified V2 management screens.
- Create/Add/Export/row-action buttons and the enrollment `Proceed` action are
  entry points only; their effects and form validation were not tested.

## 6. Development blueprint

### Recommended application structure

- **Authenticated shell:** header, global search, notifications, quick-create
  menu, profile menu, and persistent section navigation.
- **Section navigation:** maintain a single route map for primary sections,
  submenus, titles, and breadcrumbs. Keep the active section and active page
  synchronized with the route.
- **Feature modules:** Dashboard, Products, Learning, Users, Engage,
  Marketing, Sales, Analytics, and Settings. Keep page-level data fetching and
  actions within the relevant module.
- **Shared list components:** reusable filters, status tabs, search, column
  selection, export, pagination, empty state, loading state, and row actions.
- **Shared editor patterns:** consistent create/edit dialogs or pages with
  validation, save/cancel, unsaved-change protection, and success/error
  feedback.
- **Access control:** enforce role/permission checks on both navigation and
  server operations; hiding a menu item alone is not authorization.

### Cross-cutting behaviors to implement

1. Show loading, empty, and error states distinctly. A failed request must not
   look like a successful empty result.
2. Preserve filters and pagination while navigating within a list where
   appropriate.
3. Confirm irreversible operations (delete, archive, issue, send, or publish)
   and provide an audit trail for consequential changes.
4. Make table columns, keyboard navigation, labels, and modal focus behavior
   accessible.
5. Use explicit timezone handling for sessions, schedules, campaigns, and
   reports.
6. Define export scope clearly (current page vs. filtered result vs. all
   results) and report export failures.
7. Treat user contact, learner, and payment information as sensitive; limit
   visibility by role and avoid logging it.

### Suggested implementation order

1. Authenticated shell, route map, permission model, and shared page states.
2. Dashboard and scheduling/calendar foundations.
3. Users and learning operations (learners, batches, sessions, assessments).
4. Products and engagement/community features.
5. Marketing and sales workflows.
6. Analytics/reporting and organization-wide settings.

## 7. Items to validate before implementation

- Exact role/permission matrix and which sections/actions are available to
  different staff roles.
- Full set of actions and forms for inferred-only submenu pages.
- Whether list exports respect filters and role-based data access.
- Intended behavior and routes for **New**, global search, and notification
  controls.
- Product-specific fields, pricing, publication states, enrollment rules, and
  payment integrations.
- Expected behavior for the dashboard metrics and report date ranges.
- Error handling for the observed 400/404 responses and intermittent loading.
- Whether all listed features belong to the desired clone scope or are
  optional LMS capabilities.
