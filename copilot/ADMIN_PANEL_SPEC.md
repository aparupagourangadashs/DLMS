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

## 8. Read-only parity recheck: 2026-10-26

### Scope and interpretation

The live V2 application was revisited with an administrator session, including
the nine primary sections, their visible submenu inventories, all ten settings
screens, report categories, and selected create/configuration forms.
Creation forms were opened for inspection only. No forms were submitted, no
settings toggled, and no records, messages, payments, or files intentionally
created, changed, sent, or downloaded. Credentials, authentication tokens, and
private learner/account records are not included in this document.

This recheck supplements rather than rewrites the 2026-10-19 observations.
Visible controls confirm a UI surface, not successful backend behavior.
Several live requests still returned 400/404 errors or incomplete states.

The local application has 51 admin screens and 52 help pages. Most top-level
navigation is represented, but this does not establish workflow parity:
local records and edits are synthetic/in-memory, authentication and permission
enforcement are deferred, and provider/database integration is not implemented.
The preceding UI review checked those 103 local routes at desktop and 320px
widths without page-level horizontal overflow or browser runtime exceptions;
that is UI evidence only, not production functionality evidence.

### Confirmed differences

| Area | Live controls observed | Local implementation and gap |
| --- | --- | --- |
| Events | A multi-step editor with multiple event days, start/end times, image and rich description, publication state, venue/platform, guest access, manager, category, membership, feedback-form selection, and a pricing step | The local event form contains name, one date/time, venue text, and visibility. The fuller editor is missing; pricing-step fields were not inspected because advancing could require completed data. |
| Batches | Explicit start/end dates, primary/additional managers, course/module selection, and optional batch community | Local form substitutes a duration choice and has no additional manager, module picker, or batch-community control. |
| Feedback Forms | A type/template selection wizard for session feedback, course-linked forms, and general surveys | Local form creates only a name and Rating/Survey metadata. The observed wizard and template selection are missing; downstream question-builder behavior remains unverified. |
| Question Bank | A creation form with required exam/subject/topic/difficulty and a short description | Local exam is optional, topic is optional, and description is absent. Question-level editing/import was not inspected and must not be claimed as verified parity. |
| Asset Library | Asset-type selection covering 13 media/document/link formats | Local type names are present, but creation accepts a filename/link string rather than a media upload/storage workflow. |
| Certificates | Serial prefix, description, custom fields, expiry rules, builder or uploaded template, placeholder reference, course/exam-based automation, and notification editing | Local form is basic template metadata and a free-text issuance rule. Template design/upload, PDF generation, structured automation, and notification configuration are missing. |
| Community | New Community form with name/description and message-versus-feed layouts, alongside member/message/pin controls | Local page supports existing demo communities, sending, pinning, and member removal; it lacks community creation and layout selection. |
| Promotional Templates | Email/SMS/WhatsApp/Push tabs and an Add Template editor; email editor exposes subject, reply-to, rich content/upload, and unsubscribe settings | Local route remains a decision/proposal page. This is now an observed missing management surface, not merely an unverified menu. |
| Promo Codes | Multiple-use/single-use tabs and a wizard with start/expiry dates, website/app display options, system-wide and per-user limits, plus a discount-configuration step | Local form has code, discount text, applicability, and expiry; it lacks these type, visibility, and limit controls. Second-step details were not inspected. |
| Cheque Management | A table with student/parent/bank/amount/status/remark and date/status/bank filtering | Local route remains a proposal. Live table controls are confirmed, but operational actions could not be validated on the empty/erroring list. |
| Categories | Category/Sub-Category tabs and Reorder/Add Category controls | Local flat category list has no parent-child category management or reorder action. |
| Custom Fields | Entity tabs for learner/instructor/course/batch/certificate/question/announcement/enquiry; signup/offline-admission placement views | Local scope choices and required/type metadata are much narrower. Live Add Field/Reorder controls were visibly gated, so creation/reordering was not exercised or bypassed. |
| Sub-Organizations | Branch list exposes manager and activity | Local branch list/form instead focuses on city and synthetic admin/learner counts; manager/activity parity needs implementation. |
| Grading System | An inline band configuration screen with add/remove and Save Changes | Local generic grade CRUD is a different interaction model. Exact live grading validation rules remain unverified. |
| Miscellaneous Fees | Fee-template list with name, description, amount, and template creation | Local fee metadata lacks the observed description field; complete template rules require further inspection. |
| International Selling | Branch enablement, gateway indicator, base/fallback currency, fixed-price/automatic-rate options, and currency conversion/adjustment/precision controls | Local route is only a proposal. Currency configuration is a confirmed missing screen. No payment settings were changed or transactions attempted. |
| Learner Experience | Learner-sidebar items, New Custom Item, preview, and additional visibility settings for class records, overview, password, preferences, and profile | Local route is only a proposal. The observed sidebar/custom-item configuration is missing. Reorder persistence was not exercised. |
| Utility Wallet | Notification/AI credit tabs, credit-usage information, recharge history, export/filter controls, and transaction channel/balance fields | Local synthetic ledger lacks these separate views/actions and channel/running-balance fields. AI capability showed a Coming Soon indication; it is not verified working functionality. |
| System Notifications | Nine event-family tabs plus a Manage Notifications dialog with channel-level global controls and provider-connection status | Local eight-event/channel switch matrix is only a subset; family-level coverage, global controls, provider setup, and delivery are missing. |
| Dashboard | Four weekly metric sparklines (time spent, views, rating, attendance), a separate Daily Active Users trend, and an enrollment chart with a Signup vs Enrollments / Sales selector | Local dashboard has one switchable main chart and static summary cards. It lacks all four metric sparklines, the separate Daily Active Users chart, the enrollment total above the main chart, and the weekly average-attendance card. Local attendance/session actions remain demo state. |
| Quick create | Session, Enrolment, Batch, Event, Blog | Local quick-create already includes these, including a separate Enrolment link in the shared top bar. The initial omission finding was corrected by checking that full menu. |
| Analytics | Report categories include a More entry, and the suite exposes report families broader than local cards | Local report previews are samples, many cards are explanatory placeholders, selected date ranges do not recalculate real data, and report exports are deferred. |

### Report inventory gaps

Dashboard chart coverage was corrected after a visual recheck prompted by the
user: the live dashboard renders six chart surfaces at once (four small weekly
sparklines and two larger trends). Switching the enrollment panel to Sales
changes that panel rather than adding a seventh simultaneous chart. The local
Bar/Line/Area switches change rendering style; they do not supply the missing
metric or Daily Active Users chart surfaces. Live chart data accuracy was not
validated; this is a confirmed layout/functionality inventory difference.

The live suite exposes the following report subjects not represented as
equivalent dedicated local report experiences:

- Batch performance, batch attendance, module progress, batch assessment,
  assessment attempts, and issued certificates.
- Session feedback, batch rating, trainer feedback, and event feedback.
- Community overall activity, inbox activity, course engagement, and member
  participation as separate reports.
- The More category: branch statistics, storage consumption, bandwidth
  consumption, scheduled tasks, user-time statistics, and wallet recharges.
- Advanced user/test/course analytics are advertised in the suite, but the
  direct Advanced Analytics route showed Access Restricted for this account.
  Their actual filters, fields, actions, and results are not verified.

Some local reports address related subjects with different names; these are
partial conceptual coverage, not evidence of matching columns/calculations.
Real query/filter/export behavior remains a separate implementation gap.

### Restricted, unavailable, and changed observations

- eBooks, Test Series, and Playlists still show Coming Soon. There is no
  verified working manager to copy from those pages.
- Workflows and Advanced Analytics showed Access Restricted. No restriction
  was bypassed.
- Mentorships now shows a service introduction, booking/pricing descriptions,
  FAQ, and Get Started entry point rather than just a loader. Activation was
  not attempted; booking-management parity remains unverified.
- Discussions and Leads still redirect to the legacy application. During this
  recheck they remained on environment setup, so their detailed workflows
  could not be confirmed.

### Recommended priority

1. Treat the current application as a reviewed UI prototype, not a replacement
   production admin. Add real authentication, authorization, persistence, and
   integration boundaries before connecting sensitive operations.
2. Complete core event/batch/media/feedback/certificate workflows.
3. Add confirmed missing community/template/settings screens, then structured
   promo-code controls and notification coverage.
4. Complete report inventory, actual calculations, filtered exports, and
   wallet/provider integration.
5. Resolve legacy/restricted/activation-dependent requirements with IBMV
   before treating proposed designs as a verified feature specification.

## 9. Local demo implementation

The section 8 matrix is a historical audit of the pre-change application.
The changes below implement its actionable frontend gaps. They do **not**
establish production parity or validate the reference system's calculations.
The local inventory is now 52 admin screens and 53 help pages, including the
new Analytics > More route and its help article.

| Area | Implemented local workflow | Integration or verification boundary |
| --- | --- | --- |
| Dashboard | Four seven-day metric sparklines, attendance card, ten-day Daily Active Users trend, enrollment/sales totals and switchable main chart: six simultaneous chart surfaces | Synthetic values; no live activity or revenue queries |
| Events | Three-step editor; multiple ordered, non-overlapping days; image selection/preview; Markdown formatting and safe preview; publication, platform, venue/link, guest access, manager, category, membership, feedback and pricing configuration | Pricing controls are a proposed demo design because the live pricing step was not inspected. No checkout, meeting creation or uploads |
| Batches | Start/end dates, primary/additional managers, module selection and community configuration | Community selection is stored as configuration; it does not provision or attach a persisted community |
| Feedback Forms | Session/course/general types, starting templates, editable/reorderable required/rating/text/choice questions and preview | No learner response collection or persisted forms |
| Question Bank | Required exam, subject, topic and difficulty, with description | Question-level editing/import was not observed and is not claimed |
| Asset Library | All 13 type choices, extension/size validation, local image/audio/video previews, external URLs, document/archive metadata | Files are not uploaded or executed. Only metadata survives closing the editor; preview requires reselecting the local file |
| Certificates | Serial prefix, description, custom fields, expiry configuration, builder/upload selection, placeholders, structured course/exam automation and notification choices | HTML/image preview only; uploaded PDF metadata only. No PDF generation/download, real issuance, automation execution or message delivery |
| Community | Validated unique-name creation, message/feed layouts, chronological/newest-first ordering, existing post/pin/member controls | Page-local communities and messages; no invitations or notifications |
| Promotional Templates | Email/SMS/WhatsApp/Push tabs, create/edit/duplicate/delete, safe content import and sample-personalized preview, subject/reply-to/unsubscribe validation | Local browser drafts only; arbitrary HTML is not executed, and no provider approval or sending occurs |
| Promo Codes | Single/multiple use, dates, website/app visibility, system/per-user limits, percentage/fixed discount, minimum spend/cap/applicability and order simulator | Local browser codes; no real redemption, checkout or shared usage enforcement |
| Cheque Management | Synthetic register, date/status/bank/text filtering, CSV export, proposed status transitions with required remarks and local history | Operational transitions were not verified on the live empty/erroring list. No deposit, bank verification, ledger posting or settlement |
| Categories | Parent/child management and category/subcategory reorder controls | Local hierarchy only; no published catalog changes |
| Custom Fields | Entity scopes, placement views, field type/required metadata and reorder controls | Local configuration only. Live creation/reorder was gated and not exercised |
| Sub-Organizations | Manager and activity details, local branch creation and pause/reactivate actions | No persisted branch membership or authorization changes |
| Grading System | Inline add/remove/edit bands, validation of whole-number 0-100 coverage without gaps/overlaps | Proposed validation policy; live rules were not verified and no assessment is regraded |
| Miscellaneous Fees | Name, description and amount templates | No invoicing, taxation or actual charge |
| International Selling | Branch availability, unconnected gateway status, base/fallback currencies, pricing method, adjustment and precision | No live conversion feed or payment integration |
| Learner Experience | Sidebar reorder/visibility, custom HTTPS links, preview and additional profile/class-record/preferences controls | Does not publish changes to a deployed learner portal |
| Utility Wallet | Notification/AI views, usage, filtered recharge history/export, channel and running balance | Synthetic ledger; no real recharge/spend. AI is unavailable |
| System Notifications | Nine event families, per-event channels, global channel controls, enabled counts, save/reset and provider status dialog | All providers remain Not connected; preferences are page-local, no delivery occurs |
| Analytics | 49 deterministic synthetic reports, including missing batch/feedback/community/More families, recalculating date/branch/course/status/search filters, sortable/selectable-column previews and matching-row CSV exports | Demo period anchored to 26 October 2026; not production metrics, storage measurements, provider logs or audited calculations |
| Quick create | Existing Session/Enrolment/Batch/Event/Blog shortcuts retained and wired to their workflows | No duplicate Enrolment entry was added |

### Storage and access boundaries

- Learning, community and settings changes remain page-local and reset on
  navigation. Marketing template/code drafts and cheque history explicitly use
  versioned local browser storage with reset controls; this is not secure,
  shared, authoritative persistence.
- No database connection, migration, production authentication/authorization,
  external provider setup, payment integration or live-site writes were added.
  Never enter real credentials, learner data or financial records in demos.
- Coming Soon products, restricted workflows, legacy pages and mentorship
  activation requirements remain explicitly unverified/proposed. The local
  Advanced Analytics reports are proposals, not a bypass or verified copy of
  the restricted live feature.
- Reusable dropdowns, date pickers, dialogs, colorful tables, light/dark
  themes and mobile layouts remain the shared UI conventions. Help content
  distinguishes local configuration, browser-persisted drafts and real
  external effects.
- Newly added settings, marketing managers, learning editors and all report
  pages follow the same colorful card, icon, table, status-badge and semantic
  button treatment as the previously redesigned admin screens. Wizard
  progress, local-file selection, content previews and notification controls
  are included in this visual pass.
