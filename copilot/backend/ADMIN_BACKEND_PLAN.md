# Admin Panel: Backend Plan (phase by phase)

Parent: [MASTER_PLAN.md](./MASTER_PLAN.md). Spec: [ADMIN_PANEL_SPEC.md](../ADMIN_PANEL_SPEC.md).
Models: [DATA_MODEL.md](./DATA_MODEL.md). Auth/roles: [FOUNDATION_PLAN.md](./FOUNDATION_PLAN.md).

**Current state:** 52 screens in 9 sections (`src/lib/admin/navigation.ts`).
Most are generic list screens: `ListPage` renders a `ListConfig` (columns,
filters, tabs, form, row actions) from `list-configs.ts` with fixture `rows`.
Custom components exist for the Dashboard, Sessions calendar, New Enrolment,
Community, Analytics, Promo Codes, Promotional Templates, Cheque Management,
My Profile, System Notifications, and eight Settings pages. Edits stay in page
memory, with a few drafts in `localStorage` (`useDemoRecords`).

**Goal:** every screen reads and writes the database through permission-checked
endpoints, with audit trails and role-scoped data.

---

## Phase A0 (with B0/B1): Shared admin infrastructure

Build once; every list screen below reuses it.

| # | Task | Detail |
|---|---|---|
| A0.1 | **Resource registry** `src/server/admin/resources.ts` | One entry per list screen key (`"learning/batches"`): `model`, `permissions { read, write, export, delete }`, `list(query, session)`, `toRow(entity)`, `create`, `update`, `archive`, `duplicate`, `remove`, optional `summary(query)` (summary cards) |
| A0.2 | **Generic routes** | `src/app/api/admin/resources/[section]/[page]/route.ts` (list `GET`, create `POST`), `.../[id]/route.ts` (`GET`, `PATCH`, `DELETE`), `.../[id]/[action]/route.ts` (`archive`, `duplicate`), `.../export/route.ts`. They mirror the admin URL (`section/page`) and dispatch through the registry. Unknown key -> 404; permission is read from the registry, not the URL. Custom screens add their own routes beside these |
| A0.3 | **Row mappers** | `toRow()` returns the exact flat `Row` shape that the `ListConfig.columns` render (e.g. `progress` number, `tags` string[], `date` ISO). The UI does not change |
| A0.4 | **`ListPage` wiring** | Replace `useState(config.rows)` with `useResourceList(pageKey, query)` (server-side search/tab/filter/sort/page/date range; the current client-side filtering moves to the server). Keep columns/hidden-columns/selection UI. Show distinct loading / empty / error states |
| A0.5 | **Forms to mutations** | `FormDrawer`/editors (`EditorFields`, `MarkdownEditor`) submit via `useMutation`: validation errors map to fields; keep client validation in `editor-validation.ts` for UX, server re-validates. Keep unsaved-change protection |
| A0.6 | **Row actions** | `edit`, `duplicate`, `archive`, `delete`, `review`, `view` call the action endpoints; destructive ones keep confirm dialog; each writes `AuditEvent` |
| A0.7 | **Export** | The CSV button calls `/export` with current filters; server streams all matching rows (not just the page); needs `<resource>:export`; audited; columns omit fields the role cannot see |
| A0.8 | **Bulk selection** | Selected ids sent to bulk endpoints (`POST .../bulk` with `ids`, `action`); capped size; per-row result report |
| A0.9 | **Config split** | In `list-configs.ts` keep `columns`, `filters`, `tabs`, `form`, `rowActions`; remove `rows` and fixture generation once the screen is wired. Option lists (courses, instructors, batches, branches) come from `GET /api/admin/lookups/[kind]` so selects reflect real data |
| A0.10 | **Permission-aware shell** | `Sidebar`/`Topbar`/`CommandPalette` hide items the role cannot read (UI only; server still enforces). Topbar profile shows real user and role; Sign out works |
| A0.11 | **Seed** | Port each screen's fixture generator into `prisma/seed.ts` so the screen is populated in dev |

Keep a **tracker row** per page in section "Admin tracker" and apply the
Definition of Done from the master plan.

**A0 status (2026-11-25):**

| Item | Status |
|---|---|
| A0.1 registry (`src/server/admin/registry.ts`, `resources/`) | Done; registered: team, learners, courses, books, people, magazines, videos, testimonials, leads, legal pages |
| A0.2 generic routes (list, create, update, delete, actions, export) | Done |
| A0.3 row mappers | Done; every resource has its own mapper (`contentResource` factory covers simple publishable content) |
| A0.4 `ListPage` wiring (`remote` mode, server search/tab/sort/page, loading/error/empty states, tab counts) | Done |
| A0.5 forms to mutations (`FormDrawer` async submit with server field errors) | Done |
| A0.6 row actions (archive/restore/duplicate/delete/reset-password via API, audited; Restore and Archive show only where they apply) | Done |
| A0.7 export (all matching rows, CSV-injection safe, audited) | Done |
| A0.8 bulk selection | Todo (first needed by Recordings and bulk enrolment) |
| A0.9 config split (remove fixture `rows` once a screen is wired) | Per screen; Team rows are no longer sent to the browser |
| A0.10 permission-aware shell (sidebar, mobile nav, command palette, server page gate) | Done (`src/lib/admin/page-permissions.ts`) |
| A0.11 seed per screen | Per screen; Team, branches, catalog (6 categories, 127 courses, 9 books, testimonials, videos, site settings) seeded |
| A0.12 database-backed select options (`options()` on a resource, `withOptions()` on the screen config) | Done (course category and language) |

To migrate another list screen: add `src/server/admin/resources/<name>.ts`
exporting a `ResourceDef`, register it in `resources/index.ts`, and the page
switches to the database automatically (`remote` is derived from the registry).

---

## Phase A1 (B1): Identity pages

| Page | Route | Pattern | Backend | Frontend wiring |
|---|---|---|---|---|
| **Staff sign-in** (new) | `/admin/login` or shared `/login` | form | Auth.js credentials; staff-only check; lockout | New page; redirect to `/admin` after success |
| **My Profile** | `/admin/settings/my-profile` | custom `MyProfile.tsx` | `GET/PATCH /api/admin/me` (name, username, DOB, gender, mobile, alternate mobile, email, permanent/residential address, state, city, pincode, notification preferences, timezone); `POST /api/admin/me/password` (current + new, strength rules, revokes other sessions) | Load real data; Edit Profile saves; Change password dialog; email change needs verification |
| **Team** | `/admin/users/team` | list `users/team` | `StaffProfile` + `User(kind=STAFF)`. Create: `POST` creates the account and sends invite/temporary-password flow (no password shown in UI); roles: Administrator, Instructor, Content Editor, Finance, Support (Super Admin only via seed/Super Admin action); archive instead of delete (tabs Active/Archived); cannot archive the last Super Admin or yourself; role changes audited and require `team:write` + Super Admin for elevation | Wire registry; form fields `name,email,phone,role,branch`; branch options from `Branch` |
| **Sub-Organizations** | `/admin/settings/sub-organizations` | custom (`SettingsPages`) | `Branch` CRUD, manager (staff user), status active/paused; activity counts computed (learners, admins, batches); pausing hides branch from new enrolments but keeps history | Replace local state; keep pause/reactivate; counts from API |

Exit gate: staff sign in; Team CRUD with role gating; branch-scoped staff see
only their branch.

---

## Phase A2 (B2): Catalog and public content

### Pages from the existing admin

| Page | Route | Pattern | Backend | Frontend wiring |
|---|---|---|---|---|
| **Categories** | `/admin/settings/categories` | custom | `Category` tree (parent/child), reorder (`PATCH /reorder` with ordered ids), slug unique and URL-safe, status; cannot delete a category that has courses (409, suggest archive); changes revalidate public tags | `CategoriesPage` loads the tree, saves reorder and CRUD (**Done**) |
| **Events** | `/admin/products/events` | list + `EventEditor` | `Event` + `EventDay[]`; three-step form fields (details/schedule, access/organization, pricing); validations: days chronological, non-overlapping, end after start (IST wall-clock input converted to UTC); platform decides venue/meeting link required; paid requires price > 0 + currency; image upload via storage (png/jpg/webp <= 5 MB); description markdown stored raw, rendered safely; manager must be staff; feedback form must exist; status Draft/Active/Inactive; visibility Public/Private/Unlisted; registrations table (later B5) | Registry + editor submit; image upload endpoint `POST /api/admin/uploads` returning asset id |
| **Module Library** | `/admin/learning/module-library` | list | `Module` + `ModuleContent` (lessons, assets, quizzes) and `CourseModule` usage counts; "Content" column derived (`n lessons · n PDFs · n quizzes`); "Used in" computed; cannot delete a module used by a published course/batch (409) | Registry; add a module content editor (ordering lessons, attaching assets) which does not exist yet; the table's `content` string becomes computed |
| **Asset Library** | `/admin/learning/asset-library` | list + `AssetEditor` | `Asset`; upload endpoint (multipart), storage driver, MIME sniffing and extension allow-list per asset type (13 types), size cap (25 MB local, configurable), SHA-256 for de-duplication ("storage saved"), summary cards (total, storage used of quota, unused, saved, largest) from queries; "usage" = referenced by `ModuleContent`/`Event`/`Banner`...; downloads counter; YouTube/Link-embed store URL only; delete blocked while used | Replace local preview-only flow with real upload + progress; keep local preview; summary from `summary()` |
| **Blogs** | `/admin/marketing/blogs` | list | `Blog`; slug auto from title (unique); status Draft/Published/Hidden; `publishedAt`; author must be staff; markdown body (replace the textarea help text with `MarkdownEditor`); views counted server-side | Registry; publish/unpublish revalidates `blogs` tag |
| **Marketing Banners** | `/admin/marketing/marketing-banners` | list | `Banner`; image upload; placement Website home/Student portal home; link must be `https`/relative; optional start/end window; ordering | Registry; thumbnail from asset URL (current `thumbnail` tone placeholders go away) |
| **Testimonials** (proposed) | `/admin/marketing/testimonials` | list | `Testimonial`; text or video (YouTube id only); rating 1-5; publish consent flag required; Hidden by default | Registry; feeds website home |
| **Leads** (proposed) | `/admin/marketing/leads` | list | `Lead` created by website forms (W2) and manual entry; stage tabs New/Contacted/Converted/Closed; assign owner; notes; filters source/date; export (PII, needs `leads:export`); convert-to-learner action (creates `User/LearnerProfile`, B3) | Registry; row action `view` shows details + bulk enquiry fields |

### New screens required by the website (not in the current nav)

| Page (proposed route) | Backend | Notes |
|---|---|---|
| **Courses** (`/admin/products/courses`) | `Course`, `CourseSchedule`, `CourseFaq`, instructor link, category, pricing, publish state, catalog visibility, Coming Soon, sort order, official/enrol URL, image | Core of the website and batches. List config + multi-section editor (basics, schedule, overview sections, FAQs, pricing, SEO) |
| **Website content** (`/admin/settings/website-content` or Settings group) | `Person` (Advisory/Team), `Book` + `BookLink`, `Magazine`, `Video`, `SiteSetting` (contact, social, donate/app/community links, hero metric), `LegalDocument` (versioned Terms/Privacy, publish requires Super Admin/Content approval) | Several small list screens under one nav group; each revalidates public tags |
| **Uploads helper** | `POST /api/admin/uploads` | Used by every editor needing an image/file |

Exit gate A2: an admin creates a course and category and publishes it; it
appears on the website; unpublishing hides it; Content Editor role cannot read learners.

---

## Phase A3 (B3): Users and learner configuration

| Page | Route | Pattern | Backend | Frontend wiring |
|---|---|---|---|---|
| **Learners** | `/admin/users/learners` | list `users/learners` (+ detail drawer) | `User(LEARNER)` + `LearnerProfile`; tabs All/Registered/Enrolled/Completed/On Leave/Archived (status derived from enrolments + profile status); filters date range, course, batch, city; search name/email/phone/regNo; `registrationNo` generated server-side `IBMV/YY/#####` in a transaction; create (single) with email uniqueness (409 with link to existing learner), set status, archive/restore; "view" shows profile, enrolments, orders, certificates (permission-scoped); configurable columns; export with `learners:export`; branch scoping; password reset trigger (sends link, never shows password) | Registry; drawer for detail; add custom-field values from `CustomField` |
| **Segments** | `/admin/users/segments` | list | `Segment` Static (members list) and Dynamic (rules Json: course, batch, status, city, progress, last-active, purchase); learner count computed on read; rules validated against an allow-list (no raw SQL); used by Campaigns/Announcements | Registry; add rule builder for Dynamic (currently only name/type) |
| **Custom Fields** | `/admin/settings/custom-fields` | custom | `CustomField` per entity scope (learner/instructor/course/batch/certificate/question/announcement/enquiry), placement (profile/signup/offline admission), type, options, required, reorder; values stored in `CustomFieldValue`; changing type of a used field blocked | `CustomFieldsSettingsPage` wired; signup/profile forms read the definitions |
| **Learner Experience** | `/admin/settings/learner-experience` | custom | `LearnerExperienceConfig`: sidebar item order/visibility, custom HTTPS links (validated), additional visibility toggles (class records, overview, password, preferences, profile); student shell reads config | `LearnerExperiencePage` saves; student `StudentShell` consumes it |
| **Support inbox** (new) | `/admin/engage/support` | list | `SupportRequest`/`SupportReply`; status Open/In progress/Resolved; assign; reply (email/console); filters; counts for sidebar badge | Gap closer for student Help |

Exit gate: learner profile edits from the student portal appear here;
branch-scoped staff cannot open other branch learners; export respects permission.

---

## Phase A4 (B4): Learning operations

| Page | Route | Pattern | Backend | Frontend wiring |
|---|---|---|---|---|
| **Batches** | `/admin/learning/batches` | list + `BatchEditor` | `Batch`, `BatchManager`, `BatchModule`; fields: name, course, start/end (end > start), primary + additional managers, instructor, modules (ordered), community option (None / create / use existing: creates/links `Community` in B7, until then store config only); progress = average learner progress; tabs Active/Completed/Archived/All (status), filters course/instructor/module; archive does not delete enrolments; completing a batch freezes sessions | Registry; lookups for course, staff, modules; progress from aggregate |
| **Sessions** | `/admin/learning/sessions` | custom `SessionsCalendar` | `Session`, `Holiday`, `Attendance`; `GET /api/admin/sessions?from=&to=&view=` for list/day/week/month; create (batch, title, start/end, timezone, join URL validated, instructor, topics), edit/reschedule, cancel (reason; triggers learner notification job), mark holiday (day-level, affects batches in branch), recurring creation optional; attendance sign-in/out endpoints with timestamps; conflict check for instructor/time overlap | Replace `demoSessions()`; keep Mark as Holiday and sign-in actions bound to API |
| **Announcements** | `/admin/learning/announcements` | list | `Announcement` + audience (all / batch / segment), urgency High/Medium/Low, tags, `publishAt` (scheduled), status; publish creates `InAppNotification` rows and enqueues delivery per learner consent; edit after publish allowed with audit; student unread state independent | Registry; form: title, audience (batches/segments from lookups), urgency, publish at, message (markdown), tags |
| **Session Recordings** | `/admin/learning/session-recordings` | list | `Recording` linked to `Session`; status Processing/Available/Failed; source: upload to storage or approved external URL; visibility follows batch enrolment; tabs by batch status; filters date/batch; delete (soft) | Registry; selectable rows with bulk delete; `view` opens a player using signed URL |
| **New Enrolment** | `/admin/users/new-enrolment` | custom `NewEnrolment` | Four modes. Single: email lookup (`GET /api/admin/learners/lookup?email=`) -> choose course/batch, access dates, optional send-welcome; Bulk: CSV upload -> validate-only dry run returns per-row result (valid/duplicate/invalid/unknown course) -> confirm commit; Learner Registration: create account without enrolment; Advanced Bulk: CSV with course/batch/dates/status per row. Rules: idempotent (existing active enrolment is skipped, not duplicated), max rows per file, size cap, transactional per row with a result report downloadable as CSV, all rows audited, optional notifications honor consent | Replace `knownEmails` prop with API lookup; show outcome table (created/skipped/failed); keep step UX |
| **Dashboard (core)** | `/admin` | custom `Dashboard.tsx` | Server read of the overview (`getDashboardOverview`) plus `GET /api/admin/sessions` for the day: today's sessions (scheduled/cancelled/sign-ins/non-sign-ins/attendance) with date navigation; enrollment (signups vs enrollments) and sales series; daily active users; weekly cards (time spent, views, rating, attendance) with previous-week comparison. A4 delivers sessions + enrolments; time spent, views, active users, rating need `UserActivity` and feedback data (B8) | Replace `demo-data` series; chart components stay; cards show "No data yet" instead of fake values |

Exit gate: admin creates batch, sessions, enrols a learner; learner sees them
in the student portal; attendance recorded; bulk enrolment dry-run + commit works.

---

## Phase A5 (B5): Commerce and sales

| Page | Route | Pattern | Backend | Frontend wiring |
|---|---|---|---|---|
| **Orders and payments** (new) | `/admin/sales/orders` | list | `Order`, `Payment`, `Refund`, `Invoice`; filters status/date/course/method; detail with timeline; refund action (partial/full, reason, calls Razorpay, `orders:refund`, audited); manual mark-paid only for offline modes with reason (Finance); export | Required for Finance and the "Payments Received" report. Add to nav |
| **Promo Codes** | `/admin/marketing/promo-codes` | custom `PromoCodes.tsx` | `PromoCode` + `PromoRedemption`; wizard fields: code (unique, uppercased), single/multiple use, start/expiry, website/app visibility, system limit, per-user limit, percent/fixed, min spend, cap, applies-to (all/courses/events/memberships); redemption enforced **transactionally at checkout** with unique constraints; tabs Single/Multiple use; usage counter live | Replace `localStorage` (`useDemoRecords`) with API; order simulator calls `POST /api/admin/promo-codes/simulate` using the real pricing function |
| **Miscellaneous Fees** | `/admin/settings/miscellaneous-fees` | custom | `MiscFee` templates (name, description, amount minor, applies-to, status); applied by pricing service at checkout | Wire; amount shown in INR |
| **International Selling** | `/admin/settings/international-selling` | custom | `CurrencyConfig`: branch enablement, gateway status (read-only from provider config), base/fallback currencies, fixed per-product prices vs automatic rate, adjustment %, rounding precision; exchange-rate source decided (D6) | Replace decision page with real screen |
| **Abandoned Cart** | `/admin/sales/abandoned-cart` | list `sales/abandoned-cart` | `Cart` marked abandoned by a scheduled job (open > N minutes without paid order); summary cards (total abandons, abandoned value, last 30 days, recovered); tabs Abandoned/Completed; filters date/course; export; follow-up action (send reminder via notify, consent-checked) | Registry with `summary()` |
| **Cheque Management** | `/admin/sales/cheque-management` | custom `ChequeManagement.tsx` | `Cheque` + `ChequeStatusHistory`; fields: learner, parent, bank, cheque no, amount, date, status, remark; transitions Received -> Deposited -> Cleared or Bounced, remark mandatory, only `cheques:write` (Finance); clearing can unlock enrolment (configurable); bounced triggers learner notice; filters date/status/bank; export | Replace `localStorage` history with API; requires D6 approval of fields |
| **Memberships** (new) | `/admin/products/memberships` | list | `MembershipPlan` + `Membership`; plan price/interval/benefits; assign manually; expire job; analytics "Membership Enrollments" source | Needed for student Memberships page |

Payment engine (no UI page, built here): `src/server/services/commerce`:
price calculation (course price, promo, fees, tax, currency), `createOrder`
(idempotent), Razorpay order creation, `POST /api/webhooks/razorpay`
(signature verification with the raw body, `PaymentEvent` unique event id,
amount/currency match, transition to PAID, grant `Enrollment`/`Membership`,
issue invoice, enqueue receipt notification), refund webhook handling,
reconciliation job comparing provider settlements.

Exit gate: sandbox success, failure, pending, duplicate webhook, and refund
scenarios pass; promo limits hold under concurrent redemption; finance
reconciliation report matches.

---

## Phase A6 (B6): Assessments and credentials

| Page | Route | Pattern | Backend | Frontend wiring |
|---|---|---|---|---|
| **Question Bank** | `/admin/learning/question-bank` | list | `QuestionBank` (`QB-####` generated), required exam/subject/topic/difficulty/description; add a **question editor** (MCQ/multi/text/file, marks, answer key, explanation) and CSV import (validate then commit) once IBMV confirms question types (spec says unverified) | Registry; add "Manage questions" screen |
| **Assessments** | `/admin/learning/assessments` | list | `Assessment` kinds Assignment, Custom link, Exam; linked courses, price (minor), max attempts, window, duration, pass %, bank; counters total/unique attempts and registered computed from `Attempt`/`AssessmentRegistration`; changing marks after attempts exist is blocked or versioned | Registry; tabs by kind |
| **Submissions** | `/admin/learning/submissions` | list + review dialog | `Submission`; tabs Not evaluated/Evaluated/All; filters date, batch; search learner/email; review dialog: marks 0..total (server validates), feedback, evaluator recorded, percentage derived, timeliness from due date; instructors only for their batches; re-evaluation audited; publishes result to student | `ReviewDialog` calls `POST /api/admin/submissions/[id]/evaluate` instead of local state |
| **Feedback Forms** | `/admin/learning/feedback-forms` | list + `FeedbackEditor` | `FeedbackForm` + `FeedbackQuestion`; types Session/Course-linked/General; templates (Blank, Session essentials, Course completion) are server-side presets; question types Rating/Text/Choice, required, options; "Conversions" = response count from `FeedbackResponse`; editing a form that has responses creates a new version | Registry; learner response endpoint feeds analytics |
| **Certificates** | `/admin/learning/certificates` | list + `CertificateEditor` | `CertificateTemplate` (serial prefix, expiry rules, builder or uploaded template, custom fields, automation Manual/Course completion/Exam passed with threshold, notification config) and `Certificate` issuance; issue job: eligibility check -> unique serial (transactional counter per prefix) -> PDF generation (server-side from template; placeholders `{{learner}} {{course}} {{date}} {{serial}}` escaped) -> store private file -> notify; manual issue/revoke actions audited; public verification code; "Issued" column = count | Registry; replace local HTML preview with real PDF preview; no raw HTML from templates |
| **Grading System** | `/admin/settings/grading-system` | custom | `GradeBand` set validated server-side: whole numbers 0-100, no gaps/overlaps, at least one band; applying changes does **not** silently regrade past results unless an explicit action is run and audited | Inline editor saves the whole set atomically |

Exit gate: author an exam, learner takes it, instructor evaluates, passing
learner receives a verifiable certificate; grade bands validated.

---

## Phase A7 (B7): Engagement and communications

| Page | Route | Pattern | Backend | Frontend wiring |
|---|---|---|---|---|
| **Community** | `/admin/engage/community` | custom `CommunityPage.tsx` | `Community` (unique name, layout Message/Feed, ordering), members add/remove (by learner, batch, segment), posts, pins, moderation (hide/remove, reports queue), member invitations optional | Replace `demoCommunities()`; endpoints under `/api/admin/communities/*` |
| **Discussions** | `/admin/engage/discussions` | decision page | Only if D8 approves; likely merged into Community | Keep `DecisionPage` until approved |
| **Campaigns** | `/admin/marketing/campaigns` | list | `Campaign`, `CampaignRecipient`; create: name, type, channel, template, audience (segment/batch/all), schedule; states Draft/Scheduled/Sending/Sent/Failed/Cancelled; sending via job in batches, per-recipient `NotificationLog`; excludes opted-out/consent-missing learners; WhatsApp/SMS require an approved provider template; wallet credits debited; cancel scheduled; resend failed; `sent` = delivered counts | Registry (+ detail view of recipients/status); form's `channel` help text stays |
| **Promotional Templates** | `/admin/marketing/promotional-templates` | custom | `MessageTemplate` per channel (Email subject/reply-to/unsubscribe, SMS, WhatsApp with provider template id and approval status, Push); variable allow-list; safe HTML handling (sanitize, never execute); duplicate/delete; usage check before delete | Replace `localStorage` drafts with API; WhatsApp approval status read-only from provider sync |
| **Workflows** | `/admin/marketing/workflows` | decision page | `Workflow`/`WorkflowRun` only after D8: triggers (enrolled, abandoned cart, inactive), conditions, delays, actions (send template), run log, pause/resume, frequency caps and quiet hours | Keep decision page until approved |
| **System Notifications** | `/admin/settings/system-notifications` | custom | `SystemNotificationSetting` for nine event families x channels with global channel controls, enabled counts; provider connection status read-only from `notify` config (Not connected until configured); changes affect the notify service routing | Wire; the status dialog shows real provider state |
| **Utility Wallet** | `/admin/settings/utility-wallet` | custom | `WalletAccount`/`WalletTransaction`: notification credits (WhatsApp/SMS/Email) and AI credits tab (Coming Soon until supported); recharge via Razorpay order flow (shares commerce service), running balance, filters date, export; debit on send, credit on recharge; never negative (hard stop + alert) | Replace synthetic ledger; recharge button creates an order |

Notify service (built in B7): provider drivers (email SMTP/API, WhatsApp
Business, SMS, web push) behind the interface; retries with backoff; webhook
endpoints for delivery receipts (`/api/webhooks/<provider>`); consent and
quiet-hours checks; `NotificationLog` for every attempt.

Exit gate: campaign to a test segment delivers through sandbox providers, honors
opt-out, debits wallet, and appears in Notification Logs.

---

## Phase A8 (B8): Analytics and remaining screens

### Analytics (9 pages)

All use the `AnalyticsPage` UI with report cards; replace `getReportRows()`
fixtures with `GET /api/admin/analytics/[page]/[report]?from=&to=&branch=&course=&status=&q=&sort=&page=`
and `/export` (all matching rows, `reports:export`). Server queries live in
`src/server/services/analytics/*`; branch scoping and role permissions apply.
Keep response columns equal to the `Report.columns` definitions.

| Page | Reports (source tables) |
|---|---|
| Sales & Enrollment | Product Enrollments (`Enrollment`), Sales Overview (`Order`/`Payment`/`Refund`), Payments Received (`Payment`), Course Wise Enrollments, Event Enrollments, Membership Enrollments, GST Report (needs tax format D6; label clearly until approved) |
| Batch & Progress | Batch Progress, Batch Performance, Learner Progress, Attendance, Batch Attendance, Module Progress, Batch Assessment, Assessment Attempts, Issued Certificates, Inactive Learners |
| Feedback & Rating | Course Ratings, Form Responses, Instructor Ratings, Session Feedback, Batch Rating, Trainer Feedback, Event Feedback (`FeedbackResponse`) |
| Marketing | Campaign Performance (`Campaign*`), Promo Code Usage (`PromoRedemption`), Lead Sources (`Lead`) |
| Trainer | Trainer Summary, Session Log (`Session`, `Attendance`, ratings) |
| Notification Logs | Delivery Log, Failures, Opt-outs (`NotificationLog`, preferences) |
| Community Analytics | Activity, Overall Activity, Inbox Activity, Course Engagement, Member Participation, Top Contributors (`Community*`) |
| More | Branch Statistics, Storage Consumption (`Asset` sizes), Bandwidth (download logs), Scheduled Tasks (`JobQueue`), User-time Statistics (`UserActivity`), Wallet Recharges (`WalletTransaction`) |
| Advanced Analytics | Custom Report Builder, Cohort Analysis, Advanced User/Test/Course analytics; restricted in the reference, build last and only after D8 confirms scope; custom builder restricted to allow-listed fields/joins |

Performance: indexed filters, date-range caps, pagination, and `DailyMetric`
pre-aggregation if queries exceed budget; heavy exports run as background jobs
with a download link.

### Dashboard (complete)

Add time spent, views, ratings, active users from `UserActivity`/feedback;
comparison to previous week; remove placeholders.

### Conditional product screens (only after D8)

| Page | Notes |
|---|---|
| Mentorships | Mentor availability slots, bookings, pricing; reference showed an intro/Get Started page |
| eBooks | Upload EPUB/PDF, protected reading, bundles; may remain retailer links only |
| Test Series | Bundles of timed tests using the exam engine (B6) |
| Playlists | Curated recordings/videos from the Asset Library |

Each keeps its `DecisionPage` until IBMV approves requirements.

### Shell features

| Feature | Backend |
|---|---|
| Global search (Ctrl+K) | **Done** (2026-11-26). `GET /api/admin/search?q=` (two letters or more, 120 a minute per person) looks in 15 places: learners, team, courses, batches, events, announcements, blog articles, leads, support requests, assets, modules, banners, testimonials, books and website people. It shows five of each, only from screens the role may open, and branch-bound staff only see their own branches' learners, team and batches (plus unassigned batches). `CommandPalette` shows pages at once and records after a short pause; a record opens its list with `?q=` filling the search box, and a support request opens its conversation with `?open=` |
| Quick-create (New) | Unchanged links to editors; hide per permission |
| Notification bell | **Done for what exists** (2026-11-26). `InAppNotification` (one row per person, read state, on-site link only, dropped after 90 days) with `GET /api/admin/notifications` and `POST /api/admin/notifications/read`. Staff are told of a new support request (roles that can read support requests), of a request assigned to them, and of a bulk-book enquiry (roles that can change leads). Failed payment, low wallet and bounced cheque arrive with B5 and B7. The learner bell (S6) reuses the table |
| Audit view | **Done** (2026-11-26). `GET /api/admin/audit` and `/options` (`audit:read`, Super Admin only) with period (India days), who (a person, learners, or no account), action, record type and text search, sorted by time, action or record, 25 to a page, with the before and after of each entry. Page: Settings > Audit Log |

---

## Phase A9 (B9): Hardening

- Run the full authorization matrix per role against every `/api/admin/*` endpoint.
- Remove remaining demo disclosures; update help articles (`help-content.ts`) to describe real behavior; update README "Status" section.
- Delete unused fixture generators and `useDemoRecords` after the last screen migrates (keep deterministic generators only for seed and tests).
- Load test the busiest lists (Learners, Orders, Submissions) at expected volumes with realistic data.
- Backup/restore rehearsal, retention jobs for logs, PII access review.

---

## Admin tracker (52 existing screens + new)

Status: `Todo`, `In progress`, `Done`. Pattern: **L** = generic list via registry,
**C** = custom component with dedicated endpoints, **D** = decision page until approved.

| Section | Page | Pattern | Phase | Status |
|---|---|---|---|---|
| Home | Dashboard | C | A4 core, A8 full | **Done (core)** (2026-11-26): today's sessions with attendance, holidays and date navigation, weekly attendance with last-week comparison, signups vs enrollments by week; time spent, views, rating, daily active users and sales show "No data yet" until B5/B8 |
| Products | Events | L + editor | A2 (B2b) | **Done** (2026-11-26); three-step editor with up to 30 days in IST (overlap and real-date checks), platform-based venue and https link, free or paid price (minor units), capacity, manager from active staff, poster from an upload; active events cannot be deleted; ticket sales arrive with B5, feedback forms with B6, public event pages are not built |
| Products | Mentorships | D | A8 (conditional) | Todo |
| Products | eBooks | D | A8 (conditional) | Todo |
| Products | Test Series | D | A8 (conditional) | Todo |
| Products | Playlists | D | A8 (conditional) | Todo |
| Products | **Courses (new)** | L + editor | A2 | **Done** (2026-11-25) |
| Products | **Memberships (new)** | L | A5 | **Done** (2026-11-27) |
| Learning | Batches | L + editor | A4 | **Done** (2026-11-25); batch progress is the average of learners' course progress; choosing modules per batch and batch communities are not built |
| Learning | Sessions | C | A4 | **Done** (2026-11-25); create, weekly repeat, reschedule, cancel, holidays, attendance |
| Learning | Announcements | L | A4 | **Done** (2026-11-25); audience all or one batch (segments with B3b); in-app only, delivery with B7 |
| Learning | Feedback Forms | L + editor | A6 | **Done** (2026-11-27) |
| Learning | Module Library | L | A4 (B4b) | **Done** (2026-11-26); text, YouTube, link and file lessons in an ordered editor, used-module delete blocked; modules are added to a course in the Courses editor; quizzes arrive with assessments |
| Learning | Question Bank | L | A6 | **Done** (2026-11-27) |
| Learning | Asset Library | L + editor | A2 (B2b, needs uploads, D4) | **Done** (2026-11-26); uploads to a local storage driver (`STORAGE_LOCAL_DIR`, `UPLOAD_MAX_MB`), YouTube/link assets, replace file, de-duplication, summary cards, usage from lessons; delete blocked while used; images public, other files private |
| Learning | Assessments | L | A6 | **Done** (2026-11-27) |
| Learning | Submissions | L + review | A6 | **Done** (2026-11-27) |
| Learning | Session Recordings | L | A4 (B4b) | **Done** (2026-11-27); bulk delete, scope checks and audit |
| Learning | Certificates | L + editor | A6 | **Done** (2026-11-27) |
| Users | Learners | L | A3 | **Done** (2026-11-25); Enrolled/Completed tabs and course/batch filters added with A4 (2026-11-25) |
| Users | Team | L | A1 | **Done** (2026-11-25) |
| Users | Segments | L | A3 (B3b) | **Done** (2026-11-27); static and dynamic database segments |
| Users | New Enrolment | C | A4 | **Done** (2026-11-25); single, bulk and CSV, with dry runs; paid enrolments arrive with B5 |
| Engage | Community | C | A7 | **In progress** (2026-11-27); database community/posts/members/endpoints |
| Engage | Discussions | D | A7 (conditional) | Todo |
| Engage | **Support inbox (new)** | custom | A3 | **Done** (2026-11-25) |
| Marketing | Campaigns | L | A7 | Todo |
| Marketing | Workflows | D | A7 (conditional) | Todo |
| Marketing | Blogs | L | A2 (B2b) | **Done** (2026-11-26); Markdown article with summary, optional cover upload, author from active staff, Draft/Published/Hidden, web address made from the title (editable, unique), first publication date kept, views counted by the public page; the list searches, filters by visibility and created date and sorts; a published article cannot be deleted |
| Marketing | Marketing Banners | L | A2 (B2b) | **Done** (2026-11-26); image upload, https or on-site link, show-from/until dates (IST days), display order, Website home or Student portal home; the website home and student home read them; images stay in the Asset Library when a banner is deleted |
| Marketing | Leads | L | A2 | **Done** (2026-11-25) |
| Marketing | Promotional Templates | C | A7 | **In progress** (2026-11-27); database-backed templates; provider delivery not connected |
| Marketing | Promo Codes | C | A5 | Todo |
| Marketing | Testimonials | L | A2 | **Done** (2026-11-25) |
| Sales | Abandoned Cart | L | A5 | Todo |
| Sales | Cheque Management | C | A5 | Todo |
| Sales | **Orders and payments (new)** | L | A5 | Todo |
| Analytics | Sales & Enrollment | C | A8 | **In progress** (2026-11-26): live Product Enrollments and Course Wise Enrollments; Sales Overview, Payments Received, GST Report, Event and Membership Enrollments wait for B5 (and D6) |
| Analytics | Batch & Progress | C | A8 | **In progress** (2026-11-26): live Batch Progress, Learner Progress, Attendance, Batch Attendance, Module Progress and Inactive Learners (14 days); Batch Performance, Batch Assessment, Assessment Attempts and Issued Certificates wait for B6 |
| Analytics | Feedback & Rating | C | A8 | Todo (sample data until B6) |
| Analytics | Marketing | C | A8 | **In progress** (2026-11-26): live Lead Sources; Campaign Performance waits for B7 and Promo Code Usage for B5 |
| Analytics | Trainer | C | A8 | **In progress** (2026-11-26): live Trainer Summary and Session Log; ratings arrive with feedback forms (B6) |
| Analytics | Notification Logs | C | A8 | Todo (sample data until B7) |
| Analytics | Community Analytics | C | A8 | Todo (sample data until B7) |
| Analytics | More | C | A8 | **In progress** (2026-11-26): live Branch Statistics and Storage Consumption; Bandwidth waits for a download log, Scheduled Tasks and Wallet Recharges for B7, User-time for activity tracking |
| Analytics | Advanced Analytics | D / C | A8 (conditional) | Todo |
| Settings | My Profile | C | A1 | **Done** (2026-11-25) |
| Settings | **Audit Log (new)** | C | A8 | **Done** (2026-11-26); Super Admin only |
| Settings | Sub-Organizations | C | A1 | **Done** (2026-11-25) |
| Settings | System Notifications | C | A7 | Todo |
| Settings | Categories | C | A2 | **Done** (2026-11-25) |
| Settings | Custom Fields | C | A3 (B3b) | **Done** (2026-11-27); database definitions and scoped values |
| Settings | Grading System | C | A6 | **Done** (2026-11-27) |
| Settings | Miscellaneous Fees | C | A5 | Todo |
| Settings | International Selling | C | A5 | Todo |
| Settings | Learner Experience | C | A3 (B3b) | **Done** (2026-11-27); persisted sidebar and profile visibility read by the student shell |
| Settings | Utility Wallet | C | A7 | Todo |
| Website | **Site Settings, Books, People, Magazines, Videos, Legal Pages (new group)** | C + L | A2 | **Done** (2026-11-25) |
| Shell | Login, permission-aware nav | n/a | A1 | **Done** (2026-11-25) |
| Shell | Global search, notification bell, audit view | n/a | A8 | **Done** (2026-11-26); see the shell features table above |

## Admin permission keys (initial)

`team`, `branches`, `learners`, `segments`, `customFields`, `courses`,
`events`, `modules`, `assets`, `blogs`, `banners`, `testimonials`, `leads`,
`batches`, `sessions`, `announcements`, `recordings`, `enrolments`,
`orders`, `refunds`, `promoCodes`, `fees`, `cheques`, `memberships`, `wallet`,
`questionBanks`, `assessments`, `submissions`, `feedbackForms`,
`certificates`, `grading`, `communities`, `campaigns`, `templates`,
`notifications`, `reports`, `settings`, `audit`. Each supports `read`,
`write`, `delete`, and where relevant `export`, `publish`, `issue`, `refund`.
The role map is the draft in FOUNDATION_PLAN section B1.4 pending D3.
