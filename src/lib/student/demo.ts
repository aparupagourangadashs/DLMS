export const studentNav = [
  { slug: "announcements", label: "Announcements" },
  { slug: "calendar", label: "Calendar" },
  { slug: "certificates", label: "Certificates" },
  { slug: "communities", label: "Communities" },
  { slug: "exams", label: "Exams" },
  { slug: "help", label: "Help" },
  { slug: "", label: "Home" },
  { slug: "memberships", label: "Memberships" },
  { slug: "my-learning", label: "My Learning" },
  { slug: "my-purchases", label: "My Purchases" },
  { slug: "refer-and-earn", label: "Refer & Earn" },
  { slug: "settings/profile", label: "Settings" },
] as const;

export function studentHref(slug: string) {
  return slug ? `/student/${slug}` : "/student";
}

export type Course = {
  slug: string;
  title: string;
  stream: "Foundations" | "Practice";
  color: "teal" | "violet" | "sky";
  description: string;
  completed: number;
  lessons: { title: string; minutes: number; paragraphs: string[] }[];
};

export const courses: Course[] = [
  {
    slug: "study-foundations", title: "Foundations of Thoughtful Study", stream: "Foundations", color: "teal",
    description: "Create a steady rhythm for reading, reflection and meaningful questions.", completed: 1,
    lessons: [
      { title: "Preparing to learn", minutes: 8, paragraphs: ["A thoughtful study session begins with a clear intention. Choose a quiet place, set aside distractions and decide what you would like to understand.", "Keep a notebook nearby. Write down questions as they arise rather than rushing to an answer. This original sample lesson demonstrates the reading experience; it is not published course material."] },
      { title: "Reading with attention", minutes: 12, paragraphs: ["Read a short passage slowly. Notice the main idea, the context and the questions it raises. Summarise the idea in your own words before moving on.", "Reflection prompt: what changed between your first impression and a second careful reading? This preview does not record an answer or change course progress."] },
      { title: "Building a study routine", minutes: 10, paragraphs: ["Choose a sustainable time for study and return to it regularly. A small, consistent practice can be easier to maintain than an ambitious but irregular schedule.", "At the end of a session, record one insight and one question for next time. Completion rules will be confirmed before progress tracking is connected."] },
    ],
  },
  {
    slug: "reflective-reading", title: "Reflective Reading Workshop", stream: "Practice", color: "violet",
    description: "Practice attentive reading and organise your personal study notes.", completed: 0,
    lessons: [
      { title: "Observe before interpreting", minutes: 10, paragraphs: ["Separate what a passage says from the interpretation you bring to it. First list the words or ideas that stand out, then explore their relationships.", "This is original demonstration content, not a recording or excerpt from an existing course."] },
      { title: "Organising your notes", minutes: 15, paragraphs: ["Group notes into observations, questions and reflections. This makes it easier to revisit your thinking and discuss it respectfully with a teacher.", "No personal notes are collected in this preview."] },
    ],
  },
  {
    slug: "learning-together", title: "Learning Together", stream: "Foundations", color: "sky",
    description: "Explore respectful discussion and collaborative learning habits.", completed: 2,
    lessons: [
      { title: "Listening with care", minutes: 9, paragraphs: ["Allow another person to finish their thought before responding. Restate what you understood and invite clarification.", "The progress shown in the portal is synthetic review data, not a learner record."] },
      { title: "Asking useful questions", minutes: 11, paragraphs: ["A useful question invites explanation rather than assuming an answer. Ask about context, meaning and application with patience.", "Thank you for reviewing this sample learning experience. No credential is earned by opening these pages."] },
    ],
  },
];

export function progress(course: Course) {
  return Math.round((course.completed / course.lessons.length) * 100);
}

export const initialStudentProfile: Record<string, string> = {
  name: "Demo Learner", username: "demo-learner", email: "learner@example.com",
};

export const profileChecklist = [
  { key: "name", label: "Student name" }, { key: "username", label: "Username" },
  { key: "email", label: "Email" }, { key: "mobile", label: "Mobile number" },
  { key: "city", label: "City" }, { key: "address", label: "Residential address" },
] as const;

export function profileCompletion(values: Record<string, string>) {
  const completed = profileChecklist.filter(({ key }) => values[key]?.trim()).length;
  return { completed, total: profileChecklist.length, percent: Math.round(completed / profileChecklist.length * 100) };
}

export const courseBanners = [
  {
    title: "Bhakti Vedanta · Module 3", image: "/student-course-launch.jpg", width: 1920, height: 574,
    alt: "Bhakti Vedanta Module 3. 2 November 2026 to 12 May 2027, 7–9 PM IST, Monday–Thursday.",
    description: "2 Nov 2026 – 12 May 2027 · 7–9 PM IST · Monday–Thursday",
    href: "https://www.ibmedu.org/course-details/BhaktiVedantaModule-3-115238", action: "View course on IBMV",
  },
  {
    title: "Bhakti Shastri (English)", image: "/student-bhakti-shastri.jpg", width: 1280, height: 720,
    alt: "Bhakti Shastri (English) course artwork depicting Krishna teaching Arjuna.",
    description: "Explore Bhakti Shastri study opportunities through the official IBMV website.",
    href: "https://www.ibmedu.org/", action: "Browse IBMV courses",
  },
];

export function studentToday(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export const demoDate = "2026-10-26";
export const sessions = [
  { id: "s1", date: demoDate, time: "18:00", title: "Study foundations: guided discussion", course: "study-foundations", duration: 45 },
  { id: "s2", date: "2026-10-28", time: "19:00", title: "Reflective reading circle", course: "reflective-reading", duration: 60 },
  { id: "s3", date: "2026-11-02", time: "18:00", title: "Questions and reflections", course: "study-foundations", duration: 45 },
];

export const announcements = [
  { id: "a1", title: "Prepare for the study circle", category: "Learning", priority: "Important", date: "26 Oct 2026, 09:00 IST", body: "Before the sample study circle, review the reading preview and bring one question for discussion. This is a fictional announcement for interface review.", unread: true },
  { id: "a2", title: "Your learning space is ready", category: "Welcome", priority: "General", date: "24 Oct 2026, 10:00 IST", body: "Explore the sample courses, calendar and community guidelines. Everything in this student portal is demonstration data; no live enrollment or message delivery is connected.", unread: true },
  { id: "a3", title: "A reminder about respectful discussion", category: "Community", priority: "General", date: "22 Oct 2026, 16:00 IST", body: "Listen patiently, protect personal information and keep questions related to the topic. Community posts shown here are original fictional examples.", unread: false },
];

export type CalendarView = "day" | "week" | "month";

export function calendarDays(value: string, view: CalendarView) {
  const date = new Date(`${value}T00:00:00Z`);
  if (view === "month") date.setUTCDate(1);
  if (view !== "day") date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return Array.from({ length: view === "month" ? 42 : view === "week" ? 7 : 1 }, (_, i) => {
    const day = new Date(date);
    day.setUTCDate(day.getUTCDate() + i);
    return day.toISOString().slice(0, 10);
  });
}

export function shiftCalendarDate(value: string, view: CalendarView, step: number) {
  const date = new Date(`${value}T00:00:00Z`);
  if (view === "month") {
    const originalDay = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + step);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(originalDay, lastDay));
  } else date.setUTCDate(date.getUTCDate() + step * (view === "week" ? 7 : 1));
  return date.toISOString().slice(0, 10);
}

export function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
