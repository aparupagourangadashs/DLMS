# Student Portal: Observed Feature and Development Specification

## 1. Scope and privacy

This is a read-only UI reference for the student portal at
`https://courses.ibmedu.org/v3/myaccount`. It describes page layouts, navigation,
and visible field labels to support development of a comparable student
experience. It does not describe the original backend or API.

- Inspection date: 2026-10-19.
- The supplied student account was used to view the authenticated interface.
- No messages, submissions, preferences, purchases, or profile changes were
  made. No course progress or assessment was intentionally changed.
- Personal enrollment names, learner identifiers, payment amounts, contact
  details, referral codes, and community post contents are intentionally
  excluded.
- A page showing no items for this account is not evidence that the feature has
  no data for other students.

## 2. Shared application shell

### Header

The student-facing header exposes:

- Hamburger menu to open the student navigation.
- Site logo linking back to Home.
- **Courses** link to the public course catalog.
- **Contact Us** link.
- **Subscription** link to membership offerings.
- **Communities** shortcut.
- **Search** control.
- **Profile** control with account menu.

The profile menu repeats the primary student navigation and includes **Sign
Out**. Several section pages have a **Back** control. In some pages, such as
Communities, the main header is replaced with a page-specific back control.

## 3. Student menu inventory

| Menu | Observed purpose and page behavior |
|---|---|
| Home | Student dashboard: featured-course carousel, today's classes, and Continue Learning cards with progress and a See all link. |
| My Learning | Course enrollment list, stream filter, Active Learning and Completed Learning tabs, and resume/open-course cards. |
| Communities | List of community spaces with latest-post previews; opens community content. Do not expose one learner's conversation history to other learners. |
| Announcements | Searchable announcement feed, Show Unread toggle, announcement cards with priority and date/time information. |
| Calendar | Student calendar with Day, Week, and Month views, date navigation, and Today control. |
| Exams | Upcoming Exams and Past Exams tabs. The inspected Upcoming tab showed an empty-state message and a Go to Home action. |
| Certificates | Certificate cards with course/program label, issue/expiry details, Download, and Share actions. |
| Memberships | My Memberships page; the inspected account showed a No Active Memberships empty state and support contact link. |
| My Purchases | Purchase cards with item/course label, purchase date/time, price/free indicator, payment status, and View Details action. |
| Refer & Earn | Referral overview, referral-code copy/share controls, View Transactions entry, credit balance, program explanation, and terms link. Never expose a student's referral code or balance to other users. |
| Help | Help Centre with support message textarea and Send Message action, contact options, social links, and app-download link. |
| Settings | Profile and Preferences tabs. Profile has student/account information sections; Preferences has timezone and notification controls. |
| Sign Out | Ends the authenticated student session. |

## 4. Page details and visible fields

### Home

Observed dashboard components:

- Featured/announced course carousel with previous/next controls and numbered
  page indicators.
- **Today's Classes** panel; it showed an empty-state message during
  inspection.
- **Continue Learning** section with **See all**.
- Course cards display course/organization labels, progress percentage,
  completed/total lesson count, and a resume/open action.

The displayed class and enrollment values are user-specific and are not
included here.

### My Learning

- Page heading: **My Learning**.
- Stream selector.
- **Active Learning** and **Completed Learning** tabs.
- Course cards with course and organization labels, enrollment period,
  progress indicator, completed/total lesson count, and an action to open or
  resume the course.
- Course opening leads into a learning experience; the course contents,
  player, lesson completion, and assessment flows were not explored in order
  to avoid changing course progress or submitting work.

### Communities

- Community-list page with community cards and latest-post previews.
- The card itself is selectable and opens the corresponding community space.
- Community messages can contain learner-generated or personally identifying
  material. Feed content and conversation actions were not inspected or
  recorded.
- Community-level moderation, posting, reply, and membership workflows remain
  unverified.

### Announcements

- Search field labeled **Search Announcement**.
- **Show Unread** toggle.
- Announcement feed cards include a category/type heading, message preview,
  date, time, and priority label.
- A card can be opened to view the announcement. Announcement content was not
  copied into this specification.

### Calendar

- Date range heading and calendar navigation.
- **Day**, **Week**, and **Month** view selectors.
- **Today** control and back/previous-period control.
- Events/class entries may appear on the calendar; exact event fields were not
  verified.

### Exams

- **Upcoming Exams** and **Past Exams** tabs.
- The inspected upcoming list showed an empty state with **Go to Home**.
- Exam cards, available actions, and exam-taking rules could not be verified
  from this account state. Do not infer exam fields or allow editing from the
  student side without confirming requirements.

### Certificates

- Certificate cards display a credential/program label, **Issued** date, and
  **Expiry** date/status.
- Actions observed: **Download** and **Share**.
- Certificate template, file format, share destination, and validation rules
  were not tested.

### Memberships

- Page heading: **My Memberships**.
- The inspected account showed **No Active Memberships** and a support
  contact entry.
- Membership card fields and renewal/cancellation actions were not available
  to verify.

### My Purchases

- Purchase history uses cards rather than a table in the observed view.
- Visible card fields: item/course name, purchase date/time, price or Free
  indicator, and payment status.
- **View Details** opens more information; that detail view was not opened.
- Refund, invoice, payment-method, or cancellation behaviors were not tested.

### Refer & Earn

- Referral code area with **Copy** action.
- Sharing controls grouped under **Share via**.
- **View Transactions** entry and credit-balance summary.
- “How it works” explanation of referral rewards and a terms link.
- Exact referral value, account balance, and transaction history are
  per-student information and are intentionally not recorded.
- Referral redemption and transaction details were not opened.

### Help

- **Help Centre** page.
- Message textarea and **Send Message** action.
- Support email/contact option, **Mail Us**, and **Call us** actions.
- Social links and app-download link.
- Form submission was not tested.

### Settings: Profile

The Profile tab groups visible field labels into:

- **Personal Details:** student name, username, date of birth, gender.
- **Parent Details:** parent name, parent email, parent contact number.
- **Education Details:** standard/class.
- **Contact Details:** student mobile number, alternate contact, student email.
- **Address:** residential address, city, state, pincode, permanent address.
- **Student Source:** source selection.

An **Edit** action is available. The profile was not edited. Sensitive values
and the account's learner ID are excluded.

### Settings: Preferences

- **Profile** and **Preferences** tabs.
- **Timezone** section with timezone selection and **Set Timezone
  Automatically** control.
- **Notifications** section with opt-in switches for:
  - Session reminders one hour before a session.
  - Session reminders one day before a session.
  - Session reminders at session start.
  - Promotional campaigns.
  - Promotional channels: WhatsApp, Email, SMS, and Push.

No preference was changed.

## 5. Routes observed

Routes are listed as observed in the authenticated UI. Confirm availability
and authorization in the target implementation; these are not API contracts.

| Page | Route |
|---|---|
| Home | `/v3/myaccount` |
| My Learning | `/v3/myaccount/mycourses` |
| Communities | `/v3/myaccount/communities` |
| Announcements | `/v3/myaccount/announcements` |
| Calendar | `/v3/myaccount/calendar` |
| Exams | `/v3/myaccount/exams` |
| Certificates | `/v3/myaccount/certificates` |
| Memberships | `/v3/myaccount/mymemberships` |
| My Purchases | `/v3/myaccount/mypurchases` |
| Refer & Earn | `/v3/myaccount/refer-and-earn` |
| Help | `/v3/myaccount/help` |
| Settings: Profile | `/v3/myaccount/settings/profile` |
| Settings: Preferences | `/v3/myaccount/settings/preferences` |

## 6. Suggested student-portal implementation

### Information architecture

- Authenticated shell with mobile-responsive drawer navigation.
- Student Home dashboard.
- My Learning with course status and progress.
- Community and announcements.
- Calendar and exams.
- Certificates, memberships, purchases, and referral rewards.
- Help Centre and student profile/preferences.

### Functional and privacy requirements

1. Enforce student ownership on the server for enrollments, progress,
   certificates, purchases, preferences, referrals, and support requests.
2. Keep payment details, profile fields, referral code, and community content
   private to the correct learner and authorized staff.
3. Distinguish loading, empty, and error states. Do not render a failed request
   as an empty list.
4. Preserve course progress and avoid marking lessons complete merely from
   navigation or opening a course.
5. Make lesson progress, assessments, and certificate eligibility consistent
   with authoritative server state.
6. Respect the selected timezone when displaying calendar events and sending
   reminders.
7. Add clear confirmation and success/error feedback for message sending,
   profile updates, preference changes, referrals, and other stateful actions.
8. Design responsive layouts and accessible keyboard interactions for the
   drawer, tabs, switches, course cards, calendar, and dialogs.

## 7. Remaining questions before exact reproduction

- Course player layout, lesson types, downloads, discussion/Q&A, and progress
  completion rules.
- Upcoming/past exam card fields, exam start/submit/retake flows, and result
  visibility.
- Certificate download format, sharing behavior, and eligibility rules.
- Purchase detail fields and support/refund policy.
- Community posting, replies, reactions, moderation, and notification rules.
- Referral transaction columns, reward eligibility, and redemption behavior.
- Help form fields beyond the message body and support-request status tracking.
- Profile edit validation and which profile attributes are editable by
  students.
- Notification preference persistence, defaults, and timezone behavior.
- Authentication/session expiration and account recovery flows.
