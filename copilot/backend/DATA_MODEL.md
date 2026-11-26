# Data Model (MySQL via Prisma)

Conceptual model grouped by build phase. It is the starting point for
`prisma/schema.prisma`, not the final normalized schema: confirm names and
constraints while writing each migration. Parent: [MASTER_PLAN.md](./MASTER_PLAN.md).

## Conventions

- `id String @id @default(cuid())`; `createdAt`, `updatedAt` on every model.
- Soft state via `status` enums or `archivedAt`/`deletedAt` where history matters.
- Money: `amountMinor Int` + `currency String @default("INR")`.
- Timestamps in UTC; user-facing timezone from `LearnerProfile.timezone` / `StaffProfile.timezone`.
- Unique human codes generated in a transaction (`registrationNo`, `orderNo`, `certificateSerial`).
- `@@index` on every foreign key and every list filter/sort column used by admin lists.
- Enums as Prisma `enum`; free-form settings as `Json`.
- Public slugs unique per table (`Course.slug`, `Blog.slug`).
- Deleting a referenced record is blocked (`onDelete: Restrict`); use archive.

---

## B1: Identity, access, audit

| Model | Key fields | Notes |
|---|---|---|
| `User` | email (unique), phone?, passwordHash?, kind (`STAFF`/`LEARNER`), role (`SUPER_ADMIN`/`ADMIN`/`INSTRUCTOR`/`CONTENT_EDITOR`/`FINANCE`/`SUPPORT`/`LEARNER`), status (`ACTIVE`/`BLOCKED`/`ARCHIVED`), emailVerifiedAt?, lastLoginAt? | One identity table for staff and learners |
| `Account` / `VerificationToken` | Auth.js adapter tables | Only if OAuth is enabled |
| `PasswordResetToken` | userId, tokenHash, expiresAt, usedAt? | Single use |
| `LoginAttempt` | email/ip hash, success, createdAt | Lockout and abuse review |
| `Branch` | name, city?, managerId?, status | Sub-Organizations page |
| `StaffProfile` | userId (1:1), displayName, branchId?, timezone, dob?, gender?, altMobile?, address fields, notificationPrefs Json | My Profile and Team |
| `UserBranch` | userId, branchId | Staff branch scope (many-to-many) |
| `AuditEvent` | actorId?, action, entity, entityId, before Json?, after Json?, ip?, createdAt | Append-only. Read by Settings > Audit Log (Super Admin) |

## B2: Catalog and public content

| Model | Key fields | Notes |
|---|---|---|
| `Category` | name, slug, parentId?, sortOrder, status, kind (`COURSE`/`BLOG`/`PRODUCT`) | Hierarchical; drives the six website collections |
| `Course` | slug (unique), title, summary, description (markdown), categoryId, language, level?, mode (`SELF_PACED`/`LIVE`/`BOARD`/`HYBRID`), instructorName / instructorId?, durationLabel?, sessionCount?, sessionsPerWeek?, priceMinor, currency, isFree, certificateOffered, imageAssetId?, officialUrl?, enrollmentUrl?, eligibility, materials, audience, assessmentPlan, requirements, status (`DRAFT`/`PUBLISHED`/`ARCHIVED`), catalogVisibility, comingSoon, sortOrder, publishedAt? | Seeded from `official-courses.json` (127). Public detail page maps to this |
| `CourseSchedule` | courseId, startDate?, endDate?, daysOfWeek, startTime, timezone, detailed Json | "View detailed schedule" |
| `CourseFaq` | courseId, question, answer, sortOrder | |
| `Instructor` | name, bio?, imageAssetId?, userId? | Teacher filter and detail page |
| `Module` | name (unique), description?, status (`DRAFT`/`PUBLISHED`/`ARCHIVED`) | Module Library (B4b); learners see only published modules |
| `ModuleContent` | moduleId, type (`TEXT`/`VIDEO`/`LINK`/`FILE`), title, minutes?, body? (Markdown), url? (https; YouTube for video), assetId? (`FILE`), sortOrder | Lessons shown by the student player; quizzes arrive with assessments |
| `CourseModule` | courseId, moduleId, sortOrder | Course structure; a module in use cannot be deleted |
| `Asset` | type (13 admin types), name, description?, status (`STAGED`/`READY`), fileName?, storageKey?, mimeType?, sizeBytes?, sha256?, url? (YouTube/link), downloads, uploadedById? | B2b Asset Library. Images are public; other files need staff or a lesson that uses them. Equal content shares one `storageKey`; a lesson in use blocks deletion (`Restrict`); `STAGED` uploads are purged after a day |
| `Event` | name, description (Markdown), imageAssetId? (Restrict), status (`DRAFT`/`ACTIVE`/`INACTIVE`), visibility (`PUBLIC`/`PRIVATE`/`UNLISTED`), platform (`IN_PERSON`/`ZOOM`/`YOUTUBE_LIVE`/`OTHER_ONLINE`/`HYBRID`), venue?, meetingLink? (https), guestsAllowed, managerId? (staff, `SetNull`), category, membershipEligibility, isPaid, priceMinor? + currency? (minor units), capacity?, pricingNotes?, startsAt/endsAt (first day's start, last day's end, for sorting) | B2b Events. Venue only for in-person/hybrid, link only for online/hybrid; an active event cannot be deleted; feedback forms and ticket sales arrive later |
| `EventDay` | eventId (cascade), startsAt, endsAt, sortOrder | Up to 30 days, stored as instants, entered in IST; in order and without overlap |
| `Blog` | slug (unique, `/website/blogs/<slug>`), title, summary?, body (Markdown, `MEDIUMTEXT`), coverAssetId? (Restrict), authorId? (staff, `SetNull`), status (`DRAFT`/`PUBLISHED`/`HIDDEN`), views, publishedAt? | B2b Blogs. Only `PUBLISHED` is public; `publishedAt` is set the first time and kept; `views` is raised by a raw update so `updatedAt` changes only when an editor saves; a published article cannot be deleted |
| `Banner` | name, description? (400), imageAssetId (Restrict), linkUrl? (https or a path on this site), placement (`WEBSITE_HOME`/`STUDENT_HOME`), status (`DRAFT`/`PUBLISHED`/`ARCHIVED`), sortOrder, startsOn?/endsOn? (IST calendar days, inclusive) | B2b Marketing Banners. Shows while published, inside its days and with a ready image; the image stays in the Asset Library if the banner is deleted |
| `Testimonial` | name, city?, courseId?, format (`TEXT`/`VIDEO`), quote, videoUrl?, rating?, status, sortOrder | Website + admin |
| `Video` | title, youtubeId, thumbnailAssetId?, sortOrder, status | Website videos strip |
| `Person` | name, roleTitle, bio?, imageAssetId?, group (`ADVISORY`/`TEAM`), sortOrder, status | Our Team / Advisory Board |
| `Book` | title, language, publisher?, coverAssetId?, status, sortOrder | |
| `BookLink` | bookId, format (`PRINT`/`DIGITAL`), retailer, url | |
| `Magazine` | title, issueNo?, issueDate?, language, coverAssetId?, fileAssetId?/url, status | Pending content approval |
| `Lead` | name, email, phone?, city?, source (`CONTACT_FORM`/`BULK_BOOK`/`CAMPAIGN`/`EVENT`), interest?, message?, stage (`NEW`/`CONTACTED`/`CONVERTED`/`CLOSED`), consent, assignedToId?, createdAt | Receives website forms |
| `BulkBookEnquiry` | leadId, bookId, quantity, address, city, pincode, country code | Extends `Lead` |
| `SiteSetting` | key (unique), value Json | Contact info, social links, hero metrics, legal pages (versioned text) |
| `LegalDocument` | type (`TERMS`/`PRIVACY`), version, body, publishedAt | Approved text only |
| `ContentPage` | slug (unique), title, body (markdown), status, updatedById | About IBMV, Srila Prabhupada and other long-form institutional pages |

## B3: Learners and preferences

**Implemented** in migration `learner_profile_support`: `LearnerProfile` fields and `LearnerStatus` (only Registered, On leave and Archived are stored; Enrolled and Completed are derived in B4), `NotificationPreference` (keyed by the learner's user id), `SupportRequest`, `SupportReply`, and `Counter` (registration numbers). `CustomField`, `CustomFieldValue`, `Segment` and `SegmentMember` are in the schema, but their screens are B3b. `LearnerExperienceConfig` will be a `SiteSetting` row (key `learnerExperience`) rather than a table.

| Model | Key fields | Notes |
|---|---|---|
| `LearnerProfile` | userId (1:1), registrationNo (unique), name, username, dob?, gender?, parentName?, parentEmail?, parentPhone?, standard?, mobile?, altMobile?, address fields, studentSource?, timezone, timezoneAuto, status (`REGISTERED`/`ENROLLED`/`COMPLETED`/`ON_LEAVE`/`ARCHIVED`), branchId? | Student Settings > Profile |
| `NotificationPreference` | learnerId, sessionReminder1Day, sessionReminder1Hour, sessionReminderStart, promotional, channels (`WHATSAPP`/`EMAIL`/`SMS`/`PUSH` booleans or rows), updatedAt | Student Preferences; consent source of truth |
| `CustomField` | entity (`LEARNER`/`INSTRUCTOR`/`COURSE`/`BATCH`/`CERTIFICATE`/`QUESTION`/`ANNOUNCEMENT`/`ENQUIRY`), label, type, options Json?, required, placement (`PROFILE`/`SIGNUP`/`OFFLINE_ADMISSION`), sortOrder, status | Admin Custom Fields |
| `CustomFieldValue` | fieldId, entityId, value | |
| `Segment` | name, type (`STATIC`/`DYNAMIC`), rules Json?, createdById | |
| `SegmentMember` | segmentId, learnerId | Static members; dynamic computed |
| `SupportRequest` | learnerId?, name, email, message, status (`OPEN`/`IN_PROGRESS`/`RESOLVED`), assignedToId?, createdAt | Student Help target (admin inbox is a gap) |
| `SupportReply` | requestId, authorId, body | |
| `LearnerExperienceConfig` | key, value Json | Learner menu order/visibility, custom links |

## B4: Learning operations

**Implemented** in migration `learning_operations`: `Batch`, `BatchManager`, `Enrolment` (spelled with an "l" in the schema), `Session`, `Attendance`, `Holiday`, `Announcement`, `AnnouncementBatch` and `AnnouncementRead`. Decisions worth knowing:

- Sessions are stored as UTC instants and entered and shown as IST wall-clock (a fixed +05:30; India has no daylight saving). `src/lib/ist.ts` converts both ways.
- A learner has at most one `ACTIVE` enrolment per course (enforced in `enrolByEmail`, not by an index). `Enrolment.batchId` is optional and is set to null if its batch is ever removed.
- The app writes a session as `SCHEDULED` or `CANCELLED`; "Completed" is derived once its end time has passed (the `COMPLETED` value exists for later use). A holiday cancels the scheduled sessions of the affected branch (or every branch) on that day.
- `Announcement.audience` is `ALL` or `BATCH` (rows in `AnnouncementBatch`); segments arrive with B3b. `tags` is a JSON array limited to an allow-list. A learner sees a notice when it is `PUBLISHED`, its `publishAt` has passed, and the audience matches an active or completed enrolment.
- Learner status is derived: Registered (no active enrolment), Enrolled (at least one), Completed (only completed ones). Only On leave and Archived are stored, as `LearnerProfile.status`.
- Not yet built: `BatchModule`, `JobQueue`.

**B4b, session recordings** (migration `session_recordings`): `Recording` and `RecordingStatus` (`PROCESSING`/`AVAILABLE`/`FAILED`).

- A recording is an external `https://` link attached to a session (up to ten per session); uploads wait for the Asset Library. Learners see only `AVAILABLE` recordings of non-cancelled sessions of their own batches. Deleting is a hard delete (audited as `recording.delete`); deleting a session or batch removes its recordings.
- Branch-scoped staff reach the recordings of their branches' batches and of batches with no branch.

**B4b, course content** (migration `course_content`): `Module`, `ModuleContent`, `CourseModule` and `LessonProgress`.

- A course lists its modules in order (`CourseModule`); every batch and learner of that course uses them. Choosing modules per batch (`BatchModule`) is not built.
- Editing a module keeps each lesson's id (the form carries it), so learners' completions survive reordering and renaming. A lesson left out of the edit is deleted with its progress.
- A learner completes lessons explicitly; opening a lesson never completes it. Progress is `floor(100 x done / total)` over the lessons of the course's published modules, 100 only when every lesson is done. Reaching 100 sets an active enrolment to `COMPLETED`; a completed enrolment stays completed if lessons are added later, and its stored percentage is corrected the next time the learner opens the course.
- Access to content follows the enrolment: `ACTIVE` or `COMPLETED`, inside any access dates (the last access day counts). `LessonProgress` is keyed by enrolment and lesson.

| Model | Key fields | Notes |
|---|---|---|
| `Batch` | name (unique), courseId, startDate, endDate, instructorId, managerId, status (`ACTIVE`/`COMPLETED`/`ARCHIVED`), branchId? | `communityId?` arrives with B7 |
| `BatchManager` | batchId, userId | Additional managers; the primary one is `Batch.managerId` |
| `BatchModule` | batchId, moduleId, sortOrder, instructorId? | "Module & instructor" column (B4b) |
| `Enrolment` | userId, courseId, batchId?, source (`ADMIN`/`SELF`/`ORDER`/`MEMBERSHIP`/`BULK`), status (`ACTIVE`/`COMPLETED`/`CANCELLED`/`EXPIRED`), enrolledAt, accessStartsAt?, accessEndsAt?, progressPercent, createdById? | Authorizes learner access; `orderId` arrives with B5 |
| `Session` | batchId, title, startsAt, endsAt, timezone, joinUrl?, status (`SCHEDULED`/`CANCELLED`/`COMPLETED`), topics, instructorId?, cancelReason? | Has many `Recording` |
| `Attendance` | sessionId, userId, status (`PRESENT`/`ABSENT`), signedInAt?, markedById? | One row per learner and session |
| `Holiday` | date, branchId?, reason, createdById? | "Mark as Holiday"; no branch means every branch |
| `Recording` | sessionId, title?, url, status (`PROCESSING`/`AVAILABLE`/`FAILED`), createdById? | B4b; `assetId?` arrives with the Asset Library |
| `Announcement` | title, body, urgency (`HIGH`/`MEDIUM`/`LOW`), tags Json?, audience (`ALL`/`BATCH`), publishAt, createdById?, status | |
| `AnnouncementBatch` | announcementId, batchId | The batches a `BATCH` notice is for |
| `AnnouncementRead` | announcementId, userId, readAt | Unread toggle |
| `LessonProgress` | enrolmentId, contentId, completedAt | One row per completed lesson and enrolment (B4b) |
| `LearnerNote` | (optional later) | Not in current UI |
| `JobQueue` | type, payload Json, runAt, status, attempts, lastError | Reminders, campaigns, certificate PDFs (B4b/B7) |

## B5: Commerce

| Model | Key fields | Notes |
|---|---|---|
| `Product` | type (`COURSE`/`EVENT`/`MEMBERSHIP`/`ASSESSMENT`/`BOOK`), refId, name, priceMinor, currency, status | Sellable abstraction |
| `PriceRule` / `ProductPrice` | productId, currency, amountMinor, branch availability | International Selling |
| `Cart` / `CartItem` | learnerId?, email?, status (`OPEN`/`ABANDONED`/`COMPLETED`), valueMinor, abandonedAt? | Abandoned Cart report |
| `Order` | orderNo (unique), learnerId, status (`CREATED`/`PENDING`/`PAID`/`FAILED`/`REFUNDED`/`PARTIALLY_REFUNDED`/`CANCELLED`), subtotalMinor, discountMinor, taxMinor, feesMinor, totalMinor, currency, promoCodeId?, idempotencyKey, createdAt | |
| `OrderItem` | orderId, productId, quantity, unitMinor, taxMinor | |
| `Payment` | orderId, provider, providerOrderId (unique), providerPaymentId? (unique), status, method?, amountMinor, rawEventRef?, verifiedAt? | Only webhook-verified state marks paid |
| `PaymentEvent` | provider, eventId (unique), type, payload Json, processedAt | Idempotent webhook log |
| `Refund` | paymentId, amountMinor, reason, status, createdById | |
| `Invoice` | orderId, invoiceNo, taxBreakup Json, issuedAt | Tax format pending D6 |
| `PromoCode` | code (unique), kind (`SINGLE_USE`/`MULTI_USE`), discountType (`PERCENT`/`FIXED`), value, minSpendMinor?, capMinor?, appliesTo Json, startsAt, expiresAt, visibleOnWebsite, visibleInApp, systemLimit?, perUserLimit?, status | |
| `PromoRedemption` | promoCodeId, orderId, learnerId | Enforces limits transactionally |
| `MiscFee` | name, description, amountMinor, appliesTo, status | |
| `CurrencyConfig` | baseCurrency, fallbackCurrency, method, adjustment, precision, branch availability Json | |
| `MembershipPlan` | name, description, priceMinor, interval, benefits Json, status | New admin screen |
| `Membership` | learnerId, planId, status, startsAt, endsAt, orderId? | Student Memberships |
| `ReferralCode` | learnerId (unique), code (unique) | Never exposed to others |
| `ReferralTransaction` | referrerId, refereeId?, orderId?, creditMinor, status, createdAt | Rewards rules pending |
| `CreditLedger` | learnerId, deltaMinor, reason, refId, balanceAfterMinor | Append-only |
| `Cheque` | learnerName, parentName?, bank, chequeNo, amountMinor, chequeDate, status (`RECEIVED`/`DEPOSITED`/`CLEARED`/`BOUNCED`), orderId?, remark | Fields pending approval |
| `ChequeStatusHistory` | chequeId, from, to, remark (required), changedById | |
| `WalletAccount` / `WalletTransaction` | balance; channel (`WHATSAPP`/`SMS`/`EMAIL`/`AI`), kind (`CREDIT`/`DEBIT`), amount, runningBalance, refId | Utility Wallet |

## B6: Assessments and credentials

| Model | Key fields | Notes |
|---|---|---|
| `QuestionBank` | code (unique, `QB-####`), name, difficulty, exam, subject, topic, description | |
| `Question` | bankId, type (`MCQ`/`MULTI`/`TEXT`/`FILE`), prompt, options Json, answer Json?, marks, explanation? | Question-level editing is unverified; confirm first |
| `Assessment` | name, kind (`ASSIGNMENT`/`CUSTOM_LINK`/`EXAM`), courseId(s), priceMinor, maxAttempts, opensAt?, closesAt?, durationMinutes?, totalMarks, passPercent, bankId?, link? | |
| `AssessmentCourse` | assessmentId, courseId | Linked courses |
| `AssessmentRegistration` | assessmentId, learnerId | |
| `Attempt` | assessmentId, learnerId, startedAt, submittedAt?, status, answers Json, autoScore?, durationSeconds? | Timer enforced server-side |
| `Submission` | attemptId/assessmentId, learnerId, fileAssetId?, text?, submittedAt, evaluationStatus (`NOT_EVALUATED`/`EVALUATED`), marks?, total, evaluatedById?, evaluatedAt?, feedback?, late | |
| `GradeBand` | name, minPercent, maxPercent, remark | Validated: whole numbers 0-100, no gaps/overlaps |
| `FeedbackForm` | name, type, courseId?, sessionName?, template, description, status | |
| `FeedbackQuestion` | formId, prompt, type (`RATING`/`TEXT`/`CHOICE`), required, options Json, sortOrder | |
| `FeedbackResponse` | formId, learnerId?, answers Json, submittedAt | |
| `CertificateTemplate` | name, serialPrefix, description, status, expiryRule, expiryDays?, expiryDate?, designSource, layout?, heading?, body, signatory?, templateAssetId?, customFields Json, automation (`MANUAL`/`COURSE_COMPLETION`/`EXAM_PASSED`), courseId?, examRef?, threshold, notifyConfig Json | |
| `Certificate` | templateId, learnerId, serial (unique), issuedAt, expiresAt?, status (`ACTIVE`/`REVOKED`/`EXPIRED`), fileAssetId?, verificationCode (unique) | Public verify page |

## B7: Engagement and communications

| Model | Key fields | Notes |
|---|---|---|
| `Community` | name (unique), description, layout (`MESSAGE`/`FEED`), order, batchId?, status | |
| `CommunityMember` | communityId, userId, role, status | |
| `CommunityPost` | communityId, authorId, parentId?, body, pinned, status (`VISIBLE`/`HIDDEN`/`REMOVED`) | Moderation |
| `CommunityReport` | postId, reporterId, reason, status | |
| `DiscussionThread` / `DiscussionReply` | courseId, authorId, body | Only if D8 approves |
| `MessageTemplate` | channel, name, subject?, body, replyTo?, unsubscribeText?, providerTemplateId?, approvalStatus, variables Json | Promotional Templates |
| `Campaign` | name, type, channel, templateId, segmentId, status, scheduledAt, createdById, sentCount | |
| `CampaignRecipient` | campaignId, learnerId, status | |
| `NotificationLog` | channel, recipient, templateId?, relatedType, relatedId, status (`QUEUED`/`SENT`/`DELIVERED`/`FAILED`/`OPTED_OUT`), providerMessageId?, error?, createdAt | Never store full message bodies with sensitive data |
| `SystemNotificationSetting` | family, event, channels Json, enabled | Nine event families |
| `Workflow` / `WorkflowRun` | trigger, conditions, actions Json, status | Only if D8 approves |
| `InAppNotification` | userId, kind, title, body?, href? (an on-site path), readAt?, createdAt | Notification centre. Added in B8 for the staff bell; the learner bell reuses it. Indexed by (userId, readAt, createdAt); rows older than 90 days are deleted when new ones are written |
| `PushSubscription` | userId, endpoint, keys, createdAt | Web push |

## B8: Analytics

Reports query transactional tables through `src/server/services/analytics`.
The first slice (2026-11-26) added no tables: each report reads the existing
ones (batches, enrolments, lesson progress, sessions and attendance, users,
leads, assets, branches), builds its rows in memory (at most 10,000 rows and
200,000 scanned records per report) and the engine then applies search, order
and paging. Reports that need a model that does not exist yet are listed as
*Waiting* in `src/lib/admin/reports.ts` with the phase that supplies it.
Add summary tables only if measured performance requires them:

| Model | Purpose |
|---|---|
| `DailyMetric` | Pre-aggregated per day/branch/course counters (enrolments, revenue, active users) |
| `UserActivity` | page/session/time-spent events for time-spent and daily active users |
| `ReportExport` | Export history (who, filters, row count) |

## Seed data mapping

| Seed source | Target tables |
|---|---|
| `src/lib/website/official-courses.json` | `Category`, `Course`, `Instructor` |
| `src/lib/website/content.ts` (books, collections), `community.ts` | `Book`, `Video`, `Testimonial`, `SiteSetting` |
| `src/lib/admin/demo-data.ts` (courses, instructors, people, batches) | `Batch`, `LearnerProfile`/`User`, `StaffProfile`, `Session` |
| `src/lib/admin/list-configs.ts` fixtures | Events, announcements, feedback forms, modules, banks, assets, assessments, submissions, campaigns, blogs, promo codes, etc. |
| `src/lib/student/demo.ts` | Demo learner, sample courses/lessons (`Module`/`ModuleContent`), sessions, announcements |

Demo seed must be clearly synthetic, idempotent, and disabled in production.
