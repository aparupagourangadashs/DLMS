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

## 8. Student frontend review implementation

Implemented on 2026-10-26 at `/student`. This is a **public, synthetic UI
preview**, not a secure/authenticated student service. The original reference
routes in section 5 remain historical observations; local routes are independent.

| Local route | Review behavior | Boundary |
|---|---|---|
| `/student` | Featured-course controls, sample class panel, continue-learning cards | Fixed sample progress and timetable |
| `/student/my-learning` | Search, stream filter, active/completed tabs | No real enrollment data |
| `/student/learning/[course]` | Three original reading previews, lesson selection and previous/next | Proposed reader, not a verified course player; no media/progress writes |
| `/student/announcements` | Search, unread toggle, detail and temporary read state | No live delivery or persistence |
| `/student/calendar` | Day/week/month, date picker, Today and Demo dates | Fixed Asia/Kolkata sessions, no meeting join service |
| `/student/communities` | Two fictional communities and read-only feeds | No copied conversations, posting or moderation service |
| `/student/exams` | Upcoming/past empty states | Exam start/submit/results await confirmed rules |
| `/student/certificates` | Preview and sample SVG download, explicitly invalid | PDF format, issuance, eligibility and sharing deferred |
| `/student/memberships` | Empty state and Help link | No subscription checkout, renewal or cancellation |
| `/student/my-purchases` | Fictional free enrollment cards and detail dialogs | Not a receipt; no real orders, refunds or invoices |
| `/student/refer-and-earn` | Nonredeemable demo code/copy, zero balance, empty transactions | Reward and sharing rules unconfigured |
| `/student/help` | FAQs, minimum-length validation, unsent draft preview | No support request is sent; contact/app links await verified destinations |
| `/student/settings/profile` | Observed field groups, temporary fictional edits | Proposed edit validation, no identity/account writes |
| `/student/settings/preferences` | Timezone selection/automatic detection, notification choices | Page-local only; does not reschedule sessions or deliver reminders |

The 13 core screens comprise Home, ten top-level page routes, and Profile and
Preferences. Three sample-course routes bring the total to 16 student URLs.
Every screen has a demo disclosure; no student profile, progress, draft or
preference is persisted. Do not enter personal information. Navigation is
alphabetical and responsive, with shared IBMV components and a scoped
student-only light palette.

The student sidebar is attached to the viewport's left edge below the header,
with a softly tinted panel, a learning-space
header, stable per-page icon colors and an active-page accent/chevron. Its
desktop header and Exit demo footer remain visible while the menu scrolls.
The desktop control is integrated inside the sidebar header: beside the
learning-space heading when expanded and centered at the top of the icon rail
when collapsed. It stays within the sidebar boundary, never overlapping the
page or branding. It toggles between icons with names (expanded) and
icons only (collapsed); collapsed links keep accessible names and title hints.
The preference remains in the shared layout during navigation, without browser
storage. Mobile retains the full-name slide-out menu independently.
Below 1024px, a 44px hamburger control replaces the desktop toggle/sidebar.
It opens a left-edge modal drawer with full names, focus trapping, Escape/
backdrop dismissal and scrollable menu content. Selecting a destination closes
the drawer; switching to desktop also dismisses it. Mobile headings scale down
and long titles wrap rather than forcing the viewport wider.
The scrollbar is visually hidden without disabling wheel, touch or keyboard
scrolling. Mobile navigation reuses the same links and visual states.

The public website is still planned. Its unavailable navigation is not
presented as working catalog, contact, subscription or authentication links.
Production ownership checks and all section 6 server requirements remain
mandatory before any real learner information is connected.

### Authenticated reference recheck and gap review (2026-10-26)

Home dashboard follow-up: the launch carousel now uses three explicitly
fictional, newest-first launch dates with previous/next and direct slide
controls (no autoplay). Today's Classes filters the sample timetable by the
actual Asia/Kolkata date, refreshes its date snapshot each minute, and has a
loading/empty state. The weekly count is derived from that same date rather
than hardcoded. A profile card calculates 50% from three provided fields in
a shared six-field demo checklist and links to Profile. The checklist is a UI
proposal, not an enrollment requirement; page-local edits do not update Home.
At a Glance links to original sample announcements. These close the dashboard
presentation gaps below, but live schedules, launches, profile persistence and
notifications remain unconnected.

With the user's explicit reuse permission, both unique reference carousel
artworks are stored locally: the Bhakti Vedanta Module 3 institutional banner
in `public/student-course-launch.jpg` and the generic Bhakti Shastri (English)
course artwork in `public/student-bhakti-shastri.jpg`. The reference's other
image elements are clones of these same two slides. These replace all three
fictional launch slides. Both slides use the first banner's 1920:574 frame,
with a split layout for the taller second artwork: the complete image on the
right and course details on the left over a darkened, blurred copy of the
artwork. Both keep the same wide shape without cropping the second image.
On narrow screens the left text reduces to the course name and language.
At the user's request,
duplicate course titles, descriptions and permission notes below the banner
are omitted; accessible image descriptions and navigation controls remain.
Bhakti Vedanta links to its matching public course page; Bhakti Shastri links
to the official course catalog with a Browse label because the observed
destination is an authenticated learner course. No learner progress,
personalized overlay or account-specific URL is copied into the app.
Temporary signed download URLs are not embedded in the app.

After the user signed in directly, the student dashboard and menu were
rechecked read-only. My Learning, Calendar, Exams, Certificates, Memberships,
My Purchases, Refer & Earn, Help, Profile and Preferences were visited.
Global search was expanded without entering a query. No lessons were opened,
assessments started, messages sent, downloads/shares triggered, purchases
made, or profile/preferences saved. Personal records are excluded here.
Some pages render their heading before their content; heading-only loading
states are not evidence that a feature or record is absent.

The primary menu sections already have local counterparts. Remaining gaps:

| Priority | Reference capability | Local status / next work |
|---|---|---|
| High | Authenticated, account-specific learning and persisted settings | Public synthetic preview only. Implement secure sessions, ownership checks and persistence before connecting learner data. |
| High | Actual enrolled-course learning experience | Original text previews only. Media, resources, completion rules and assessment workflows still require a separate, safe review and approved requirements. |
| Medium | Header search for courses, lessons and exercises | Only My Learning course search exists. Add a shared authorized search when content types and access rules are defined. |
| Medium | Profile-completion prompt on Home | Not present locally. Define applicable/required fields before calculating completeness; do not invent a learner percentage. |
| Medium | Calendar List control alongside Day/Week/Month | Local calendar has a session list below its grid but no explicit list-only view. |
| Medium | Today's Classes and an At a Glance panel on Home | Local Home deliberately shows a labelled fixed demo-date timetable; live today/upcoming summaries and update aggregation are not connected. |
| Medium | Course organization and enrollment-period metadata | Local cards show stream, status and synthetic progress, but not an enrollment window or organization label. |
| Medium | Certificate Share plus Issued/Expiry information | Local watermarked SVG preview/download is not a real credential or public sharing system. Sharing, eligibility and verification remain deferred. |
| Medium | Referral sharing and terms | Local copy/transaction preview exists; program rules, terms and share destinations are not configured. |
| Medium | Help contact/social/app destinations and message delivery | Local form is an explicitly unsent draft. Verify institutional destinations and service ownership before connecting them. |
| Later / website | Courses, Contact Us and Subscription header destinations | Public website/catalog/subscription journeys are planned; do not add dead header links. Communities already exists in local navigation. |

Preferences already covers the observed timezone and notification categories;
its automatic-timezone interaction is a temporary preview rather than the
reference's persisted automatic-setting control. Upcoming/past exam navigation
also exists locally, but actual exam-taking and results are unverified.
Community posting/moderation, lesson-player behavior, certificate sharing
destinations, referral redemption and payment/refund flows were not exercised
and must not be claimed as verified parity.

Recommended sequence: close safe frontend gaps (search over demo content,
explicit calendar list view and honest profile-completion guidance), then
review the lesson experience with permission, build public website journeys,
and integrate authenticated services with approved business rules. This
review does not authorize live-site mutations or silently expanding the demo
into a production system.

### Verification

- ESLint, TypeScript and the production build pass (125 generated pages across
  the application).
- All 16 focused Node tests pass, including four student navigation, fixture
  and calendar tests alongside existing admin/editor regression tests.
- All 16 student URLs return HTTP 200 and were checked at 320px and 1440px in
  light and dark themes: no horizontal document overflow or runtime exceptions.
  An unknown student screen returns 404; the admin dashboard still returns 200.
- Browser interaction checks cover featured navigation, learning search/status/
  stream filters, lesson navigation, unread filtering/detail, mobile navigation
  and Escape, calendar navigation/mobile picker, support validation (9
  characters rejected, 10 accepted), temporary profile edits/reset, preference
  toggles/reset, community feeds, purchase details and SVG watermark content.
  Clipboard denial displays an inline manual-copy instruction and error toast.
- The integrated browser throttles normal pointer actionability while hidden;
  functional checks used DOM clicks and dispatched keyboard events where
  necessary. This is not a full assistive-technology or physical-device audit.
  Existing logo/font preload warnings remain nonfatal.

### Student visual direction (2026-10-26)

- Header uses the featured home card's plum gradient and decorative gold rings
  with a finite, reduced-motion-aware entrance animation. White branding, pale
  secondary text, a cream circular logo backing, gold Help control and outlined
  profile/hamburger controls preserve contrast. The account popover retains its
  light surface and dark text; decorative layers do not intercept input.
  The brand text beside the circular logo has a rounded, dark translucent
  plum backing with backdrop blur, inspired by the second banner's text panel.
  Only the backing is blurred; the title and subtitle remain sharp.
  Announcements is accessed from an accessible bell link before Help in the
  header, with an active-page state, rather than the desktop/mobile side menu.
  Below 400px the brand text is hidden to preserve comfortable touch targets;
  the logo link retains the full accessible name.

- Additional read-only reference review of ISKCON Hyderabad's donation
  dashboard informed stronger navigation contrast and summary-card hierarchy.
  No donor records, financial values, private content or source assets were
  copied. Student navigation now has saturated icon tiles, subtle duotone
  Lucide fills, and a plum active row with gold directional accents. Summary
  cards use distinct tinted surfaces and colored bottom edges. Existing icons,
  routes, student features and the light-only palette are retained.

- Light-only pearl surfaces, plum primary actions, teal secondary accents and
  restrained gold highlights. Scoped tokens and dark-utility exclusion keep
  student screens, dialogs and popovers light even when the saved admin theme
  is dark. No student theme toggle or mutation of the saved theme.
- Public reference review: [Vani Samputa](https://vanisamputa.com/) for warm
  surfaces, serif identity and devotional calm; [Sastra Nidhi](https://www.sastranidhi.org/)
  for jewel-tone/gold hierarchy; [Coursera](https://www.coursera.org/) for clear
  course discovery and action hierarchy. These are visual ideas only: no
  source, assets, branding, text or layouts were copied.
- Original CSS course-cover patterns and featured book illustration, gradient
  heading/identity panels and subtle finite entrance/hover effects. No autoplay
  carousel or continuous decorative animation. Reduced-motion preference
  disables movement; mobile form fields use 16px text.
- Header Help Centre shortcut and illustrated avatar/account popover with
  Profile, Preferences, Help and Exit demo links. The profile page repeats the
  same avatar. This is a fictional illustration, not an uploaded photo;
  account persistence and photo upload remain deferred.
- Redesign validation: all 16 student URLs checked at 320px, 768px and 1440px
  with a saved dark admin preference (48 checks): no horizontal overflow,
  clipped controls, runtime exceptions or hydration errors. Header/account
  links, mobile drawer and dropdown light colors, reduced-motion duration,
  and preservation of the saved admin theme were checked separately.
  ESLint, TypeScript, all 16 focused tests and production build pass.
