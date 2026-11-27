# B9 Remaining Tasks

Date: 2026-11-27

## Purpose

This report lists the work still required to complete B9 hardening and launch.
It separates completed checks from tasks that need an external dependency or a
running environment.

## Task status

| Area | Status | Completed evidence | Remaining work |
|---|---|---|---|
| Security review | In progress | Three medium permission findings were identified and fixed for notification logs, wallets and templates. | Re-run authorization tests for every staff role and endpoint. Upgrade Next.js to a patched supported release. |
| Accessibility | Pending | Existing UI patterns include labels, focus states and semantic controls. | Run a route-level keyboard, screen-reader, contrast and mobile pass. Fix any modal, drawer, table or form violations. |
| Load testing | Pending | Migration and unit verification are available locally. | Start the app and database in a production-like environment, run 1,000 virtual users, collect p95/p99 latency and error evidence. |

## Security review

### Fixed findings

1. Notification log reads now require `notifications:read`.
2. Wallet reads now require `wallet:read`.
3. Promotional template reads now require `templates:read`.

### Next security tasks

- Upgrade Next.js from `16.4.3` to a patched supported release.
- Add integration tests proving each role is rejected from unauthorized reads.
- Run the authorization matrix for every `/api/admin/*` route.
- Review webhook signatures and idempotency before native payment providers are enabled.
- Confirm secrets exist only in ignored environment files.
- Run a dependency audit and document every production advisory.
- Add backup, restore and log-retention procedures.

## Accessibility

- Verify keyboard navigation for every portal.
- Verify visible focus and logical tab order.
- Verify modal/dialog names, description and focus return.
- Verify drawer close controls and Escape behavior.
- Verify form labels and server-validation error association.
- Verify table column names and sortable control labels.
- Verify mobile touch targets and horizontal table scrolling.
- Run automated axe or equivalent checks on:
  - public website
  - login and registration
  - student portal
  - admin portal
- Run manual screen-reader checks for critical flows.
- Document WCAG 2.2 AA outcomes and unresolved exceptions.

## Load testing

Use a dedicated staging database and separate test accounts. Do not run load
tests against production or a shared database.

### Required scenarios

- Homepage and public catalog pages.
- Authentication and role-based shell access.
- Learner course outline and lesson progress.
- Learner exam start, answer save and submit.
- Admin list/search/pagination endpoints.
- Asset downloads and public image requests.
- Report filtering and CSV export.
- Student and admin notification reads.

### Required evidence

- Virtual-user mix and ramp profile.
- Data volume and test account count.
- Sustained 30-minute run.
- Spike run.
- Read API p95 <= 800 ms.
- Browser page p95 <= 2.5 seconds.
- Valid transaction error rate < 1%.
- CPU, memory, database, connection pool and error logs.
- Retest after fixes.

## Definition of B9 completion

B9 is complete only when:

- All confirmed release-blocking security findings are fixed.
- The authorization matrix passes.
- Dependency advisories are reviewed and patched or accepted.
- Automated and manual accessibility checks pass, or exceptions are documented.
- Production-like backup/restore is rehearsed.
- Migration reconciliation and rollback rules are documented.
- Load-test thresholds are met and a report is signed.
- UAT is completed and launch/rollback owners are assigned.

## Cross-plan reconciliation

The following items remain open outside the direct B9 audit. They are included
here so B9 can serve as the single launch-readiness report.

### B5: Commerce

| Item | Status | Blocker / remaining work |
|---|---|---|
| Native course checkout | Partial | Free-course checkout exists. Paid checkout, Razorpay order creation and verified webhook entitlement are not complete. |
| Orders and payments admin screen | Todo | Database models exist, but list/detail/refund/manual-mark-paid screens and audit workflows are not implemented. |
| Promo codes | Todo | Replace the browser-local demo with database-backed validation and transactional redemption. |
| Abandoned cart | Todo | Capture and recover carts; no checkout or cart events exist yet. |
| Cheque management | Todo | Replace local status handling with database records, status history and clearing/refund rules. |
| Miscellaneous fees | Todo | Persist fee templates and apply them to server-computed order totals. |
| International selling | Todo | Persist branch/currency rules and fallback pricing. |
| Membership purchase and renewal | Partial | Plans and memberships are visible, but paid purchase, renewal and cancellation are not implemented. |
| Referral rewards | Partial | Code and ledger data exist, but reward rules, abuse checks and paid-order approval are not implemented. |
| Refunds and invoices | Partial | Tables exist, but provider refunds, invoice format, PDF generation and learner download rules remain pending D6. |

### B7: Engagement and communications

| Item | Status | Blocker / remaining work |
|---|---|---|
| Campaign sending | Todo | Implement scheduled/sending/sent/failed/cancelled states and campaign recipient batches. |
| Email provider | Pending setup | Zoho SMTP variables are available; install a supported SMTP library, add env validation and send tests. |
| WhatsApp Meta API | Pending details | Add Meta credentials, template names/languages, provider configuration and webhook receipt handling. |
| SMS | Deferred | Provider and approved templates must be selected later. |
| Push notifications | Deferred | Define VAPID or another supported provider and browser subscription lifecycle. |
| Notification logs | Partial | Database and read routes exist; real sender attempts and delivery-receipt updates are not complete. |
| Campaign opt-out | Todo | Enforce learner promotional consent, channel preference and quiet hours in the sender. |
| Wallet recharge | Todo | Add Razorpay recharge, running balance, transaction export and hard non-negative balance enforcement. |
| Conditional workflows | Not started | Implement only after D8 confirms triggers, conditions, delays and actions. |
| Discussions | D8-gated | Keep as a decision page unless merged with Community is approved. |

### B8: Analytics and remaining screens

| Item | Status | Remaining work |
|---|---|---|
| Sales Overview / Payments Received / GST | Waiting | Requires paid B5 order/payment/refund data and approved GST format. |
| Event enrollments | Waiting | Requires B5 ticket/registration records. |
| Batch Assessment / Assessment Attempts | Implemented core | Batch/attempt report runners exist; run against migrated integration database and validate branch/course filters. |
| Issued Certificates | Implemented core | Live report runner exists; validate period, template and status behavior in integration tests. |
| Feedback and rating analytics | Todo | Feedback response data exists; expose real form and rating reports. |
| Campaign Performance | Waiting | Requires real B7 campaign delivery, opens/clicks/conversions and delivery receipts. |
| Promo Code Usage | Waiting | Requires B5 redemption records and transactional promo enforcement. |
| Notification Logs analytics | Partial | Database log exists, but real delivery status and provider references are incomplete. |
| Community Analytics | Todo | Add live members, posts, replies, reports and active contributors. |
| Bandwidth Consumption | Todo | Add request/download log and byte counting. |
| Scheduled Tasks | Waiting | Requires a production job worker and queue state. |
| Wallet Recharges | Implemented core | Live wallet transaction runner exists; recharge order integration remains. |
| Mentorships/eBooks/Test Series/Playlists | D8-gated | Keep decision pages until IBMV confirms scope. |
| Advanced Analytics | D8-gated | Keep decision page until IBMV approves cross-module reports. |

### Website and student

| Item | Status | Remaining work |
|---|---|---|
| SEO, sitemap and caching | Todo | Add metadata, canonical URLs, sitemap/robots, revalidation and public route performance checks. |
| Student Communities | Partial | Learner join/post endpoints exist; moderation, replies/report queue and member restrictions need a full workflow. |
| Student notification centre | Todo | Add learner notification list, mark-read UI and consent-aware in-app delivery. |
| Student privacy and polish | Todo | Add data export/deletion request, active-session controls if approved, retention and privacy review. |
| Native enrolment handoff | Blocked | D9 is unresolved; currently preserve official-site handoff until native checkout is approved. |

### Shared platform and launch

| Item | Status | Remaining work |
|---|---|---|
| Bulk selection framework | Todo | Complete generic select-all and audited bulk actions across admin lists. |
| Test database migrations | Blocked | Separate test database credentials are not authorized for DDL; obtain dedicated migration credentials and run all integration suites. |
| Database integration suites | Blocked | Server suite currently cannot run fully until B5/B7/B8 migrations exist in `ibmv_lms_test`. |
| Next.js upgrade | Pending | Upgrade `16.4.3` to a supported patched release and rerun build/start. |
| Build verification | Pending | Rerun lint, typecheck, build, dev HTTP and production HTTP checks after the framework upgrade. |
| Dependency audit | Pending | Run production/development dependency audit and review unresolved advisories. |
| Secrets hygiene | Partial | Password must never be committed. Configure and validate environment variables without logging secrets. |
| Backup/restore | Todo | Rehearse production-equivalent backup, restore, migration reconciliation and rollback. |
| UAT | Todo | Obtain IBMV sign-off for commerce, communications, analytics, privacy and launch scope. |
| Load test | Todo | Run dedicated 1,000-VU staging load test and satisfy p95/p99 thresholds. |
