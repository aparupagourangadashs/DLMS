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
    title: "Live screens and sample data",
    steps: [
      "Screens whose help article says **connected to the database** (for example Team, Learners, Support Inbox, Courses, Categories, Leads and the Website group) save real changes. Each change is recorded in the audit log, and what you can do depends on your role.",
      "All other screens still show sample names, numbers and records for review. They are not real learners or payments.",
      "On sample screens you can create, edit, archive and delete records to try the screens. Most changes reset when you leave or reload the page; screens explicitly marked local browser storage keep their demo drafts on this device only.",
      "Sample screens never send anything to learners, payment gateways or notification providers.",
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
  "products/courses": {
    summary: "The public course catalog: every course shown on the website, with its category, details, FAQs and publishing state.",
    whoUses: "Content editors and administrators.",
    tasks: [
      {
        title: "Publish a new course on the website",
        steps: [
          "Select **Add Course** and fill in the title, **Category (collection)**, short summary and the official course link.",
          "Continue through the steps. Add FAQs, schedule notes and an image path if you have them.",
          "On the last step set **Status** to **Published** and save. The course appears on its collection page and gets its own page straight away.",
        ],
      },
      {
        title: "Take a course off the website",
        steps: ["Select **⋯** on the course and choose **Archive**. It disappears from the website at once and stays here for reference.", "Published courses cannot be deleted. Archive them first."],
      },
      {
        title: "Give a course lessons for its learners",
        steps: ["Build the lessons first under Learning > Module Library.", "Edit the course and, on the last step, select **Add module** under **Module** for each module, in the order learners should study them.", "Learners enrolled in the course open the lessons from My Learning."],
      },
    ],
    tips: [
      "A course shows on the website only when it is **Published** and its category is published too.",
      "Leave **URL name** blank to create it from the title. Changing it later breaks old links.",
      "Prices are in rupees. Leave the price empty for a free course or when the price is only on the official site.",
      "Use **Duplicate** to start a similar course as a draft.",
    ],
    related: ["settings/categories", "marketing/testimonials", "website/site-settings"],
  },
  "products/ebooks": { summary: "Selling or giving access to digital books inside the platform." },
  "products/test-series": { summary: "A bundle of practice tests sold as one product." },
  "products/playlists": { summary: "Curated collections of recordings and videos." },

  "learning/batches": {
    summary: "A batch is one running group of a course, with its own learners, schedule, instructor and batch manager. Create batches here, then enrol learners and schedule sessions for them.",
    whoUses: "Academic coordinators and batch managers.",
    tasks: [
      {
        title: "Create a batch",
        steps: [
          "Select **Create Batch**.",
          "Enter a unique name, choose the course, and set the start and end dates. The end date must be after the start.",
          "Choose the instructor (instructors and administrators can teach) and the primary manager. Add other managers if needed.",
          "Choose a branch, or leave it empty for a batch that belongs to no branch, then save.",
        ],
      },
      {
        title: "Complete or archive a batch",
        steps: ["Edit the batch and change **Status**, or choose **Archive** on its row.", "A completed or archived batch takes no new enrolments or sessions. Every learner, session and record is kept, and you can reopen it by setting the status back to Active."],
      },
      { title: "Start a similar batch", steps: ["Choose **Duplicate** on the row. The copy keeps the course, dates, instructor and managers but not the learners. Rename it and adjust the dates."] },
    ],
    tips: [
      "Name batches consistently, such as course code, year and batch number (BGFC-2026-B3), so they are easy to find in filters across the panel.",
      "**Learners** counts the people currently enrolled. **Batch progress** is the average of what those learners have completed in the course player.",
      "Staff tied to a branch see and edit only their own branch's batches and batches that belong to no branch.",
      "Batch communities arrive with Communities; choosing modules per batch is not built yet, so every batch of a course uses the course's modules.",
    ],
    related: ["learning/sessions", "users/new-enrolment", "learning/session-recordings", "analytics/batch-progress"],
  },
  "learning/sessions": {
    summary: "A calendar of every live class across all batches, where you schedule, reschedule, cancel and take attendance for sessions.",
    whoUses: "Batch managers, instructors and administrators.",
    tasks: [
      {
        title: "Switch between calendar views",
        steps: [
          "Use **List**, **Day**, **Week** or **Month** at the top of the calendar.",
          "Use the arrows to move backward or forward, **Today** to return to the current date, and the batch filter to look at one batch.",
        ],
      },
      {
        title: "Create a session",
        steps: [
          "Select **Create Session** (or **New \u2192 Session** in the top bar).",
          "Enter the title, batch, date, start time (IST) and duration. Add the live-class link (https) and topics if you have them.",
          "To repeat the class every week, enter the number of weeks in **Repeat weekly for**. Holidays and dates after the batch ends are skipped.",
          "Select **Create session**. The calendar moves to that date and shows the new session.",
        ],
      },
      { title: "See a session's details", steps: ["Select any session in the calendar. A panel shows its status, batch, course, instructor, class link, topics and the class list."] },
      {
        title: "Reschedule or edit a session",
        steps: ["Open the session and choose **Edit or reschedule**.", "Change the date, time, duration, link or topics. The instructor cannot be double-booked, and a holiday cannot be chosen."],
      },
      {
        title: "Take attendance",
        steps: ["Open a session that has started.", "Mark each learner **Present** or **Absent**, or choose **Mark everyone present** and change the exceptions.", "Select **Save attendance**. You can correct it later in the same way."],
      },
      {
        title: "Cancel a session",
        steps: ["Open the session and choose **Cancel session**.", "Say why it is cancelled. Learners of that batch see the reason. The session stays on the calendar, crossed out, with the status **Cancelled**."],
      },
      {
        title: "Mark a holiday",
        steps: [
          "Select **Mark as Holiday**, then choose the date, a reason and a branch (or all branches).",
          "Every scheduled session of those batches on that day is cancelled with the holiday as the reason, and learners see the holiday on their calendar.",
          "To remove a holiday, select the \u00d7 on its label above the calendar. Sessions already cancelled stay cancelled.",
        ],
      },
      { title: "Open a busy day from Month view", steps: ["In Month view, select the date number or **+N more** to open that date in Day view."] },
    ],
    tips: [
      "Colours identify the course. Cancelled sessions are crossed out.",
      "All times here are in IST.",
      "Learners get the class link 15 minutes before the start and until the session ends; before that it stays hidden.",
      "Attendance can only be marked once a session has started, and only for learners enrolled in the batch.",
      "Staff tied to a branch see only their own branch's batches, and can mark holidays only for their own branch.",
    ],
    related: ["home/dashboard", "learning/batches", "learning/session-recordings", "analytics/trainer"],
  },
  "learning/announcements": {
    summary: "Post notices to all learners or to one batch: schedule changes, holidays, exam guidance and more.",
    whoUses: "Batch managers, instructors and administrators.",
    tasks: [
      {
        title: "Publish an announcement",
        steps: [
          "Select **New Announcement**.",
          "Enter the title and message, choose the audience (all learners, or the learners of one batch) and the urgency.",
          "Set **Publish at** (IST) and choose the status **Published**. Learners see it from that time.",
        ],
      },
      {
        title: "Schedule or hold back a notice",
        steps: ["Choose a later **Publish at** time to schedule it. It stays hidden until then.", "Choose **Draft** to keep it private while you write it."],
      },
    ],
    tips: [
      "Keep **High** urgency for changes learners must act on, such as a rescheduled class. High notices are shown first.",
      "Only drafts can be deleted. Archive a published notice to remove it from learners; it stays in the list.",
      "Each learner has their own read status. Editing a published notice does not mark it unread again.",
      "Announcements appear in the student portal. Email, SMS and WhatsApp delivery arrives with the messaging phase.",
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
    summary: "Reusable modules of lessons that you build once and add to any course. Enrolled learners study them in the course player.",
    whoUses: "Content editors and instructors.",
    tasks: [
      {
        title: "Build a module",
        steps: [
          "Select **Add Module** and enter a name and, if you like, a description.",
          "Under **Lesson**, select **Add lesson**. Choose the type: **Text** (written here, with simple formatting), **Video** (a YouTube address) or **Link** (a page on another website).",
          "Use **Move up** to put the lessons in order, then save. Set the status to **Published** when the module is ready for learners.",
        ],
      },
      {
        title: "Add a module to a course",
        steps: ["Open Products > Courses and edit the course.", "On the last step, under **Module**, select **Add module** for each module, in the order learners should study them.", "Learners enrolled in the course see the lessons straight away."],
      },
      {
        title: "Change a module that is already in use",
        steps: [
          "Edit the module and change, reorder or add lessons. A lesson you keep, even renamed or moved, keeps each learner's completion.",
          "A lesson you remove disappears from every course, together with the progress on it.",
        ],
      },
    ],
    tips: [
      "Changing a module changes it in every course that includes it. Duplicate it first if only one course needs the change.",
      "The line under each module name shows how many courses use it. A module in use cannot be deleted; take it out of the courses first, or archive it.",
      "Learners see only **Published** modules. Draft and archived ones are hidden but keep their lessons.",
      "Learners mark each lesson complete themselves. Opening or watching a lesson does not complete it, and a course completes when every lesson is done.",
      "PDFs, audio and quizzes arrive with the Asset Library and assessments. Until then, link to a page or a YouTube video.",
    ],
    related: ["products/courses", "learning/asset-library", "learning/batches"],
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
    summary: "The directory of everyone registered on the platform, with contact details, status and registration number. Learners added here receive an email link to choose their own password.",
    whoUses: "Administrators, batch managers and support staff.",
    tasks: [
      {
        title: "Add a learner",
        steps: [
          "Select **Add Learner**, then enter the name and email. Phone, city and branch are optional.",
          "Select **Add Learner**. The learner gets a registration number such as IBMV/26/00042 and an email with a link to set a password. Staff never see or set passwords.",
          "If the email already has an account, you are told so instead of creating a duplicate.",
        ],
      },
      {
        title: "Send a password reset",
        steps: ["Select **\u22ef** on the learner and choose **Send password reset**. A one-hour link is emailed to the learner.", "Archived learners must be restored first."],
      },
      {
        title: "Archive or restore a learner",
        steps: ["Select **\u22ef** and choose **Archive**. The learner is signed out everywhere and cannot sign in, but their record and history are kept.", "Open the **Archived** tab and choose **Restore** to bring them back."],
      },
    ],
    tips: [
      "Statuses: **Registered** has an account but no active enrolment; **Enrolled** is in at least one batch; **Completed** has finished every course; **On leave** is paused but can still sign in; **Archived** is no longer active. Enrolled and Completed follow the learner's enrolments; set On leave or Archived by editing the learner's account status.",
      "Filter by course, batch, branch or city to find the learners of one group.",
      "The sign-in email cannot be changed here. The learner can ask support if it must change.",
      "Staff assigned to one branch only see and manage that branch's learners.",
      "To enrol an existing learner into a batch, use New Enrolment.",
      "Learner details are personal data. Export only what you need and store files securely.",
    ],
    related: ["users/new-enrolment", "engage/support", "users/segments"],
  },
  "users/team": {
    summary: "Staff accounts (administrators, instructors, content editors, finance and support), with their role and branch.",
    whoUses: "Administrators.",
    tips: [
      "Give each person the lowest role that lets them do their work.",
      "Archive staff who leave rather than deleting them, so their past actions stay traceable. Choose **Restore** on an archived person to bring them back.",
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
    summary: "Add learners to batches one at a time, by pasting a list of emails, or by uploading a CSV file. New email addresses get an account and a link to choose a password.",
    whoUses: "Administrators, batch managers and support staff.",
    tasks: [
      {
        title: "Enrol one learner",
        steps: [
          "Choose **Single Enrollment**.",
          "Enter the learner's email and choose a batch, then select **Enrol learner**. An existing learner is enrolled straight away.",
          "If no account exists for that email, the form asks for the learner's full name (and optionally a mobile number). Select **Register and enrol**.",
          "Someone already enrolled in the same course is told so and is not enrolled twice.",
        ],
      },
      {
        title: "Enrol many learners into one batch",
        steps: [
          "Choose **Bulk Enrollment**.",
          "Paste email addresses, one per line or separated by commas, and choose the batch.",
          "Check the counts that appear: valid, invalid and duplicates. Select **Check list** to see what would happen to every address before anything is saved.",
          "Select **Enrol N learners**. Addresses with no account get one, named from the address; the learner can correct their name later.",
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
          "Prepare a CSV file with the columns **email**, **batch** and, for new learners, **name**. The batch must match an active batch name exactly (capital letters do not matter).",
          "Select **Choose CSV file** (500 KB and 500 rows at most), or **Use sample file** to try it out.",
          "Every row is checked first and shows what would happen or the problem to fix. Nothing is saved yet.",
          "Select **Enrol N learners**. Fix the rows that need it and upload them again; **Download results** saves the outcome of every row.",
        ],
      },
    ],
    tips: [
      "A bad row never blocks the others: every row is reported on its own.",
      "Only active batches take enrolments. Reopen a completed batch first. A learner can have one active enrolment per course.",
      "Staff tied to one branch can enrol only into their own branch's batches (and batches with no branch), and only learners of their own branch.",
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
  "engage/support": {
    summary: "Help requests that learners write from the Help page of the student portal. Read them, reply by email, assign them and mark them resolved.",
    whoUses: "Support staff and administrators.",
    tasks: [
      {
        title: "Answer a request",
        steps: [
          "Choose a request in the list. Use the tabs to switch between **Open**, **In progress** and **Resolved**.",
          "Write your answer under **Reply** and select **Send reply**. The learner is emailed and also sees the reply on their Help page.",
          "Replying to an open request moves it to **In progress** and assigns it to you.",
          "When the issue is dealt with, select **Mark resolved**. Select **Reopen** if the learner writes again.",
        ],
      },
      { title: "Take or hand back a request", steps: ["Select **Assign to me** to claim a request, or **Unassign me** to return it to the queue."] },
    ],
    tips: [
      "Never ask a learner for a password or payment details.",
      "Messages are personal data. Share them only with colleagues who need them.",
      "Roles that can read requests but not write see them without the reply box.",
    ],
    related: ["users/learners", "marketing/leads"],
  },

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
      "Bulk book enquiries from the website arrive here automatically with the book, quantity and delivery address. You can also add a lead by hand.",
      "Lead details are personal data. Only export what you need.",
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
          "Select **Update password**. Your other signed-in devices are signed out.",
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
    tasks: [{ title: "Add or pause a branch", steps: ["Enter the branch name, city and manager in the branch form and add it.", "Use **Pause** to stop a branch taking new enrolments, or **Reactivate** to bring it back. Existing learners and history are kept.", "Select **Save changes**."] }],
    tips: ["The manager must be a staff member. Branch-scoped staff only see people and records from their own branch."],
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
    summary: "Categories are the course collections shown on the website, such as Self-study Courses. Each has its own web address, such as /self-study. Every course belongs to one top-level category.",
    whoUses: "Administrators and content editors.",
    tasks: [
      { title: "Add a category", steps: ["Select **Add category** and enter the name and a short description. The description is shown at the top of the collection page.", "Leave **URL name** blank to create it from the name, or enter your own.", "Choose **Draft** to prepare it quietly, or **Published** to show it on the website."] },
      { title: "Reorder or hide a category", steps: ["Use the up and down arrows to change the order shown on the website.", "Use the eye button to hide a category without deleting it."] },
      { title: "Delete a category", steps: ["Select the bin button and confirm.", "A category that still has sub-categories or courses cannot be deleted. Archive or move those first, or hide the category instead."] },
    ],
    tips: ["Changing a URL name breaks old links and bookmarks. Plan a redirect when you change one.", "Some names are reserved for fixed pages, such as books, contact and terms.", "Sub-categories group topics inside a collection; courses are assigned to the top-level category."],
    related: ["products/courses", "website/site-settings"],
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

  "website/site-settings": {
    summary: "Contact details, social links, official links and the figures shown across the public website.",
    whoUses: "Content editors and administrators.",
    tasks: [
      {
        title: "Change the contact details",
        steps: [
          "Edit the email, phone, address or map link under **Contact details**.",
          "The **dial link** is the phone number in international form, for example +919528006565.",
          "Select **Save settings**. The website shows the new details immediately.",
        ],
      },
      {
        title: "Update the home page figures",
        steps: [
          "Change **Learners reported by IBMV** or the hero statistics, or add and remove items.",
          "Select **Save settings**. If a field is not accepted, the message appears under it.",
        ],
      },
    ],
    tips: [
      "Links must start with https://. Anything else is rejected.",
      "The figures are numbers reported by IBMV, not live counts. Keep the wording honest.",
    ],
    related: ["website/legal-pages", "settings/categories", "products/courses"],
  },
  "website/books": {
    summary: "Publications listed on the website Books page, with the shops where each can be bought.",
    whoUses: "Publications and content staff.",
    tips: [
      "Add one link per shop. Each link needs the shop name, a format (Print or Digital) and an https:// address.",
      "Only **Published** books appear on the website. Visitors can ask for bulk copies of a published book; those requests arrive under **Leads**.",
    ],
    related: ["marketing/leads", "website/magazines"],
  },
  "website/people": {
    summary: "The Advisory Board and Our Team pages: names, roles and short biographies.",
    whoUses: "Content editors and administrators.",
    tips: [
      "Get each person's agreement before publishing their name, photo or biography.",
      "Choose **Advisory Board** or **Team** to decide which website page the person appears on.",
    ],
    related: ["website/site-settings"],
  },
  "website/magazines": {
    summary: "E-magazine issues listed on the website. Until an issue is published the page explains that an approved archive is awaited.",
    whoUses: "Publications and content staff.",
    tips: ["Only publish issues IBMV has approved for the website.", "Use an https:// address for the cover and the issue file."],
    related: ["website/books"],
  },
  "website/videos": {
    summary: "The introduction videos shown on the website home page.",
    whoUses: "Content editors.",
    tips: [
      "Paste a YouTube link or the 11-character video id. Other websites are rejected.",
      "Visitors load the player only when they select a video.",
    ],
    related: ["marketing/testimonials", "website/site-settings"],
  },
  "website/legal-pages": {
    summary: "The Terms and Privacy text shown on the website, kept as numbered versions.",
    whoUses: "Administrators. Content editors can prepare drafts.",
    tasks: [
      {
        title: "Publish a new version",
        steps: [
          "Select **\u22ef** on the current version and choose **Duplicate** to start a new draft, or add a new one.",
          "Edit the text while it is a **Draft** and save.",
          "An administrator sets the **Status** to **Published**. The previous version is archived and the website shows the new text.",
        ],
      },
    ],
    tips: [
      "Published text cannot be edited. Create a new version instead, so earlier wording stays on record.",
      "Only administrators can publish legal text, and IBMV should approve the wording first.",
    ],
    related: ["website/site-settings"],
  },
};
