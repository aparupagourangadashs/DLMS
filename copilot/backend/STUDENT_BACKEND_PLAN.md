# Student Portal: Backend Plan (phase by phase)

Parent: [MASTER_PLAN.md](./MASTER_PLAN.md). Spec: [STUDENT_PORTAL_SPEC.md](../STUDENT_PORTAL_SPEC.md).
Models: [DATA_MODEL.md](./DATA_MODEL.md).

**Current state:** 13 core screens + 3 sample-course readers under `/student`,
driven by `src/lib/student/demo.ts` (courses, sessions, announcements, banners,
profile) and page-local state. No accounts, ownership checks, or persistence.

**Goal:** a secure learner area where every record belongs to the signed-in
learner and is enforced on the server.

**Rules for every student page**

1. Session required: `requireLearner()` in the Server Component and in each
   `/api/student/*` handler. `proxy.ts` is only a redirect convenience.
2. Ownership: queries always filter by the session's `learnerId`. A request for
   another learner's record returns **404**.
3. DTOs expose only the learner's own data; no staff-only fields (internal
   notes, other learners, evaluator comments marked private).
4. Distinct loading / empty / error states. A failed fetch is never rendered as
   an empty list (the specs call this out explicitly).
5. Times shown in the learner's saved timezone (default `Asia/Kolkata`).
6. Opening a lesson or course never marks it complete; completion is a
   server-side rule.
7. Remove the "demo" disclosure banner from a page only when its backend is live.

**Data-access pattern:** reads use Pattern A in `page.tsx` (service call with
`requireLearner()`), interactive refresh/mutations use `/api/student/*` with the
`apiClient` hooks (Pattern B/C), see MASTER_PLAN section 3.1.

---

## Phase S1 (B1): Auth, shell, protection

| Item | Work |
|---|---|
| New pages | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` (shared with website links) |
| `StudentShell.tsx` | Read the session in the student `layout.tsx`; show real name/initials in `StudentAvatar`; the profile menu's **Exit demo** becomes **Sign out**; remove demo-only copy from the header |
| Route protection | `proxy.ts` matcher `/student/:path*`; `student/layout.tsx` calls `requireLearner()` and redirects when missing; staff users hitting `/student` see a message/redirect to `/admin` |
| Header links | Courses -> `/website` collections; Contact Us -> `/website/contact`; Subscription -> `/student/memberships` (when B5 lands); Communities -> `/student/communities` |
| Search (header) | Hidden/disabled until the shared search endpoint exists (S6) |

Exit gate: unauthenticated `/student/*` redirects to login; authorization suite
from FOUNDATION B1 passes.

---

## Phase S2 (B3): Settings and Help

### Settings: Profile (`/student/settings/profile`)

| Aspect | Detail |
|---|---|
| Data | `LearnerProfile` (+ `CustomFieldValue` for admin-defined fields shown on the profile) |
| Read | `GET /api/student/profile` -> grouped DTO: Personal (name, username, DOB, gender), Parent (name, email, phone), Education (standard), Contact (mobile, alt contact, email), Address (residential, city, state, pincode, permanent), Student Source |
| Write | `PATCH /api/student/profile` (partial update by group) |
| Rules | Server validation: name required, username unique and slug-safe, email change requires re-verification (email is the login id; decide D2), phone format, pincode 6 digits for India, DOB not in the future. Only fields the student may edit are writable (registration no. and status are read-only). Audit profile changes. |
| Frontend | `StudentSettings.tsx` (`tab="profile"`): replace temporary local edits with load + save; keep Edit/Cancel; success toast; inline field errors from API `fields`; drop "Reset demo" control |
| Home dependency | Profile completion card on Home uses the same checklist computed server-side (`profileCompletion`) |

### Settings: Preferences (`/student/settings/preferences`)

| Aspect | Detail |
|---|---|
| Data | `NotificationPreference`, `LearnerProfile.timezone/timezoneAuto` |
| Endpoints | `GET/PUT /api/student/preferences` |
| Rules | Timezone must be a valid IANA zone; "Set automatically" stores `timezoneAuto=true` and the detected zone on each login/visit; promotional channels (WhatsApp, Email, SMS, Push) only honored when promotional consent is on; **this record is the consent source of truth** checked by notify service before any campaign; session reminders (1 day, 1 hour, at start) drive the reminder job in B4/B7 |
| Frontend | `StudentSettings.tsx` (`tab="preferences"`): load/save, optimistic toggles with rollback on error, remove "page-local only" notice |

### Help (`/student/help`)

| Aspect | Detail |
|---|---|
| Data | `SupportRequest` (+ `SupportReply`); contact/social/app destinations from `SiteSetting` |
| Endpoints | `POST /api/student/support-requests` (message min 10 chars as in UI, max length cap), `GET /api/student/support-requests` (own requests and status) |
| Rules | Rate limit per learner; attach learner id; notify staff (email/console); never echo other users' tickets |
| Frontend | `StudentHelp` in `StudentPages.tsx`: replace "unsent draft" with real submit; show confirmation and recent request status list; keep FAQ content (source: `SiteSetting`/`FaqItem` or static until approved); fill contact/mail/call/app links from settings |
| Admin counterpart | Support inbox screen (gap in MASTER_PLAN section 7), added in ADMIN B3 |

Exit gate: learner edits profile and preferences; admin Learners page shows the
change; a support message appears in the staff inbox.

---

## Phase S3 (B4): Learning

### Home (`/student`)

| Block | Backend |
|---|---|
| Featured-course carousel | `GET /api/student/home` -> banners (`Banner` placement `STUDENT_HOME`, active window) and launches; keep `courseBanners` image slides as seed |
| Today's Classes | Sessions from the learner's active enrolments for **today in the learner timezone**, ordered; includes join URL only within the join window; empty state when none |
| Continue Learning | Active enrolments with `progressPercent`, completed/total lessons, "resume" target (last lesson); "See all" -> My Learning |
| At a Glance | Counts: this week's sessions, unread announcements; links to announcements |
| Profile completion | `profileCompletion` (S2) |

Frontend: `StudentHome` in `LearningPages.tsx` becomes data-driven. Remove
client-side `studentToday` clock logic where the server supplies the date, but
keep the minute refresh for the "today" panel. Separate loading, empty, error.

### My Learning (`/student/my-learning`)

| Aspect | Detail |
|---|---|
| Data | `Enrollment` joined to `Course`, `Batch`, progress counts |
| Endpoint | `GET /api/student/enrollments?status=active\|completed&stream=` |
| Rules | Only own enrolments; "Active" = `ACTIVE` within access window; "Completed" = `COMPLETED`; expired shows as expired, not active; enrolment period and organization label returned (gaps in the spec review) |
| Frontend | `MyLearning` search/stream filter client-side over a small list; tabs call the endpoint or filter loaded data |

### Course player (`/student/learning/[course]`)

| Aspect | Detail |
|---|---|
| Authorization | Learner must have an active enrolment (or membership entitlement) for the course; otherwise 404/"Not enrolled" with link to the course page |
| Content | `GET /api/student/courses/[slug]/content` -> ordered modules/lessons (`ModuleContent`) with type, minutes, completion state |
| Lesson body | Text/markdown rendered via safe renderer; video/audio/PDF through **short-lived signed URLs** from `GET /api/student/assets/[id]/access`; YouTube/Link embeds from approved URLs only |
| Progress | `POST /api/student/lessons/[id]/progress` (position heartbeat) and `POST .../complete`; rule by type (D7): text = explicit "Mark complete" after minimum time, video = watched threshold (default 90%), PDF = explicit mark. Server computes `Enrollment.progressPercent`. Opening a lesson never completes it. |
| Resume | Last position/lesson returned for the "Continue" action |
| Frontend | `CourseReader` in `LearningPages.tsx`: replace `courses[...]` fixture lessons; keep previous/next; add completion control; show offline/error states |

### Announcements (`/student/announcements`)

| Aspect | Detail |
|---|---|
| Data | `Announcement` filtered by audience (all / learner's batches / segments), published; `AnnouncementRead` |
| Endpoints | `GET /api/student/announcements?q=&unread=1`, `POST /api/student/announcements/[id]/read` |
| Rules | Priority/urgency order; unread derived per learner; scheduled items hidden until `publishAt` |
| Frontend | `StudentAnnouncements`: server search, Show Unread toggle, detail dialog marks as read (persisted) |

### Calendar (`/student/calendar`)

| Aspect | Detail |
|---|---|
| Data | `Session` of the learner's enrolled batches, plus registered `Event` days, minus cancelled (shown as cancelled), `Holiday` |
| Endpoint | `GET /api/student/calendar?from=&to=` (range for the visible Day/Week/Month) |
| Rules | Convert to learner timezone; join link exposed only in join window; add the missing List view (spec gap) |
| Frontend | `StudentCalendar`: fetch per visible range; keep `calendarDays`/`shiftCalendarDate` helpers; remove "Demo dates" control |

### Reminders (job, no page)

`JobQueue` entries for session reminders at 1 day, 1 hour, and start, created
when sessions are scheduled; the sender honors `NotificationPreference` and
quiet-hours rules (D5/D7). Delivery uses the notify layer (console driver until B7).

Exit gate: enrolled learner opens a published course, completes lessons,
progress persists and is visible to admin; calendar matches batch sessions;
unenrolled learner cannot open the content.

---

## Phase S4 (B5): Commerce pages

### My Purchases (`/student/my-purchases`)

| Aspect | Detail |
|---|---|
| Data | `Order`, `OrderItem`, `Payment`, `Invoice` |
| Endpoints | `GET /api/student/orders`, `GET /api/student/orders/[id]` (detail), `GET /api/student/orders/[id]/invoice` |
| Rules | Own orders only; status labels from verified server state; refunds shown when processed; invoice only after tax format is approved |
| Frontend | `StudentPurchases`: replace fictional cards; "View Details" opens real detail dialog |

### Checkout (new, if D9 approves native enrolment)

`POST /api/student/orders` (idempotent; server computes price, discount, tax,
fees), `POST /api/student/orders/[id]/pay` returns Razorpay order data,
`GET /api/student/orders/[id]/status` polled after return. Entitlement is
granted only by the verified webhook (see ADMIN B5 commerce). Free courses create a
zero-value order and enrolment directly.

### Memberships (`/student/memberships`)

`GET /api/student/memberships` (active/expired, benefits, renew date). Purchase
and renew through the checkout flow. Cancellation rules per D6. The empty
state and support link stay.

### Refer & Earn (`/student/refer-and-earn`)

| Aspect | Detail |
|---|---|
| Data | `ReferralCode`, `ReferralTransaction`, `CreditLedger` |
| Endpoints | `GET /api/student/referrals` (own code, balance, how-it-works text), `GET /api/student/referrals/transactions` |
| Rules | Code generated once per learner; never visible to others; rewards credited only after the referred learner's paid order is verified (rules D6); self-referral and duplicate-account abuse checks |
| Frontend | `StudentReferrals`: real code/balance; Copy and Share keep client behavior; terms link from settings |

Exit gate: sandbox payment grants enrolment; duplicate webhook does not double
grant; learner cannot read another learner's order.

---

## Phase S5 (B6): Exams and Certificates

### Exams (`/student/exams`)

| Aspect | Detail |
|---|---|
| Data | `Assessment`, `AssessmentRegistration`, `Attempt`, `Submission` |
| Endpoints | `GET /api/student/exams?tab=upcoming\|past`, `POST /api/student/exams/[id]/start`, `PUT /api/student/attempts/[id]/answers`, `POST /api/student/attempts/[id]/submit`, `GET /api/student/attempts/[id]/result` |
| Rules (D7, confirm first) | Eligible only if enrolled/registered and inside the window; attempts limited; timer enforced server-side (client clock is advisory); autosave answers; submission locked once submitted; result visibility configured by assessment; assignments accept file upload (type/size validated, private storage) |
| Frontend | `StudentExams`: tabs call the endpoint; add exam-taking screen (new route `/student/exams/[id]`), submit confirmation, result page |

### Certificates (`/student/certificates`)

| Aspect | Detail |
|---|---|
| Data | `Certificate` (+ template/asset) |
| Endpoints | `GET /api/student/certificates`, `GET /api/student/certificates/[id]/download` (PDF from the job-generated file), `GET /api/student/certificates/[id]/share` (public verification URL) |
| Rules | Own certificates only; shows Issued and Expiry; expired/revoked flagged; download streams a private file via authorized route (not a public URL) |
| Frontend | `StudentCertificates`: replace invalid watermarked SVG demo with real card, Download and Share actions; remove "invalid sample" labelling |

Exit gate: learner starts, submits, and sees a result; passing learner receives
a certificate that verifies on the public page.

---

## Phase S6 (B7): Communities and notifications

### Communities (`/student/communities`)

| Aspect | Detail |
|---|---|
| Data | `Community`, `CommunityMember`, `CommunityPost` |
| Endpoints | `GET /api/student/communities` (joined + latest post preview), `GET /api/student/communities/[id]/posts?cursor=`, `POST .../posts`, `POST .../posts/[id]/report` |
| Rules | Only members see posts; membership via batch or admin; message/feed layouts; rate limits; hidden/removed posts excluded; no personal data beyond display name/avatar; posting rules from moderation decision (D8) |
| Frontend | `StudentCommunities`: replace fictional feeds; add composer when posting is approved; reporting action |

### Notification centre and header search

- `InAppNotification` list/read endpoints and a bell menu in the shell.
- `GET /api/student/search?q=` over the learner's enrolled courses/lessons/exercises, filtered by access.

---

## Phase S7 (B9): Privacy and polish

- Data export and deletion request flow (per approved retention policy).
- Session list/revoke (device policy D2).
- Accessibility pass on drawers, tabs, switches, calendar, dialogs with live data.
- Replace remaining demo disclosures; update `STUDENT_PORTAL_SPEC.md`/README status.

---

## Student endpoint inventory

| Endpoint | Phase |
|---|---|
| `GET/PATCH /api/student/profile` | S2 |
| `GET/PUT /api/student/preferences` | S2 |
| `GET/POST /api/student/support-requests` | S2 |
| `GET /api/student/home` | S3 |
| `GET /api/student/enrollments` | S3 |
| `GET /api/student/courses/[slug]/content` | S3 |
| `GET /api/student/assets/[id]/access` | S3 |
| `POST /api/student/lessons/[id]/progress`, `/complete` | S3 |
| `GET /api/student/announcements`, `POST .../[id]/read` | S3 |
| `GET /api/student/calendar` | S3 |
| `GET /api/student/orders`, `/orders/[id]`, `/orders/[id]/invoice`, `POST /orders`, `/orders/[id]/pay`, `GET /orders/[id]/status` | S4 |
| `GET /api/student/memberships` | S4 |
| `GET /api/student/referrals`, `/referrals/transactions` | S4 |
| `GET /api/student/exams`, `POST /exams/[id]/start`, attempts endpoints | S5 |
| `GET /api/student/certificates`, `/[id]/download`, `/[id]/share` | S5 |
| Communities endpoints, notifications, search | S6 |

## Student tracker

| Page / feature | Phase | Status |
|---|---|---|
| Auth pages + shell protection | S1 | **Done** (2026-11-25) |
| Settings: Profile | S2 | **Done** (2026-11-25); email and registration number are read-only, pincode accepts international postal codes |
| Settings: Preferences | S2 | **Done** (2026-11-25); saved with an explicit Save button; the consent rule is `allowedPromotionalChannels`; automatic timezone is a one-time detect, not refreshed on every visit |
| Help | S2 | **Done** (2026-11-25); messages, replies and contact details; FAQ copy still static |
| Home | S3 | **Done** (2026-11-25); profile card, today's classes (join link from 15 minutes before), counts, latest announcements and active courses are live |
| My Learning | S3 | **Done** (2026-11-25); the learner's enrolments with status, batch and access dates; sample course previews stay clearly labelled |
| Course player | S3 | Todo (B4b); needs the module library; progress stays 0% until it lands |
| Announcements | S3 | **Done** (2026-11-25); audience and schedule rules, urgency order, read status saved per learner; search and unread filter run in the browser over the latest 200 notices |
| Calendar | S3 | **Done** (2026-11-25); the learner's classes and holidays for the visible range, refreshed every minute; events and timezone display arrive later |
| My Purchases (+ checkout) | S4 | Todo |
| Memberships | S4 | Todo |
| Refer & Earn | S4 | Todo |
| Exams (+ exam taking) | S5 | Todo |
| Certificates | S5 | Todo |
| Communities | S6 | Todo |
| Notification centre, search | S6 | Todo |
| Privacy and polish | S7 | Todo |
