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
| `AuditEvent` | actorId?, action, entity, entityId, before Json?, after Json?, ip?, createdAt | Append-only |

## B2: Catalog and public content

| Model | Key fields | Notes |
|---|---|---|
| `Category` | name, slug, parentId?, sortOrder, status, kind (`COURSE`/`BLOG`/`PRODUCT`) | Hierarchical; drives the six website collections |
| `Course` | slug (unique), title, summary, description (markdown), categoryId, language, level?, mode (`SELF_PACED`/`LIVE`/`BOARD`/`HYBRID`), instructorName / instructorId?, durationLabel?, sessionCount?, sessionsPerWeek?, priceMinor, currency, isFree, certificateOffered, imageAssetId?, officialUrl?, enrollmentUrl?, eligibility, materials, audience, assessmentPlan, requirements, status (`DRAFT`/`PUBLISHED`/`ARCHIVED`), catalogVisibility, comingSoon, sortOrder, publishedAt? | Seeded from `official-courses.json` (127). Public detail page maps to this |
| `CourseSchedule` | courseId, startDate?, endDate?, daysOfWeek, startTime, timezone, detailed Json | "View detailed schedule" |
| `CourseFaq` | courseId, question, answer, sortOrder | |
| `Instructor` | name, bio?, imageAssetId?, userId? | Teacher filter and detail page |
| `Module` | title, description?, status | Module Library |
| `ModuleContent` | moduleId, assetId?, type (`LESSON`/`ASSET`/`QUIZ`), title, body?, sortOrder, minutes? | Lessons shown by the student player |
| `CourseModule` | courseId, moduleId, sortOrder | Course structure |
| `Asset` | name, fileName, type (13 admin types), storageKey?, externalUrl?, mimeType, sizeBytes, uploadedById, downloads, status | Asset Library; usage computed from references |
| `Event` | name, description (markdown), imageAssetId?, status, visibility, platform, venue?, meetingLink?, guestAccess, managerId, category, membershipEligibility, feedbackFormId?, pricing fields, capacity? | Admin Events |
| `EventDay` | eventId, startsAt, endsAt, sortOrder | Multi-day, non-overlapping |
| `Blog` | slug, title, body, authorId, status (`DRAFT`/`PUBLISHED`/`HIDDEN`), views, publishedAt? | |
| `Banner` | name, imageAssetId, linkUrl?, placement (`WEBSITE_HOME`/`STUDENT_HOME`), status, sortOrder, startsAt?, endsAt? | |
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
- Not yet built (B4b): `BatchModule`, `Recording`, `LessonProgress`, `JobQueue`. `Enrolment.progressPercent` stays 0 until lesson progress is recorded.

| Model | Key fields | Notes |
|---|---|---|
| `Batch` | name (unique), courseId, startDate, endDate, instructorId, managerId, status (`ACTIVE`/`COMPLETED`/`ARCHIVED`), branchId? | `communityId?` arrives with B7 |
| `BatchManager` | batchId, userId | Additional managers; the primary one is `Batch.managerId` |
| `BatchModule` | batchId, moduleId, sortOrder, instructorId? | "Module & instructor" column (B4b) |
| `Enrolment` | userId, courseId, batchId?, source (`ADMIN`/`SELF`/`ORDER`/`MEMBERSHIP`/`BULK`), status (`ACTIVE`/`COMPLETED`/`CANCELLED`/`EXPIRED`), enrolledAt, accessStartsAt?, accessEndsAt?, progressPercent, createdById? | Authorizes learner access; `orderId` arrives with B5 |
| `Session` | batchId, title, startsAt, endsAt, timezone, joinUrl?, status (`SCHEDULED`/`CANCELLED`/`COMPLETED`), topics, instructorId?, cancelReason? | `recordingId?` arrives with recordings (B4b) |
| `Attendance` | sessionId, userId, status (`PRESENT`/`ABSENT`), signedInAt?, markedById? | One row per learner and session |
| `Holiday` | date, branchId?, reason, createdById? | "Mark as Holiday"; no branch means every branch |
| `Recording` | sessionId, assetId?/url, status (`PROCESSING`/`AVAILABLE`/`FAILED`), visibility | B4b |
| `Announcement` | title, body, urgency (`HIGH`/`MEDIUM`/`LOW`), tags Json?, audience (`ALL`/`BATCH`), publishAt, createdById?, status | |
| `AnnouncementBatch` | announcementId, batchId | The batches a `BATCH` notice is for |
| `AnnouncementRead` | announcementId, userId, readAt | Unread toggle |
| `LessonProgress` | enrollmentId, moduleContentId, status (`NOT_STARTED`/`IN_PROGRESS`/`COMPLETED`), completedAt?, lastPositionSeconds? | Server-side completion rules (B4b) |
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
| `InAppNotification` | userId, title, body, readAt?, link? | Notification centre |
| `PushSubscription` | userId, endpoint, keys, createdAt | Web push |

## B8: Analytics

Reports query transactional tables through `src/server/services/analytics`.
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
