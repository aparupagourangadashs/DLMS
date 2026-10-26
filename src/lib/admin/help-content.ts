/**
 * Hand-written help for each admin page, keyed "section/page".
 * List screens also get step-by-step tasks generated from their configuration (see help.ts),
 * so entries here focus on purpose, page-specific workflows and good practice.
 * Use **bold** for on-screen labels.
 */

export type HelpTask = { title: string; steps: string[] };

export type HelpEntry = {
  summary: string;
  whoUses?: string;
  tasks?: HelpTask[];
  tips?: string[];
  related?: string[];
};

export const generalGuides: Array<HelpTask & { id: string }> = [
  {
    id: "navigation",
    title: "Finding your way around",
    steps: [
      "The left rail lists all nine sections alphabetically. Each section's pages are also sorted A–Z by their displayed names.",
      "Selecting a section opens its pages in the second column. The page you are on is highlighted.",
      "On a phone or tablet, select the **menu** button (top left) to open the same navigation.",
      "The breadcrumb at the top shows the section and page you are on.",
      "Press **Ctrl + K** (or select **Search…**) to jump to any page by typing its name.",
    ],
  },
  {
    id: "help",
    title: "Getting help on any page",
    steps: [
      "Every admin page has a **Help** button at the top right, next to the page's main actions.",
      "It opens the help article for that page: what the page is for, what's on the screen, step-by-step tasks and tips.",
      "You can also press **?** on any admin page (when you are not typing in a field).",
      "Select **Open …** at the top of a help article to go back to the page.",
    ],
  },
  {
    id: "lists",
    title: "Working with lists",
    steps: [
      "**Tabs** above a list switch between groups such as Active and Archived. The number on a tab shows how many rows match.",
      "The **search box** and **filters** narrow the list. Select **Clear filters** to reset them.",
      "Select a column heading that shows arrows to sort. Select it again to reverse the order, and a third time to remove sorting.",
      "Lists show 10 rows per page. Use the arrows under the list to change pages.",
      "Where available, **Columns** shows or hides columns and **Export** downloads a CSV file of exactly what you see.",
    ],
  },
  {
    id: "records",
    title: "Creating, editing and removing records",
    steps: [
      "Use the main button at the top right of a page (for example **Create Batch**), or **New** in the top bar to create common items from anywhere.",
      "Fields marked * are required. If something is missing or invalid, the message appears under the field and the cursor moves there.",
      "Select **⋯** at the end of a row for Edit, Duplicate, Archive or Delete.",
      "Archive and Delete always ask you to confirm. Delete can't be undone.",
      "Press **Esc** or select **Cancel** to close a form without saving.",
    ],
  },
  {
    id: "labels",
    title: "What the screen labels mean",
    steps: [
      "**Designed from spec**: the screen follows the fields and controls observed in the specification.",
      "**Proposed design**: the specification listed only the menu item, so the layout is our proposal for IBMV to review.",
      "**Needs IBMV decision**: what this screen must do is still to be agreed. These pages show a proposal and open questions. An orange dot marks them in the menu.",
    ],
  },
  {
    id: "demo",
    title: "Demo mode and sample data",
    steps: [
      "All names, numbers and records are sample data for review. They are not real learners or payments.",
      "You can create, edit, archive and delete records to try the screens. A message at the top right confirms each action.",
      "Most changes reset when you leave or reload the page. Screens explicitly marked local browser storage retain their demo drafts on this device only.",
      "Nothing is saved to a production database or sent to learners, payment gateways or notification providers.",
    ],
  },
  {
    id: "keyboard",
    title: "Keyboard shortcuts and accessibility",
    steps: [
      "**Ctrl + K**: search pages. **?**: help for the current page. **Esc**: close a form, panel or menu.",
      "**Tab** and **Shift + Tab** move between controls; the focused control is outlined.",
      "Use the **left and right arrows** to move between tabs, and the **up and down arrows** in search results.",
      "The moon/sun button switches between light and dark themes. Your choice is remembered on this device.",
    ],
  },
];

const analyticsTasks: HelpTask[] = [
  {
    title: "Choose the reporting period",
    steps: ["Open the date range menu at the top right.", "Choose the last 7, 30, 90 or 365 demo days, anchored to 26 October 2026. Figures and reports use this period and the selected filters."],
  },
  {
    title: "Open a report",
    steps: [
      "Select a report card under **Reports**.",
      "A panel opens on the right with a filtered synthetic preview table.",
      "Select **Export** to download all matching synthetic rows as CSV, including rows beyond the visible page. These are not production figures.",
      "Press **Esc** or the close button to return to the report list.",
    ],
  },
];

export const helpContent: Record<string, HelpEntry> = {
  "home/dashboard": {
    summary: "Your daily starting point: this week's learning performance, enrollment and sales trends, and every live session on a chosen day.",
    whoUses: "Administrators, batch managers and instructors, usually at the start of the day.",
    tasks: [
      {
        title: "Read the weekly performance cards",
        steps: [
          "The four cards show average time spent, total views, average rating and average attendance, each with a seven-day sparkline.",
          "The green or red percentage compares each figure with the previous week. All figures are synthetic demo data.",
          "The separate Daily active users chart shows ten days of activity and their daily average.",
        ],
      },
      {
        title: "Compare signups, enrollments and sales",
        steps: [
          "In the chart card, open the menu at the top right.",
          "Choose **Signup vs Enrollments** to compare new accounts with enrollments, or **Sales** for weekly revenue.",
          "Switch between **Bar**, **Line** and **Area**. Point at a data mark to see its value, or use the accessible data table.",
          "The total above the chart covers the last four weekly periods.",
        ],
      },
      {
        title: "Check the sessions for a day",
        steps: [
          "The **Today's sessions** card lists every session with its time, duration, batch, instructor, attendance, status and topics.",
          "Use the arrows or the date picker to look at another day.",
          "The summary row shows scheduled and cancelled sessions, sign-ins, sessions not signed in yet, and attendance.",
        ],
      },
      {
        title: "Sign in to a session",
        steps: ["Find a session with the status **Scheduled**.", "Select **Sign in** on its row. The row changes to **Signed in** and the sign-in count goes up."],
      },
      {
        title: "Mark a day as a holiday",
        steps: [
          "Choose the date.",
          "Select **Mark as Holiday**. The confirmation shows how many sessions will be cancelled.",
          "Select **Mark as holiday** to confirm. Every scheduled session that day changes to **Cancelled**.",
        ],
      },
      {
        title: "Schedule a new session",
        steps: ["Select **Schedule Session** at the top right. The Sessions calendar opens with the create form ready."],
      },
    ],
    tips: [
      "Marking a holiday cancels sessions for every batch on that date. Check the list before you confirm.",
      "Select **View Calendar** to see the whole week or month.",
      "**What's New** lists recent additions to the admin panel.",
    ],
    related: ["learning/sessions", "learning/submissions", "analytics/sales-enrollment"],
  },

  "products/events": {
    summary: "Create and manage one-off events such as festivals, workshops, quizzes and retreats, and control who can see them.",
    whoUses: "Event organisers and administrators.",
    tips: [
      "**Public** events can be listed on the website, **Private** events are only for invited learners, and **Unlisted** events open only from a direct link.",
      "Use **Duplicate** to create this year's recurring event (for example Gita Jayanti) from last year's entry, then edit the date.",
      "Event times are in India Standard Time (IST).",
    ],
    related: ["learning/announcements", "marketing/campaigns", "analytics/sales-enrollment"],
  },
  "products/mentorships": { summary: "One-to-one or small-group mentorship programmes that learners can book." },
  "products/ebooks": { summary: "Selling or giving access to digital books inside the platform." },
  "products/test-series": { summary: "A bundle of practice tests sold as one product." },
  "products/playlists": { summary: "Curated collections of recordings and videos." },

  "learning/batches": {
    summary: "A batch is one running group of a course, with its own learners, schedule, instructor and batch manager. Use this page to create batches and follow their progress.",
    whoUses: "Academic coordinators and batch managers.",
    tips: [
      "Name batches consistently, such as course code, year and batch number (BGFC-2026-B3), so they are easy to find in filters across the panel.",
      "**Batch progress** shows how far the batch has moved through its course.",
      "Archive batches you no longer need day to day. They stay available in the **Archived** tab.",
    ],
    related: ["learning/sessions", "users/new-enrolment", "learning/session-recordings", "analytics/batch-progress"],
  },
  "learning/sessions": {
    summary: "A calendar of every live class across all batches, where you schedule, review and cancel sessions.",
    whoUses: "Batch managers, instructors and administrators.",
    tasks: [
      {
        title: "Switch between calendar views",
        steps: [
          "Use **List**, **Day**, **Week** or **Month** at the top right of the calendar.",
          "Use the arrows to move backward or forward, and **Today** to return to the current date.",
        ],
      },
      {
        title: "Create a session",
        steps: [
          "Select **Create Session** (or **New → Session** in the top bar).",
          "Enter the title, batch, date, start time (IST) and duration. Add the live-class link if you have it.",
          "Select **Create session**. The calendar moves to that date and shows the new session.",
        ],
      },
      { title: "See a session's details", steps: ["Select any session in the calendar. A panel shows its status, batch, course, instructor, attendance and topics."] },
      {
        title: "Cancel a session",
        steps: ["Open the session.", "Select **Cancel session**. It stays on the calendar, crossed out, with the status **Cancelled**."],
      },
      { title: "Open a busy day from Month view", steps: ["In Month view, select the date number or **+N more** to open that date in Day view."] },
    ],
    tips: [
      "Colours: blue means scheduled, green means completed, and red crossed out means cancelled.",
      "Times here are in IST. The student portal will show each learner times in their own timezone.",
      "To cancel every session on a day (for a festival or holiday), use **Mark as Holiday** on the Dashboard.",
    ],
    related: ["home/dashboard", "learning/batches", "learning/session-recordings", "analytics/trainer"],
  },
  "learning/announcements": {
    summary: "Post notices to all learners or to one batch: schedule changes, holidays, exam guidance and more.",
    whoUses: "Batch managers, instructors and administrators.",
    tips: [
      "Keep **High** urgency for changes learners must act on, such as a rescheduled class.",
      "Choose a future **Publish at** time to schedule an announcement in advance.",
      "Announcements appear in the student portal. To also send them by email or WhatsApp, create a campaign.",
    ],
    related: ["marketing/campaigns", "learning/sessions", "settings/system-notifications"],
  },
  "learning/feedback-forms": {
    summary: "Build feedback and rating forms and see how many learners responded.",
    whoUses: "Academic coordinators and quality reviewers.",
    tips: [
      "**Conversions** shows how many learners submitted the form.",
      "Short forms of 5 to 8 questions get the most responses.",
      "Use **Duplicate** to reuse a form for a new batch.",
    ],
    related: ["analytics/feedback-rating", "learning/batches"],
  },
  "learning/module-library": {
    summary: "Reusable modules (groups of lessons, PDFs and quizzes) that you build once and add to any course or batch.",
    whoUses: "Content editors and instructors.",
    tips: [
      "Changing a module changes it everywhere it is used. Duplicate it first if only one course needs the change.",
      "The line under each module name shows how many courses use it.",
    ],
    related: ["learning/asset-library", "learning/question-bank", "learning/batches"],
  },
  "learning/question-bank": {
    summary: "Collections of questions organised by exam, subject, topic and difficulty, used to build assessments and tests.",
    whoUses: "Instructors and examiners.",
    tips: [
      "Tag difficulty consistently so exams can mix easy, medium and hard questions.",
      "The ID (for example QB-1040) is a permanent reference you can quote when reporting a problem.",
    ],
    related: ["learning/assessments", "learning/submissions"],
  },
  "learning/asset-library": {
    summary: "Every file used in courses (videos, audio, PDFs, slides, YouTube links and more), with storage and usage at a glance.",
    whoUses: "Content editors and instructors.",
    tips: [
      "**Unused** assets are not linked to any module. Review them regularly to save storage.",
      "Supported types: Video, Audio, PDF, YouTube, Image, Doc, Sheet, Slide, Text/HTML, Zip, SCORM Zip, Link/Embed and Epub.",
      "File upload will connect to media storage in the backend phase. Until then, enter a file name or link.",
    ],
    related: ["learning/module-library", "learning/session-recordings"],
  },
  "learning/assessments": {
    summary: "Assignments and externally hosted (custom-link) assessments: which courses they belong to, their price and how many learners attempted them.",
    whoUses: "Instructors and examiners.",
    tips: [
      "**Assignment Based**: learners upload work that you evaluate in Submissions. **Custom Link**: the assessment is hosted elsewhere and learners follow a link.",
      "Leave the price at 0 for a free assessment.",
      "**Unique attempts** counts each learner once; **Total attempts** includes retakes.",
    ],
    related: ["learning/submissions", "learning/question-bank", "settings/grading-system"],
  },
  "learning/submissions": {
    summary: "Learners' assessment submissions waiting for evaluation, and the marks already given.",
    whoUses: "Instructors and examiners.",
    tasks: [
      {
        title: "Evaluate a submission",
        steps: [
          "Open the **Not Evaluated** tab.",
          "Select **Review** on the submission.",
          "Enter the marks, between 0 and the total shown in the label.",
          "Select **Save evaluation**. The submission moves to **Evaluated** and its percentage is calculated.",
        ],
      },
    ],
    tips: [
      "**Late** means the work was submitted after the deadline.",
      "Use **Columns** to show the assessment type and product name when you need them.",
      "When learners see their marks depends on the publication rules agreed with IBMV.",
    ],
    related: ["learning/assessments", "settings/grading-system", "analytics/batch-progress"],
  },
  "learning/session-recordings": {
    summary: "Recordings of live classes, organised by batch, so learners can catch up on missed sessions.",
    whoUses: "Batch managers and instructors.",
    tips: [
      "**Processing** means the video provider is still preparing the recording.",
      "Use the batch tabs to switch between active, completed and archived batches.",
      "Tick the checkboxes to select recordings. Bulk actions will be added with the backend.",
    ],
    related: ["learning/sessions", "learning/batches", "learning/asset-library"],
  },
  "learning/certificates": {
    summary: "Certificate templates for each course and the rules that decide when a learner receives one.",
    whoUses: "Academic coordinators and administrators.",
    tips: [
      "Write the issuance rule in plain words (for example: 100% progress and final exam ≥ 60%) so it can later be checked automatically.",
      "New certificates start as **Draft** until the template design is approved.",
      "Learners will see issued certificates in the student portal, with a verification link.",
    ],
    related: ["learning/assessments", "settings/grading-system"],
  },

  "users/learners": {
    summary: "The directory of everyone registered on the platform, with contact details, enrollment status and registration number.",
    whoUses: "Administrators, batch managers and support staff.",
    tips: [
      "Statuses: **Registered** has an account but no enrollment; **Enrolled** is in an active batch; **Completed** has finished their course; **On leave** is paused; **Archived** is no longer active.",
      "To enrol an existing learner into a batch, use New Enrolment.",
      "Learner details are personal data. Export only what you need and store files securely.",
    ],
    related: ["users/new-enrolment", "users/segments", "analytics/batch-progress"],
  },
  "users/team": {
    summary: "Staff accounts (administrators, instructors, content editors, finance and support), with their role and branch.",
    whoUses: "Administrators.",
    tips: [
      "Give each person the lowest role that lets them do their work.",
      "Archive staff who leave rather than deleting them, so their past actions stay traceable.",
      "Roles and permissions are still being finalised with IBMV; this list shows the proposed roles.",
    ],
    related: ["settings/sub-organizations", "settings/my-profile"],
  },
  "users/segments": {
    summary: "Groups of learners, such as \"Inactive for 30 days\", used to target campaigns and filter reports.",
    whoUses: "Marketing and administrators.",
    tips: [
      "**Dynamic** segments update automatically as learners match the rules. **Static** segments keep a fixed list.",
      "The rule builder for dynamic segments will be added with the backend. For now you can name a segment and choose its type.",
    ],
    related: ["marketing/campaigns", "users/learners"],
  },
  "users/new-enrolment": {
    summary: "Add learners to batches one at a time, by pasting a list of emails, or by uploading a CSV file.",
    whoUses: "Administrators, batch managers and support staff.",
    tasks: [
      {
        title: "Enrol one learner",
        steps: [
          "Choose **Single Enrollment**.",
          "Enter the learner's email and choose a batch.",
          "Select **Proceed**. An existing learner is enrolled straight away.",
          "If no account exists for that email, enter the learner's full name and select **Register and enrol**.",
        ],
      },
      {
        title: "Enrol many learners into one batch",
        steps: [
          "Choose **Bulk Enrollment**.",
          "Paste email addresses, one per line or separated by commas.",
          "Check the counts that appear: valid, new accounts, invalid and duplicates. Invalid addresses are listed so you can fix them.",
          "Choose the batch and select **Enrol N learners**.",
        ],
      },
      {
        title: "Register a learner without enrolling",
        steps: ["Choose **Learner Registration**.", "Enter the full name, email and mobile number. City is optional.", "Select **Register learner**."],
      },
      {
        title: "Enrol learners from a CSV file",
        steps: [
          "Choose **Advanced Bulk Enrollment**.",
          "Prepare a CSV file with the columns **email**, **name** and **batch**. The batch must match an existing batch name exactly.",
          "Select **Choose CSV file** (2 MB maximum), or **Use sample file** to try it out.",
          "Review the results: each row shows **Ready** or the problem to fix.",
          "Select **Enrol N valid rows**. Fix the skipped rows and upload them again.",
        ],
      },
    ],
    tips: [
      "Advanced bulk enrollment checks every row before anything is enrolled, so one bad row never blocks the others.",
      "Paid enrollments will normally come through checkout. Use this page for scholarships, offline payments and corrections.",
    ],
    related: ["users/learners", "learning/batches"],
  },

  "engage/community": {
    summary: "Learner communities where members post messages, staff pin important posts and moderators manage membership.",
    whoUses: "Community moderators and instructors.",
    tasks: [
      { title: "Create a demo community", steps: ["Select **New Community**.", "Enter a unique name and description, then choose Message layout for chronological conversations or Feed layout for newest posts first.", "Select **Create community**. The new community opens with Demo Admin as moderator; no learners are invited or notified."] },
      { title: "Switch community", steps: ["Select a community in the list on the left. Its messages, members and pins open on the right."] },
      { title: "Post a message", steps: ["Open the **Messages** tab.", "Type in the box at the bottom and select **Send**."] },
      {
        title: "Pin or unpin a message",
        steps: ["Select the pin icon on a message.", "Pinned messages show a **Pinned** badge and are collected in the **Pins** tab."],
      },
      {
        title: "Remove a member",
        steps: ["Select **Manage Members** or the **Members** tab.", "Select **Remove** next to the member and confirm."],
      },
    ],
    tips: [
      "Pinned posts appear in the Pins tab. Message communities remain chronological; feed communities show newest posts first.",
      "Communities and messages are local demo state and reset when you leave the page.",
      "Rules for moderation, reporting and message retention are still to be agreed with IBMV.",
    ],
    related: ["engage/discussions", "analytics/community-analytics"],
  },
  "engage/discussions": { summary: "Course-level discussion threads with replies." },

  "marketing/campaigns": {
    summary: "Send bulk messages to learners by email, WhatsApp, SMS or push notification, either now or at a scheduled time.",
    whoUses: "Marketing and communications staff.",
    tips: [
      "WhatsApp and SMS messages need templates approved on IBMV's provider accounts before they can be sent.",
      "Every message uses wallet credits. Check the Utility Wallet before a large send.",
      "Learners who opted out of a channel won't receive campaigns on it.",
    ],
    related: ["users/segments", "marketing/promotional-templates", "settings/utility-wallet", "analytics/marketing-analytics"],
  },
  "marketing/workflows": { summary: "Automated messages triggered by learner actions, such as enrolling or abandoning a cart." },
  "marketing/blogs": {
    summary: "Articles published on the public website.",
    whoUses: "Content editors and marketing staff.",
    tips: [
      "**Published** is live on the website, **Draft** is work in progress, and **Hidden** is taken offline but kept.",
      "A rich-text editor with images will replace the plain content box.",
    ],
    related: ["marketing/marketing-banners", "marketing/testimonials"],
  },
  "marketing/marketing-banners": {
    summary: "Promotional banners shown on the website home page and the student portal home.",
    whoUses: "Marketing staff.",
    tips: [
      "Keep a few active banners at a time. Too many reduce attention.",
      "Add a link so visitors go straight to the course or event being promoted.",
      "Banner image upload arrives with media storage in the backend phase.",
    ],
    related: ["products/events", "marketing/promo-codes"],
  },
  "marketing/leads": {
    summary: "Enquiries from the website contact form, bulk book orders, campaigns and events, tracked until they convert.",
    whoUses: "Admissions, publications and marketing staff.",
    tasks: [
      {
        title: "Update a lead after follow-up",
        steps: ["Select **⋯** on the lead and choose **Edit**.", "Change the **Stage** (for example from New to Contacted).", "Select **Save changes**."],
      },
    ],
    tips: [
      "Stages run **New** → **Contacted** → **Converted** or **Closed**.",
      "Follow up new leads within one working day.",
      "Leads are created automatically from website forms, so there is no create button.",
    ],
    related: ["marketing/campaigns", "users/learners"],
  },
  "marketing/promotional-templates": { summary: "Reusable message templates for email, WhatsApp and SMS." },
  "marketing/promo-codes": {
    summary: "Discount codes with a validity date and a usage limit.",
    whoUses: "Marketing and finance staff.",
    tips: [
      "Use short uppercase codes that are easy to type, such as GITA20.",
      "**Used / limit** shows redemptions so far. Once the limit is reached the code stops working.",
      "Expired codes stay in the list for reporting.",
    ],
    related: ["sales/abandoned-cart", "analytics/marketing-analytics"],
  },
  "marketing/testimonials": {
    summary: "Learner testimonials, as text or video, shown on the public website.",
    whoUses: "Marketing staff.",
    tips: [
      "Get the learner's consent before publishing their name, photo or video.",
      "New testimonials start **Hidden** until they are reviewed.",
    ],
    related: ["marketing/blogs"],
  },

  "sales/abandoned-cart": {
    summary: "Checkouts that were started but not paid, so you can follow up and recover the sale.",
    whoUses: "Sales, admissions and support staff.",
    tips: [
      "The summary cards show the number of abandoned carts, their total value, how many happened in the last 30 days, and how many were later completed.",
      "Follow up within 24 hours. A campaign with a promo code often helps.",
      "The **Completed** tab lists carts that were paid later.",
    ],
    related: ["marketing/promo-codes", "marketing/campaigns", "analytics/sales-enrollment"],
  },
  "sales/cheque-management": { summary: "Recording offline cheque payments and tracking them until they clear." },

  "analytics/sales-enrollment": {
    summary: "Enrollments, sales, payments received and the GST report.",
    whoUses: "Finance staff and administrators.",
    tasks: analyticsTasks,
    tips: ["The GST report format will be finalised with IBMV.", "Figures follow the date range chosen at the top of the page."],
    related: ["sales/abandoned-cart", "home/dashboard"],
  },
  "analytics/batch-progress": {
    summary: "How far each batch and learner has progressed, attendance, and learners at risk of dropping out.",
    whoUses: "Academic coordinators and batch managers.",
    tasks: analyticsTasks,
    tips: ["**At-risk learners** have had no activity for 14 days. Consider a reminder campaign."],
    related: ["learning/batches", "users/segments"],
  },
  "analytics/feedback-rating": {
    summary: "Ratings for courses and instructors, and the responses to feedback forms.",
    whoUses: "Academic coordinators and quality reviewers.",
    tasks: analyticsTasks,
    related: ["learning/feedback-forms"],
  },
  "analytics/marketing-analytics": {
    summary: "Campaign delivery and engagement, promo code usage and where leads come from.",
    whoUses: "Marketing staff.",
    tasks: analyticsTasks,
    related: ["marketing/campaigns", "marketing/promo-codes", "marketing/leads"],
  },
  "analytics/trainer": {
    summary: "Sessions taken, attendance and ratings for each instructor.",
    whoUses: "Academic coordinators.",
    tasks: analyticsTasks,
    related: ["learning/sessions", "users/team"],
  },
  "analytics/notification-logs": {
    summary: "A delivery log for every email, WhatsApp, SMS and push message, including failures and opt-outs.",
    whoUses: "Support and communications staff.",
    tasks: analyticsTasks,
    tips: ["Check **Failures** when a learner says they didn't receive a message."],
    related: ["settings/system-notifications", "marketing/campaigns"],
  },
  "analytics/community-analytics": {
    summary: "Community activity over time and the most active members.",
    whoUses: "Community moderators.",
    tasks: analyticsTasks,
    related: ["engage/community"],
  },
  "analytics/advanced-analytics": {
    summary: "Custom reports and cohort comparisons across modules. Scope to be agreed with IBMV.",
    whoUses: "Administrators and analysts.",
    tasks: analyticsTasks,
  },

  "settings/my-profile": {
    summary: "Your own account details, contact information, address and preferences, plus your password.",
    whoUses: "Every staff member.",
    tasks: [
      {
        title: "Update your details",
        steps: [
          "Select **Edit Profile**.",
          "Change the fields you need. Fields marked * are required. The pincode must be 6 digits.",
          "Select **Save changes**, or **Cancel** to discard your changes.",
        ],
      },
      {
        title: "Change your password",
        steps: [
          "Select **Change password**.",
          "Enter your current password, then the new password twice. Use at least 10 characters, with both letters and numbers.",
          "Select **Update password**. (Password change works once sign-in is connected in the backend phase.)",
        ],
      },
    ],
    tips: [
      "Keep your mobile number and email up to date. They are used to recover your account.",
      "**Timezone** controls how dates and times are shown to you.",
    ],
    related: ["users/team"],
  },
  "settings/sub-organizations": {
    summary: "Branches and centres (for example Head Office, Pune Centre and Online), each with its own admins and learners.",
    whoUses: "Super administrators.",
    tasks: [{ title: "Configure a demo branch", steps: ["Enter the branch name, city and manager in the branch form.", "Add the branch to the local list. Manager and activity are visible on each branch.", "Use Pause or Reactivate to try a local status change, then Save changes. No real learners or permissions are moved."] }],
    tips: ["Branch activity and manager assignments are synthetic; real access isolation requires backend authorization."],
    related: ["users/team"],
  },
  "settings/system-notifications": {
    summary: "Choose which automatic messages the platform sends (welcome, reminders, payment, certificates and more) and on which channels.",
    whoUses: "Administrators and communications staff.",
    tasks: [
      {
        title: "Change which channels a message uses",
        steps: [
          "Choose one of the nine event-family tabs, then find the message in its list.",
          "Turn the switch on or off under **Email**, **WhatsApp**, **SMS** or **Push**.",
          "Select **Save changes**. **Reset** discards changes you haven't saved.",
        ],
      },
      { title: "Manage global channels", steps: ["Select **Manage Notifications**.", "Disable a global channel to disable its event switches without discarding their preferences.", "Select **Done**, then Save changes. Provider statuses remain Not connected and no message is sent."] },
    ],
    tips: [
      "Learners can still opt out of a channel in their own preferences.",
      "WhatsApp and SMS use wallet credits and need templates approved by the provider.",
    ],
    related: ["analytics/notification-logs", "settings/utility-wallet", "marketing/campaigns"],
  },
  "settings/categories": {
    summary: "Categories group courses on the website catalog pages and in reports. Each one has its own web address, such as /self-study.",
    whoUses: "Administrators and content editors.",
    tasks: [{ title: "Build a category hierarchy", steps: ["Add a category or choose its parent when adding a subcategory.", "Use the move-up and move-down icon buttons to reorder categories or their subcategories.", "Save changes to validate the local structure. The live catalog is not changed."] }],
    tips: ["Changing a URL path breaks old links and bookmarks. Plan a redirect when you change one."],
    related: ["products/events", "marketing/blogs"],
  },
  "settings/custom-fields": {
    summary: "Extra fields captured on learner profiles, registration and kids' enrolment forms.",
    whoUses: "Administrators.",
    tasks: [{ title: "Configure scoped demo fields", steps: ["Choose an entity tab, then the available placement view.", "Add the field label, type and required setting.", "Use the reorder controls to adjust fields within the selected entity and placement. Save changes keeps the configuration only on this page."] }],
    tips: [
      "Ask only for information you will actually use. Every required field makes registration longer.",
      "Personal details such as a parent's contact need consent and careful handling.",
    ],
    related: ["users/learners", "users/new-enrolment"],
  },
  "settings/grading-system": {
    summary: "Grade bands (for example A+ for 90–100%) applied to assessment percentages.",
    whoUses: "Examiners and administrators.",
    tasks: [{ title: "Edit grade bands", steps: ["Edit the label and percentage range inline, or select Add band.", "Remove bands you do not need.", "Save changes checks that ranges cover 0 through 100 without gaps or overlaps. Resolve the inline error before saving."] }],
    tips: [
      "Make sure the bands cover 0–100% with no gaps or overlaps.",
      "Changing the bands affects how existing results are displayed.",
    ],
    related: ["learning/assessments", "learning/submissions", "learning/certificates"],
  },
  "settings/miscellaneous-fees": {
    summary: "Extra charges, such as printed material or courier, that can be added to a product at checkout.",
    whoUses: "Finance staff.",
    tasks: [{ title: "Add a fee template", steps: ["Enter a template name, description and amount.", "Add it to the local list and Save changes.", "No invoice, tax calculation or real charge is created."] }],
    tips: ["How these fees are taxed and shown on invoices will be confirmed with IBMV."],
    related: ["analytics/sales-enrollment"],
  },
  "settings/international-selling": {
    summary: "Preview branch availability, base and fallback currencies, pricing method, adjustments and precision.",
    tasks: [{ title: "Configure international pricing", steps: ["Set branch enablement and choose different base and fallback currencies.", "Choose fixed pricing or automatic conversion, then set the adjustment and decimal precision.", "Save changes validates the settings. Live rates, payment gateway connection and checkout remain unconfigured."] }],
  },
  "settings/learner-experience": {
    summary: "Configure a local preview of the learner menu and feature visibility.",
    tasks: [{ title: "Customize the learner menu", steps: ["Toggle visibility and use the reorder controls on learner-sidebar items.", "Add a custom item label and HTTPS destination, then check its position in the preview. Custom links open in a new tab.", "Adjust class-record, overview, password, preference and profile visibility, then Save changes. No deployed student portal is modified."] }],
  },
  "settings/utility-wallet": {
    summary: "Prepaid credits used for sending SMS, WhatsApp and email, with every recharge and charge listed.",
    whoUses: "Finance staff and administrators.",
    tips: [
      "Recharging and sending notifications are not connected in this demo.",
      "Use the dates to reconcile charges with the provider's invoices.",
    ],
    tasks: [{ title: "Review demo wallet activity", steps: ["Open Notification credits to inspect usage, channel and running balance.", "Filter recharge history and export matching demo rows.", "AI credits are marked unavailable; no real balance is recharged or spent."] }],
    related: ["marketing/campaigns", "settings/system-notifications"],
  },
};
