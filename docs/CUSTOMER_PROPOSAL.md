# IBMV Learning Platform
## Customer Proposal, Deliverables and Quotation

**Prepared for:** IBMV Mahavidyalaya  
**Prepared by:** Aparupa Gouranga Das  
**Proposal date:** 19 October 2026  
**Project investment:** **₹5,00,000 (Rupees Five Lakh Only)**  
**Delivery:** Public website, student portal, admin panel, shared platform services

---

## 1. Executive summary

We propose to design and deliver a connected learning platform for IBMV with
three user-facing portals: a public website for visitors, a student portal for
learners, and an administrator panel for IBMV staff. Shared platform services
will connect courses, enrollments, student progress, payments, memberships,
exams, certificates, communications, and reporting.

The delivery will be demonstrated in stages on a private test environment.
The project includes functional and integration testing, security checks,
performance/load testing against an agreed target of at least 1,000 concurrent
virtual users, data migration assistance, staff training, launch, and three
months of post-launch bug-fix support.

The features described below are the agreed proposed scope. Where the
reference platform showed a restricted, loading, legacy, or “Coming Soon”
screen, the feature is stated as a proposed functional implementation only
where it is included here; it is not represented as a verified copy of the
reference system.

## 2. Deliverables at a glance

| Deliverable | What it provides |
|---|---|
| Public website | Institutional information, searchable course catalogs, course details, publications, contact information, and clear enrollment/app links. |
| Student portal | Student dashboard, learning access and progress, community and announcements, calendar, exams, certificates, purchases, memberships, referrals, help, and settings. |
| Admin panel | Role-controlled tools for managing content, courses, learners, teaching operations, commerce, communications, reports, and platform settings. |
| Shared platform services | Authentication, role/permission checks, API/data layer, audit events, file/media access controls, notifications, payment integration, backups, and monitoring. |
| Testing and launch | Test plans and execution, security review, 1,000+ virtual-user load test, acceptance support, migration assistance, production deployment, and staff handover. |

## 3. Public website deliverables

### 3.1 Shared site shell

- Responsive desktop and mobile header, navigation dropdowns, utility bar,
  and footer.
- Contact email/telephone links, donation link, social links, and learner-app
  download link.
- Sign-up and log-in entry points connected to the student authentication
  flow.
- Footer links for useful pages, terms, privacy, and social channels.
- Accessible navigation, page headings, keyboard focus, and image text
  alternatives.

### 3.2 Homepage

- Institution hero, short introduction, participation metric, and calls to
  action for exploring courses, downloading the app, and joining the community.
- Course-library sections for:
  - ISKCON Board of Examination
  - Self-study courses
  - Ancient Wisdom
  - Kids & Parents
  - Level Wise Shastric Study
  - Live Classes
- Course cards with applicable title, image, summary, teacher, paid/free or
  price information, duration, language/category/level, start date, course
  type, and enrollment action.
- Testimonials and video sections.

### 3.3 Course catalog pages

- Dedicated catalog pages for each course collection listed above.
- Search; category, teacher, language, and status filters as applicable to the
  collection.
- Upcoming, ongoing, and coming-soon groupings where applicable.
- Responsive course-card layouts, empty/loading/error states, and links to
  course details.
- “Coming Soon” content can be managed as a visible status rather than shown
  as a broken page.

### 3.4 Course detail pages

- Course summary, teacher/provider, fee/price, certificate/type indicator, and
  enrollment call to action.
- Configurable course facts: duration, session length/count, frequency,
  language, eligibility, and prerequisites.
- Schedule section with start date, date range, session times/timezone,
  regular class days, and detailed schedule link.
- Teacher information, course description, learning materials, audience,
  assessment plan, requirements, and expandable FAQs.
- External course resources and recommendation/application links where
  supplied and approved by IBMV.

### 3.5 Publications and institutional pages

- Books catalog grouped by language with format information and approved
  retailer links.
- Bulk-book enquiry form with first name, last name, address, pincode, city,
  book, quantity, email, country/phone code, and mobile number.
- E-magazine archive page and issue viewer/download interface. Exact archive
  fields will be finalized with IBMV because the reference feed was loading
  during inspection.
- Institutional overview, Srila Prabhupada information, advisory board,
  organization team, and contact/location pages.
- Contact page with postal address, email, telephone, and map/location area.

## 4. Student portal deliverables

### 4.1 Shared student shell

- Secure sign-in/session handling and student-specific navigation.
- Responsive header with Home, Courses, Contact Us, Subscription, Communities,
  Search, Profile, and sign-out entry points.
- Student ownership checks for private profile, enrollment, progress,
  purchase, referral, certificate, and communication records.

### 4.2 Student pages and menu functions

| Student menu | Included functionality |
|---|---|
| Home | Featured-course carousel, today's classes, continue-learning cards, progress, lesson counts, and resume/open action. |
| My Learning | Active/completed learning views, stream selection, enrolled course cards, learning dates, progress, and course resume link. |
| Communities | Community list and authorized community spaces, latest posts, and agreed discussion interactions. User-generated content is private to authorized members. |
| Announcements | Searchable announcement feed, unread filter, priority/date information, and announcement detail view. |
| Calendar | Day/week/month views, date navigation, Today control, scheduled classes, and timezone-aware display. |
| Exams | Upcoming and past exam views, eligibility/status, and agreed examination attempts and result access. Exam rules are finalized during planning. |
| Certificates | Earned certificate cards with issue/expiry information and download/share actions. |
| Memberships | Current membership status, plan/benefit information, and expiry/renewal information where applicable. |
| My Purchases | Purchase history cards with item, date, amount/free status, payment status, and purchase detail link. |
| Refer & Earn | Student's referral code, copy/share controls, rewards/credits summary, terms, and transaction history according to approved program rules. |
| Help | Support message form, contact options, and submission feedback. |
| Settings | Profile view/edit and preferences for timezone, session reminders, promotional notifications, and available communication channels. |
| Sign Out | Ends the authenticated session. |

### 4.3 Learning and access rules

- Enrolled students see only courses and materials authorized for their
  enrollment or active membership.
- Course learning view supports agreed video/PDF lesson types, lesson
  navigation, progress, resume position, and live-class links.
- Lesson completion and assessment status are stored server-side; opening a
  lesson alone does not mark it complete.
- Paid media/files use protected access rules and expiring/signed access
  where supported by the selected hosting provider.
- Student-facing errors, empty states, and loading states are explicit.

## 5. Admin panel deliverables

### 5.1 Admin shell and common capabilities

- Role-based staff accounts, navigation, permissions, and session management.
- Dashboard, global search entry point, quick-create menu, notification entry
  point, profile menu, and logout.
- Reusable list patterns: search, filters, tabs/status, column selection,
  pagination, export, empty/loading/error states, and row actions.
- Create/edit/view/archive flows for agreed entities, with field validation,
  confirmation for consequential actions, and success/error feedback.
- Audit history for significant staff changes.

### 5.2 Admin navigation and included functions

| Admin menu | Included screens and operations |
|---|---|
| Home | Performance cards and reports, active-user/enrollment summaries, sales chart, today's sessions, attendance/sign-in summary, session schedule/calendar, and holiday management. |
| Products → Events | Event list, visibility/status filters, create/edit/archive, event dates, and event actions. |
| Products → Mentorships | Mentorship catalog and administration, subject to final agreed fields and workflow. |
| Products → eBooks | eBook catalog/content records and publication state where required by IBMV. |
| Products → Test Series | Test-series catalog and associated assessment links. |
| Products → Playlists | Curated course/lesson playlist management. |
| Learning → Batches | Create/manage batches; filter by status/course/module/instructor; Active, Completed, Archived, All; batch/course/duration/instructor/manager/progress fields. |
| Learning → Sessions | Calendar and list/day/week/month views, session scheduling, class details, attendance/sign-in, and session actions. |
| Learning → Announcements | Create/manage announcements; date/tag filters; name search; urgency, tags, publication timing, and actions. |
| Learning → Feedback Forms | Create/manage feedback forms; form name, created date, type, conversions, and action fields. |
| Learning → Module Library | Search, add, and manage reusable modules; module name, content, and actions. |
| Learning → Question Bank | Create/manage question banks and questions; ID, name, difficulty, exam, subject, topic, and actions. |
| Learning → Asset Library | Search/filter/upload media assets; type, usage, storage summaries, uploader/date/size/downloads, and actions. |
| Learning → Assessments | Assignment-based and custom-link assessment lists; courses, pricing, attempts/registrations, and add/edit actions. |
| Learning → Submissions | Search/filter submissions; Not Evaluated/Evaluated/All; learner, assessment, evaluation status, date, timeliness, type, marks, percentage, product, batch, and review action. |
| Learning → Session Recordings | Search/filter recordings by date/batch; active/completed/archived batch views; class, batch, instructor, status, and actions. |
| Learning → Certificates | Create/manage certificate templates/issuance rules and view issued certificate records. |
| Users → Learners | Add/view/manage learners; filters; All/Registered/Enrolled/Completed/On Leave/Archived; learner, contact, date added, status, registration number, configurable columns, and export. |
| Users → Team | Add/manage staff; Active/Archived users; name, role, contact, date added, branch, actions, and export. |
| Users → Segments | Create/search learner segments; segment name, type, learner count, created date, and actions. |
| Users → New Enrolment | Single enrollment, bulk enrollment, learner registration, and advanced bulk enrollment workflows. |
| Engage → Community | Community management, members, messages, pins, and agreed moderation tools. |
| Engage → Discussions | Discussion areas linked to approved courses/batches and moderated by authorized staff. |
| Marketing → Campaigns | Campaign list/create/schedule; channel/status/date filters; type, channel, schedule, created date, send status/count, and actions. |
| Marketing → Workflows | Configurable communication/automation workflows, subject to role permissions and agreed triggers. |
| Marketing → Blogs | Create/manage blog content; status, views, created date, visibility filters, and actions. |
| Marketing → Banners | Add/edit banners; thumbnail, name, status, and publication controls. |
| Marketing → Leads | Lead/enquiry directory, status tracking, and follow-up workflow as approved. |
| Marketing → Promotional Templates | Manage reusable promotion/message templates. |
| Marketing → Promo Codes | Create/manage discount codes, validity, eligibility, and usage limits. |
| Marketing → Testimonials | Manage testimonials and public-site publication status. |
| Sales → Abandoned Cart | Abandoned/completed views, date/course filters, summary totals, learner/contact, items, cart value, abandoned date, actions, and export. |
| Sales → Cheque Management | Record/review cheque payment status and reconciliation fields finalized during planning. |
| Analytics | Reports for sales/enrollment, batch/progress, feedback/ratings, marketing, trainers, notification logs, community, and advanced reporting; agreed exports and filters. |
| Settings → Profile & Organization | Admin profile, organization/sub-organization configuration, and profile/password actions. |
| Settings → System Notifications | Configure system notification settings. |
| Settings → Setup & Customization | Categories, custom fields, grading system, miscellaneous fees, international selling, and learner experience options. |
| Settings → Manage Billing | Utility wallet/balance view and agreed billing information. |

**Field definitions and acceptance:** Table fields above follow the visible
reference labels where observed. Final column sets, custom fields, filters,
roles, and actions are confirmed during Stage 0. Access-restricted or
Coming-Soon reference pages do not define existing behavior; implementation
will follow the agreed requirements and permissions.

## 6. Shared services and integrations

- Common API and data model for students, staff, courses, lessons, batches,
  enrollments, progress, products, orders, memberships, exams, certificates,
  and communications.
- Razorpay payment integration for agreed purchase types, server-side payment
  verification, webhook handling, receipts, duplicate-payment protection, and
  refund tracking.
- Email, WhatsApp Business, SMS, and browser/push notification integration
  using customer-owned provider accounts and approved templates.
- Video/file hosting integration selected with IBMV; paid content access rules.
- Role-based authorization and admin audit events.
- Automated backup configuration, restore procedure, application monitoring,
  error logging, and launch handover.

Third-party account approval, transaction fees, subscription costs, hosting,
video storage/egress, domain, and messaging charges are excluded from the
project fee.

## 7. Testing, security, and 1,000+ concurrent-user load target

### 7.1 Testing included

- Requirements traceability and stage-level acceptance checks.
- Unit/component tests for critical business logic and reusable UI.
- End-to-end functional tests for registration, login, enrollment, course
  access/progress, payment confirmation, exam submission, certificate access,
  and admin workflows.
- Integration tests for Razorpay webhooks and configured messaging/media
  integrations, using test/sandbox accounts where offered.
- Regression checks on supported desktop/mobile browsers and responsive
  layouts.
- Accessibility checks for critical navigation, forms, keyboard access,
  headings, and feedback states.
- Security checks covering authentication, role/ownership enforcement,
  input validation, common web risks, secret handling, and payment verification.
- Backup/restore and production-readiness checks.
- IBMV staff acceptance testing and issue resolution for in-scope defects.

### 7.2 Load-test objective and method

The included load test targets **at least 1,000 concurrent virtual users**
performing a representative mix of public catalog browsing, student
authentication/session use, course/dashboard reads, and admin list/report
reads. Test scripts, ramp profile, data volume, and endpoint mix will be agreed
before the test. The test will include a controlled ramp-up, a sustained run,
and a short peak/spike run. Test accounts and synthetic/non-production data
will be used.

Proposed acceptance targets for the agreed production-like application
environment:

- Sustain 1,000 simulated concurrent user sessions for at least 30 minutes
  after ramp-up.
- Standard application read/API operations: p95 response time at or below
  800 ms, excluding third-party services and long-running reports.
- Core browser page load for agreed pages: p95 at or below 2.5 seconds on the
  agreed test network/device profile, excluding external media playback and
  third-party widgets.
- Application error rate below 1% for valid scripted transactions, excluding
  deliberately invalid inputs and failures demonstrably caused by external
  providers.
- No unresolved critical/high-severity performance defects or data-integrity
  errors in the tested scenarios.

The report will include environment and data assumptions, virtual-user
profile, throughput, latency percentiles, error rate, resource observations,
findings, and recommendations. A remediation/retest cycle for in-scope
performance defects is included.

**Important capacity qualification:** This is a tested engineering target, not
an unconditional guarantee of capacity in an unspecified hosting environment.
The target depends on production-equivalent server/database sizing, caching,
network, CDN/video provider, and any customer-managed integrations. The test
covers application/API transactions, not 1,000 simultaneous high-bitrate video
streams; video delivery must be capacity-supported by the chosen specialist
provider. Hosting/server scale-up costs and provider charges are not included.
The acceptance environment and pass/fail rules must be signed off in Stage 0.

## 8. Delivery plan and estimated schedule

Target delivery is approximately **24 calendar weeks**, with a planning
allowance of **up to 28 weeks** for feedback, data readiness, and third-party
approvals. Workstreams overlap; stage estimates below are not additive
calendar durations.

| Stage | Main deliverable | Indicative weeks |
|---|---|---:|
| 0. Planning and design | Approved designs for all portals, workflows, data/permissions, membership/access rules, and load-test plan | 2.5 |
| 1. Foundation | Environments, authentication, roles, shared data/API foundations | 2.5 |
| 2. Public website | Public pages, catalogs, course detail, publication/contact pages, and content administration | 4.5 |
| 3. Courses and learning | Student portal, courses/lessons, batches/sessions, progress, and learning access | 5 |
| 4. Payments | Razorpay sandbox/live integration, orders, receipts, coupons, and refund tracking | 3.5 |
| 5. Exams and certificates | Assessment flows, results, certificate generation/verification | 3.5 |
| 6. Memberships and referrals | Plans, entitlements, renewals, referral rewards and records | 3.5 |
| 7. Communication | Announcements, community/discussion scope, calendar, help desk, reminders | 5 |
| 8. Admin and polish | Admin modules/reports, exports, SEO, language/accessibility and final UI polish | 2.5 |
| 9. Migration and launch | Agreed data migration, security/load tests, staff training, deployment, handover | 3.5 |

Each stage includes a working demo and an agreed feedback/acceptance round.
Delays in data, content, decisions, access to partner accounts, or provider
approval can shift the launch date.

## 9. Fixed project quotation: ₹5,00,000

| Work package | Amount |
|---|---:|
| Public website and catalog experience | ₹53,000 |
| Student portal and learner workflows | ₹2,03,000 |
| Admin panel and staff operations | ₹2,44,000 |
| Shared backend, APIs, authentication, integrations, and platform services (included at no additional charge) | ₹0 (included) |
| Quality assurance, security checks, performance engineering, and 1,000+ user load-test execution/report (included at no additional charge) | ₹0 (included) |
| Migration assistance, deployment, staff training, and three-month bug-fix support (included at no additional charge) | ₹0 (included) |
| **Total project quotation** | **₹5,00,000** |

This is a fixed-scope estimate based on the deliverables in this proposal.
Work outside the agreed scope will be estimated and approved in writing before
it begins.

### Payment schedule

| Milestone | Share | Amount |
|---|---:|---:|
| Project start | 30% | ₹1,50,000 |
| Acceptance after Stage 3: Courses and Learning | 30% | ₹1,50,000 |
| Acceptance after Stage 7: Communication | 30% | ₹1,50,000 |
| Go-live | 10% | ₹50,000 |

**Tax:** The earlier proposal draft stated “No GST is charged.” Tax treatment
must be confirmed against the supplier's registration and applicable law and
will be stated on the final invoice.

## 10. Included and excluded

### Included

- Three portals and shared services described in this proposal.
- Razorpay integration and configured messaging/media-provider connections.
- Functional, integration, regression, security, and load testing described
  above.
- Migration assistance for customer-provided, agreed-format data.
- Staff training and deployment handover.
- Three months of post-launch bug-fix support for defects in delivered,
  accepted scope.

### Excluded or separately chargeable

- Hosting, cloud/server/database capacity, CDN, domain, email subscription,
  video hosting/storage/egress, WhatsApp/SMS/push fees, and payment
  transaction fees.
- Native Android/iOS applications. A responsive website/PWA experience is
  included; app-store publication is separate unless explicitly agreed.
- Data cleanup, reconstruction, or migration from unsupported/undocumented
  systems beyond the agreed import format and mapping.
- New features, major scope changes, third-party subscriptions, or partner
  implementation fees.
- Ongoing support/maintenance after the included three-month bug-fix period.
- Live video infrastructure/provider guarantees or a load test of actual
  video-stream delivery.

## 11. IBMV inputs and decisions required

1. Named project decision-maker and feedback within two working days.
2. Final branding, approved content, course details, teacher bios, book data,
   policies, and legal notices.
3. Course/membership access, expiry, renewal, refund, coupon, referral, exam,
   grading, certificate, and student communication rules.
4. Data exports for students, courses, enrollments, and progress, plus a
   decision on account migration/reset and student communication.
5. Customer-owned Razorpay, email, WhatsApp Business, SMS, video/media, and
   hosting accounts and required approvals.
6. Hosting environment and scale budget capable of supporting the agreed load
   profile; production-equivalent environment for acceptance load test.
7. Confirmation of supported languages, invoice/tax format, accessibility
   requirements, and donation scope.
8. Staff to participate in training and user acceptance testing.

## 12. Acceptance, warranty, and change control

- Stage acceptance is based on the approved stage deliverables and test cases.
- IBMV reports reproducible in-scope defects during acceptance; the delivery
  team resolves them before stage sign-off or documents an agreed exception.
- Final sign-off follows production-readiness checks, agreed load-test
  criteria, migration rehearsal/approval, staff acceptance, and launch
  checklist.
- Three months of bug-fix support starts from go-live and covers defects in
  delivered scope. It does not include new features, provider outages,
  hosting upgrades, or changes made by third parties.
- Scope, acceptance targets, schedule, and commercial changes require written
  approval from both parties.

## 13. Approval

| For IBMV Mahavidyalaya | For the delivery team |
|---|---|
| Name: ______________________________ | Name: Aparupa Gouranga Das |
| Signature: _________________________ | Signature: _________________________ |
| Date: ______________________________ | Date: ______________________________ |
