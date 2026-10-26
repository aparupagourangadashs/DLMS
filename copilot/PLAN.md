# IBMV Learning Platform: Phase-wise Implementation Plan

## 1. Purpose and basis

This plan turns the observed specifications and the customer proposal into a
phase-by-phase build plan for three connected portals: the public website, the
student portal, and the admin panel, plus the shared backend and platform
services. It includes a dedicated UI/UX phase: learn from existing LMS products
first, then create an original, polished IBMV design system applied to every
page and component.

Source documents:

| Document | Used for |
|---|---|
| [WEBSITE_PORTAL.md](./WEBSITE_PORTAL.md) | Public pages, catalogs, course detail, publications, contact, external actions |
| [STUDENT_PORTAL_SPEC.md](./STUDENT_PORTAL_SPEC.md) | Student menus, page features, profile/preferences, privacy rules |
| [ADMIN_PANEL_SPEC.md](./ADMIN_PANEL_SPEC.md) | Admin menus, routes, list columns, controls, development blueprint |
| [../docs/CUSTOMER_PROPOSAL.md](../docs/CUSTOMER_PROPOSAL.md) | Revised commercial scope, integrations, testing, 1,000+ user load target, exclusions |
| [../docs/IBMV-Learning-Platform-Customer-Proposal.pdf](../docs/IBMV-Learning-Platform-Customer-Proposal.pdf) | Customer-facing revised proposal |
| [../docs/IBMV-LMS-Customer-Proposal-Updated-5-Lakhs.pdf](../docs/IBMV-LMS-Customer-Proposal-Updated-5-Lakhs.pdf) | Earlier proposal; reconcile with the revised version |

### Planning assumptions (confirmed)

- Scope is the **full proposal scope**. Features that were restricted, loading,
  legacy, "Coming Soon", inferred, or untested in the reference system are
  treated as **requirements to confirm in discovery**, not as known behavior.
- Delivery is **phase-wise with usable milestone releases**.
- Design is **research-led and original**: study multiple LMS products for
  patterns, then create an original IBMV identity. Do not copy another
  product's layouts, text, illustrations, or branding.
- The workspace has **no application source code or package manifest yet**, so
  repository/app bootstrap is part of the plan.
- Commercial allocation (revised proposal): public website ₹53,000; student
  portal ₹2,03,000; admin panel ₹2,44,000; shared backend/platform, QA/security/
  load testing, and migration/deployment/training/three-month support are
  "included at no additional charge". Zero line-item allocation does **not**
  remove those obligations from scope.

### Phase overview

| Phase | Name | Main outcome |
|---|---|---|
| 0 | Scope reconciliation and discovery | Approved scope, rules, roles, open-decisions register |
| 1 | LMS UX research and original design system | Approved design language, tokens, components, prototypes for all pages |
| 2 | Foundation and shared platform | Running app skeleton, auth, roles, API/data contracts, CI, security base |
| 3 | Public website and content publishing | Public site live in test environment |
| 4 | Student identity, account and portal shell | Secure learner account, settings, help |
| 5 | Course operations and learning experience | Course authoring, enrollment, sessions, player, progress |
| 6 | Commerce, memberships, entitlements | Razorpay payments, orders, memberships, referrals |
| 7 | Assessments, exams, results, certificates | Question banks, exams, grading, certificates |
| 8 | Engagement, communications, marketing, extended admin | Community, campaigns, analytics, settings |
| 9 | Quality, security, accessibility, scale validation | Test evidence, 1,000+ virtual-user report |
| 10 | Migration, UAT, launch, support | Production go-live and handover |

Phases 1 and 2 may overlap once design tokens and architecture are approved;
Phases 3 and 4 can run in parallel after Phase 2. Phase 9 runs continuously and
has a formal gate before Phase 10.

---

## Phase 0: Scope reconciliation and product discovery

**Goal:** remove ambiguity before design and build.

**Tasks**

1. Build a **traceability matrix**: every menu, page, field, control,
   integration, test, and launch deliverable from the three specs and the
   revised proposal mapped to a feature ID, owner phase, and acceptance
   criteria.
2. Reconcile the revised proposal with the earlier five-page proposal (scope,
   delivery plan, payment schedule, tax wording); record the approved version.
3. Tag every item: **Observed**, **Proposed**, **Unverified**, **Excluded**, or
   **Needs IBMV decision**.
4. Define personas and a **role/permission matrix**: learner, parent/guardian
   (if any), instructor/teacher, support, content editor, finance, marketing,
   administrator, super-admin.
5. Capture business rules (see the open questions in section 13).
6. Agree languages (English/Hindi and any others), content ownership,
   privacy/consent, retention, legal notices, donation and external-link
   behavior, and the responsive website/PWA expectation. Native apps are
   excluded by the proposal unless separately agreed.
7. Agree the data-migration source, formats, cleanup ownership, rehearsal, and
   rollback criteria.
8. Agree hosting ownership, supported browsers/devices, backup/restore
   expectations, monitoring, and the production-equivalent environment for the
   load test.
9. Write the load-test plan: virtual-user mix, data volume, test accounts,
   ramp, 30-minute sustained run, spike, thresholds (read API p95 <= 800 ms,
   agreed browser pages p95 <= 2.5 s, valid transaction error rate < 1%),
   exclusions (external providers, actual video-stream delivery), and retest
   criteria.

**Deliverables:** approved scope baseline, traceability matrix, open-decisions
register, role/permission matrix, user journeys, data inventory, non-functional
requirements, test strategy.

**Exit gate:** no feature with materially unresolved rules enters build without
a signed assumption or IBMV decision.

---

## Phase 1: LMS UX research and original design system

**Goal:** learn from the best existing LMS design patterns first, then create an
original, polished, accessible IBMV design language, applied to every page and
component before engineering starts.

### 1.1 Research (learn before designing)

Study public documentation, public demos, and publicly viewable product pages
of several LMS and learning products, for example:

| Product family | Learn from |
|---|---|
| Moodle, Canvas, Open edX | Course structure, module/lesson navigation, gradebook, enrollment, admin hierarchy, accessibility conventions |
| Coursera, edX, Udemy | Course discovery, course cards, detail pages, enrollment calls to action, progress and "continue learning" patterns |
| Teachable, Thinkific, Kajabi | Creator/admin dashboards, product setup, sales/marketing screens, branded learner experience |
| Google Classroom, Khan Academy | Simple student home, calendar/assignments, motivation and progress feedback |
| Unacademy/Vedantu-style learner apps | Live-class scheduling, mobile-first Indian learner experience, regional-language handling |
| The existing IBMV portals | Current vocabulary and workflows IBMV users already know |

Record for each: information architecture, navigation model, dashboard layout,
course card anatomy, lesson player layout, table/list patterns, forms/editors,
empty/loading/error states, mobile behavior, accessibility, and what **not** to
copy. Output a short "pattern library with trade-offs" document and a
comparison table.

### 1.2 Brand and visual direction

- Audit IBMV logo, existing imagery, and tone; propose a respectful,
  institution-appropriate look and feel for a spiritual/educational audience:
  calm, trustworthy, warm, readable, and uncluttered.
- **Color system:** primary brand color, secondary/accent, neutral scale,
  semantic colors (success, warning, error, info), surface/background layers,
  dark-mode option decision, and data-visualization palette. Verify WCAG AA
  contrast (4.5:1 text, 3:1 large text/UI components).
- **Typography:** font pairing with Devanagari + Latin support, a type scale,
  line-height and measure rules for long-form text, numerals in tables.
- **Spacing and layout:** 4/8-point spacing scale, responsive grid, containers,
  breakpoints (mobile, tablet, desktop, wide), density modes (comfortable /
  compact for admin tables).
- **Shape and depth:** radius, borders, elevation, focus rings.
- **Iconography and imagery:** one icon set, illustration/photo style, image
  aspect ratios, course thumbnail rules, placeholder and fallback imagery.
- **Motion:** small, purposeful transitions; respect reduced-motion preference.
- **Voice and microcopy:** labels, empty-state text, error text, confirmations,
  bilingual copy rules.

### 1.3 Component library (design tokens and states)

Define and design every state (default, hover, focus, active, disabled,
loading, error, success, empty) for:

- Navigation: public header and mega/dropdown menus, mobile drawer, student
  sidebar/drawer, admin left navigation, breadcrumbs, tabs, pagination.
- Course and content: course card, catalog grid/list, filter panel, search,
  status badges, price/enroll block, schedule block, FAQ accordion, teacher
  card, people card (team/advisory), testimonial and video cards, book card,
  magazine issue card.
- Learning: continue-learning card, progress bar/ring, lesson list, lesson
  player (video/PDF/live link), resume banner, certificate card.
- Data: tables (sort, select, columns, bulk actions, export), filters,
  segmented tabs, date range picker, KPI/stat cards, charts, calendar (day/
  week/month/list).
- Forms: inputs, selects, phone/country-code, address, date/time/timezone,
  file/asset upload, rich-text/HTML editor, toggle switches, multi-step forms,
  validation and inline help.
- Feedback: toast, banner, dialog/modal, drawer, confirmation for
  consequential actions, skeleton loaders, empty and error pages, offline state.
- Communication: announcement cards with priority, community feed, message
  composer, notification center.

### 1.4 Page designs (every page, every breakpoint)

Wireframe, then high-fidelity design, then clickable prototype:

- **Public (about 20 routes):** home, six catalog pages, course detail,
  books/bulk enquiry, e-magazines, four About pages, contact, sign up/log in,
  terms, privacy, 404/error/Coming Soon.
- **Student (13 menus):** home, my learning, course player, communities,
  announcements, calendar, exams (+ exam-taking), certificates, memberships,
  purchases (+ details), refer & earn, help, settings (profile/preferences).
- **Admin (9 sections, about 40 submenu pages):** dashboard, each product/
  learning/user/engage/marketing/sales/analytics/settings screen, plus the
  create/edit flows (events, batches, sessions, announcements, forms, modules,
  question banks, assets, assessments, certificates, learners, team, segments,
  enrollment, campaigns, blogs, banners, promo codes, testimonials).
- Design **emails, WhatsApp/SMS templates, certificates, invoices/receipts,
  and PDF exports** in the same system.

### 1.5 Accessibility and usability

- Keyboard-only flows, focus order, skip links, landmarks, ARIA patterns for
  menus/tabs/dialogs/calendars/tables, screen-reader names, reduced motion,
  text zoom/reflow, touch target size.
- Test prototypes with IBMV staff, at least a few learners (including older and
  mobile-first users), and one admin per role; record findings and revise.

**Deliverables:** pattern-research summary, brand/visual guidelines, design
tokens (color, type, spacing, radius, shadow, motion), component library,
prototypes for all pages and states, accessibility checklist, UX review sign-off.

**Exit gate:** IBMV approves the design; tokens and component specs are frozen
for build (changes via change control).

---

## Phase 2: Foundation and shared platform

**Goal:** a secure, observable, deployable skeleton on which every portal is
built.

**Tasks**

1. **Architecture decision record:** frontend framework and rendering strategy
   (public site needs SEO), backend/API style, database, search, cache, queue
   for jobs/notifications, file/media storage, hosting, and deployment.
   Confirm against team skills, IBMV hosting, scale (1,000+ concurrent), and
   budget. Record rationale and alternatives.
2. **Repository and tooling:** monorepo or multi-repo structure for public
   site, student portal, admin panel, API, and shared UI package; formatting,
   linting, type checking, commit/branch workflow, code review rules.
3. **Environments:** development, preview per branch, staging
   (production-equivalent for load tests), production; secrets management.
4. **CI/CD:** build, unit/component tests, integration tests, security/
   dependency scans, preview deploys, controlled releases with rollback.
5. **Design-system package:** implement Phase 1 tokens and the base component
   library once, shared by all three portals, with documentation and
   accessibility tests (a component catalog/Storybook-style page).
6. **Identity and access:** registration, login, email/phone verification,
   password reset, session lifecycle, optional MFA for staff, role-based
   access control, **server-side ownership checks** for all private learner
   data, audit logging.
7. **Core data model and API contracts:** users, roles, organizations/branches,
   courses, modules, lessons, assets, batches, sessions, enrollments, progress,
   products, orders, payments, memberships, coupons, referrals, assessments,
   questions, submissions, certificates, announcements, communities,
   campaigns, notifications, leads, blogs, banners, testimonials, settings.
   Use migrations, validation, pagination/filter conventions, error format,
   idempotency for payments.
8. **Platform services:** file upload/storage with access control, signed
   URLs for protected media, background jobs, email service, timezone/i18n
   utilities, search indexing, caching, rate limiting.
9. **Operations:** structured logging, error tracking, health checks,
   metrics/dashboards, alerts, automated backups, restore rehearsal.
10. **Security baseline:** OWASP-aligned input validation, output encoding,
    CSRF/session protection, secure headers, secrets handling, least
    privilege, dependency policy.

**Deliverables:** running dev/staging environments, CI pipeline, shared design
system, authentication and roles, API/data contracts, observability, backups.

**Exit gate:** authenticated role-aware shells for all three portals deploy
through CI; authorization tests pass; backup/restore verified.

---

## Phase 3: Public website and content publishing

**Goal:** the complete public website, driven by managed content.

**Tasks**

1. **Shared shell:** utility bar (email, phone, social, Donate), main
   navigation with Courses/Publications/About dropdowns, Sign Up/Log In,
   footer (useful links, terms, privacy, social, app link), responsive mobile
   menu, SEO metadata, sitemap, Open Graph, structured data for courses.
2. **Homepage:** hero with CTAs (Explore Courses, Download Our App, Join Our
   Community), participation metric, six course-category bands, testimonials
   and videos.
3. **Catalogs:** the six routes (`/bhagavata-mahavidyalaya`, `/self-study`,
   `/ancient-wisdom`, `/kids-parents`, `/level-wise`, `/live-classes`) with
   search, categories/teachers filters, language selection, status groups
   (upcoming/ongoing/coming soon), pagination or load-more, consistent card
   metadata, and no-results/loading/error states.
4. **Course detail:** title, teacher, price, certificate/type indicator,
   Enroll Now, key facts, schedule (start date, range, time/timezone, days,
   detailed schedule), teacher, overview, eligibility, materials, audience,
   assessment, requirements, FAQs, external resource links.
5. **Publications:** books grouped by language with format and retailer links,
   bulk-enquiry form (first/last name, address, pincode, city, book, quantity,
   email, country code, mobile) with validation, spam protection, and safe
   handling; e-magazine archive with IBMV-approved fields.
6. **Institutional pages:** About Mahavidyalaya, Srila Prabhupada, Advisory
   Board, Our Team (reusable people model), Contact with address, email,
   phone, and map; configurable contact details.
7. **External actions:** Donate, app download, community, retailers, social,
   and Enroll Now handoff behave explicitly and accessibly; never imply a
   payment or enrollment completed before it is confirmed.
8. **Content admin (feeds the admin phases):** manage courses/catalog
   visibility, books, magazines, people, testimonials, banners, blogs,
   contact settings, legal pages.
9. **Quality:** Core Web Vitals, image optimization, caching/CDN, cookie/
   analytics consent as decided, accessibility audit, browser/device matrix.

**Exit gate:** public-site release approved by IBMV against page acceptance
criteria, with content and external destinations signed off.

---

## Phase 4: Student identity, account, and portal shell

**Goal:** a secure, polished learner account area.

**Tasks**

1. Sign up, log in, verification, recovery, session expiry, sign out.
2. Student shell: header (Courses, Contact Us, Subscription, Communities,
   Search, Profile), responsive drawer navigation, back controls, route
   protection.
3. **Home** dashboard: featured-course carousel, Today's Classes,
   Continue Learning with progress and lesson counts (loading/empty/error
   states distinguished).
4. **Settings:** profile (personal, parent, education, contact, address,
   student source) with edit/validation; preferences (timezone with auto-set,
   session reminders at one day/one hour/start, promotional campaigns and
   WhatsApp/Email/SMS/Push channels).
5. **Help:** support message, contact options, submission feedback, and
   request status tracking (requires IBMV decision).
6. Privacy enforcement for profile, purchases, referrals, enrollments,
   progress, certificates, and support messages.

**Exit gate:** a learner can securely manage their account; authorization
tests prove no cross-learner access.

---

## Phase 5: Course operations and learning experience

**Goal:** from authoring to learning: admins create and run courses; students
learn and track progress.

**Admin tasks**

- Courses/products, **Module Library**, **Asset Library** (types: video,
  audio, PDF, YouTube, image, doc, sheet, slide, text/HTML, zip, SCORM zip,
  link/embed, epub as approved) with usage and storage summaries.
- **Users:** learners (tabs, filters, configurable columns, export), team,
  segments, **New Enrolment** (single, bulk, registration, advanced bulk with
  validation and clear outcomes).
- **Batches** (status/course/module/instructor filters, manager, progress),
  **Sessions** (calendar list/day/week/month, create session, attendance/
  sign-in, holidays, cancellations), **Session Recordings**.
- **Announcements** (urgency, tags, scheduling), admin **Dashboard** (weekly
  metrics, daily active users, signups vs enrollments/sales, today's
  sessions).

**Student tasks**

- **My Learning:** stream filter, Active/Completed tabs, course cards.
- **Course player:** lessons (video/PDF per agreed types), lesson navigation,
  progress/resume, live-class links, protected media, server-side completion
  (opening a lesson does not complete it).
- **Announcements** (search, unread filter, priority), **Calendar**
  (day/week/month, Today, timezone-aware), access enforced by enrollment or
  membership.

**Quality:** audit history for consequential admin actions, safe import
validation, role checks on every action.

**Exit gate:** end-to-end publish, enroll, schedule, learn, track-progress
scenarios accepted with synthetic data.

---

## Phase 6: Commerce, memberships, and entitlements

**Tasks**

1. Pricing/product configuration (free, paid, international/selling rules,
   miscellaneous fees), cart/checkout, orders, purchase history and details,
   receipts/invoices (tax format to be confirmed).
2. **Razorpay:** sandbox then live; server-side verification of payment
   signatures; idempotent webhook processing; duplicate-payment protection;
   pending/failed/refunded states; reconciliation; never trust client return
   URLs.
3. Coupons/promo codes with validity, eligibility, and usage limits; abandoned
   cart tracking and reports.
4. **Memberships:** plans, benefits, entitlements, expiry/renewal, student
   Memberships page.
5. **Refer & Earn:** referral code, share, rewards/credits, transactions, terms
   (rules to be approved).
6. **Cheque Management** after IBMV approves fields, authorization, and
   reconciliation workflow.
7. Admin Sales: abandoned cart (summary cards, tabs, filters, export),
   payments, GST/tax reporting as decided, Utility Wallet/billing view.

**Exit gate:** payment success/failure/pending/duplicate/refund tests pass with
sandbox evidence; entitlement and finance reconciliation accepted.

---

## Phase 7: Assessments, exams, results, and certificates

**Tasks**

1. **Question Bank** (ID, name, difficulty, exam, subject, topic), **Assessments**
   (assignment-based and custom-link, price, attempts, registrations),
   **Submissions** review (Not Evaluated/Evaluated/All, marks, percentage,
   timeliness, product, batch), grading system settings.
2. **Student Exams:** upcoming/past, eligibility, attempt windows, timers,
   submission integrity, results visibility, retakes (rules to confirm).
3. **Feedback Forms:** builder, types, conversions, submissions.
4. **Certificates:** admin templates and issuance rules, student certificate
   cards (issued/expiry, download, share), verification page.

**Exit gate:** approved exam and certificate scenarios pass for learner,
instructor, and admin.

---

## Phase 8: Engagement, communications, marketing, and extended admin

**Tasks**

1. **Community and discussions:** spaces, members, messages, replies, pins,
   moderation, reporting, privacy; student Communities page.
2. **Communications:** system notifications, campaigns (type, channel, status,
   schedule, sent count), templates, workflows/automation (once triggers and
   permissions are agreed), provider delivery logs, consent and opt-out.
   Email, WhatsApp Business, SMS, and push use IBMV-owned provider accounts.
3. **Marketing content:** blogs, banners, testimonials, leads/enquiries,
   promotional templates, promo codes.
4. **Products:** events, mentorships, eBooks, test series, playlists (several
   were Coming Soon or unverified in the reference; implement per agreed
   requirements).
5. **Analytics:** sales and enrollment, batch and progress, feedback and
   rating, marketing, trainer, notification logs, community, advanced;
   defined filters, date ranges, and role-restricted exports.
6. **Settings:** profile and organization/sub-organizations, system
   notifications, categories, custom fields, grading system, miscellaneous
   fees, international selling, learner experience, billing.
7. **Admin shell features:** global search (Ctrl+K), New quick-create menu,
   notification center, reusable list pattern (filters, tabs, columns, export,
   pagination, row actions), unsaved-change protection, audit view.

**Exit gate:** every in-scope menu route is functional or documented as an
IBMV-approved exclusion; roles and exports accepted.

---

## Phase 9: Quality, security, accessibility, and scale validation

Runs continuously from Phase 2; formal gate before launch.

**Tasks**

- **Functional:** unit and component tests for critical logic; API/integration
  tests (including Razorpay webhooks and messaging/media providers in sandbox);
  end-to-end tests for registration, login, enrollment, course access/
  progress, payment confirmation, exam submission, certificate access, and
  admin workflows; regression on supported desktop/mobile browsers.
- **UI/UX polish pass:** every page and component compared against approved
  designs: spacing, alignment, typography, color/contrast, icon consistency,
  responsive behavior, states, copy; screenshot/visual regression tests.
- **Accessibility:** automated and manual checks (keyboard, screen reader,
  contrast, zoom, reduced motion) across all portals.
- **Security:** authentication, authorization/ownership, input validation,
  file access, payment verification, secrets, dependency risks, rate limiting,
  audit; remediate and retest.
- **Performance and load:** 1,000+ concurrent virtual users on a
  production-equivalent environment using synthetic data and an agreed mix of
  public, student, and admin traffic; controlled ramp, 30-minute sustained
  run, spike run; report throughput, latency percentiles, error rate, resource
  usage, bottlenecks, recommendations; one remediation and retest cycle.
  Actual simultaneous video-stream capacity is the media provider's scope.
- **Operations:** backup/restore, monitoring/alerts, failure and recovery
  tests, production-readiness checklist.

**Exit gate:** signed test report; no unresolved release-blocking security,
data-integrity, accessibility, or performance defect.

---

## Phase 10: Data migration, acceptance, launch, and support

**Tasks**

1. Map and validate IBMV-provided source data; rehearse migration; review
   exceptions; reconcile counts and samples; approve; prepare rollback.
   Decide account migration vs reset and student communication.
2. User acceptance testing with IBMV staff per role; staff training and
   operating runbooks; content final sign-off.
3. Production readiness review; cutover plan; deploy; verify monitoring,
   auth, payments, backups, key journeys, provider connections; DNS/redirects
   and SEO preservation for existing public URLs.
4. Handover: documentation, credentials/ownership transfer, support process.
5. Three months of in-scope bug-fix support from go-live (excludes new
   features, provider outages, hosting upgrades, third-party changes).

**Exit gate:** IBMV production acceptance, migration reconciliation, trained
operators, handover pack.

---

## 12. Cross-phase governance

- Keep the requirements traceability matrix current; link each requirement to
  design, build, tests, and acceptance evidence.
- Demo each milestone in staging and obtain IBMV sign-off before dependent
  scope proceeds; use change control for scope, schedule, or commercial changes.
- Review mobile, tablet, and desktop plus accessibility on every portal and
  shared component, not only on the public home page.
- Treat payment, learner, community, message, and referral data as sensitive;
  use synthetic data outside production; limit exposure by role.
- Maintain a risk register: unverified features, third-party approvals (Razorpay,
  WhatsApp Business, SMS), data readiness, hosting capacity, content delays.
- Proposal exclusions to keep visible: hosting/cloud/CDN/domain/email,
  video hosting and egress, WhatsApp/SMS/push fees, payment transaction fees,
  native mobile apps, data cleanup beyond the agreed import format,
  new features, and maintenance after the bug-fix period.

---

## 13. Items missing or needing IBMV decisions

These are gaps found by comparing the specifications with the proposal.

**Scope and governance**
1. Which proposal version is authoritative, and who signs off requirements?
2. Tax treatment and invoice format (revised proposal says it must be
   confirmed; the earlier draft said no GST).
3. Whether Mentorships, eBooks, Test Series, Playlists, Workflows, Leads,
   Promotional Templates, Promo Codes, Testimonials, Cheque Management, and
   Discussions (several unverified, restricted, Coming Soon, or legacy in the
   reference) are in or out and what they must do.

**Architecture and operations**
4. Preferred technology stack, hosting/cloud ownership, scale budget, domains
   and subdomains, monitoring responsibility.
5. Uptime target, recovery objectives, backup retention, peak workload and
   geography, supported browsers/devices.
6. Video/media provider and protection (signed URLs, DRM or not), live-class
   provider (Zoom/Meet/other), downloads and offline behavior.

**Users and access**
7. Complete staff roles and permission matrix, including access to personal,
   payment, assessment, community, and export data.
8. Registration, verification (email/mobile OTP), recovery, parent/guardian
   handling, instructor onboarding, session and device policy.

**Commerce**
9. Pricing, free/paid rules, enrollment and expiry, refunds/cancellation,
   coupons, memberships, referral rewards, international selling, and payment
   reconciliation.

**Learning and assessment**
10. Lesson types, completion rules, resume, attendance rules, live-class
    recording access.
11. Exam integrity, timers, attempts/retakes, evaluation, grade publication,
    result visibility, certificate eligibility, expiry, and verification.

**Community and communication**
12. Community moderation, reporting, retention, consent, notification templates,
    channel opt-out, quiet hours, and the approved message templates for
    WhatsApp (provider approval required).

**Content and design**
13. Brand assets, logo files, color/font preferences, imagery, tone, languages
    and translation ownership, e-magazine feed, testimonial/video metadata,
    contact form requirements, external CTA destinations, donation scope.
14. Appetite for dark mode, regional-language UI, and PWA install behavior.

**Compliance and migration**
15. Privacy notice, consent, data retention/deletion/export, accessibility
    requirements, cookie and analytics consent, audit retention.
16. Migration sources, formats, ownership of cleanup, handling of historical
    progress, payments, and certificates, and acceptance reconciliation.

**Support**
17. Definition and channels for the three-month bug-fix support, response
    expectations, and what is excluded as new work.

---

## 14. Notes

- The three specifications are observation-based references, not source code
  or API documentation. Restricted, loading, legacy, empty, or Coming Soon
  states must be confirmed with IBMV before they become requirements.
- The 1,000+ virtual-user target is an engineering target on agreed
  production-equivalent infrastructure; it is not a guarantee of 1,000
  simultaneous video streams or capacity on unspecified hosting.
- The LMS pattern research in Phase 1 should use official documentation and
  publicly accessible product pages, and should produce original designs.
