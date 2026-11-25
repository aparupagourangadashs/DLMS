/** What the student portal shows about a learner's own learning. Plain data, so client components can import it. */

export type StudentCourse = {
    enrolmentId: string;
    slug: string;
    title: string;
    collection: string;
    batch: string;
    status: "Active" | "Completed" | "Expired";
    enrolledAt: string;
    accessStartsAt: string | null;
    accessEndsAt: string | null;
    progressPercent: number;
    /** Lessons in the course's published modules, and how many of them this learner has completed. */
    lessons: number;
    completedLessons: number;
    officialUrl: string;
};

export type StudentSession = {
    id: string;
    title: string;
    course: string;
    batch: string;
    startsAt: string;
    endsAt: string;
    status: "Scheduled" | "Completed" | "Cancelled";
    cancelReason: string;
    instructor: string;
    topics: string;
    /** Only present from 15 minutes before the start until the end, and never for a cancelled session. */
    joinUrl: string | null;
};

export type StudentHoliday = { date: string; reason: string };

export type StudentSessionsData = { sessions: StudentSession[]; holidays: StudentHoliday[] };

export type StudentAnnouncement = {
    id: string;
    title: string;
    body: string;
    urgency: "High" | "Medium" | "Low";
    tags: string[];
    publishedAt: string;
    read: boolean;
};

export type HomeSummary = {
    /** Today's date in IST. */
    today: string;
    todaysSessions: StudentSession[];
    todaysHolidays: StudentHoliday[];
    continueLearning: StudentCourse[];
    activeCourses: number;
    completedCourses: number;
    sessionsThisWeek: number;
    unreadAnnouncements: number;
    latestAnnouncements: StudentAnnouncement[];
};

export type LessonKind = "Text" | "Video" | "Link";

export type CourseLesson = { id: string; title: string; type: LessonKind; minutes: number | null; completed: boolean };

export type CourseModuleOutline = { id: string; name: string; description: string; lessons: CourseLesson[] };

export type CourseProgress = {
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    status: "Active" | "Completed";
};

/** What the course player shows before any lesson is opened. */
export type CourseOutline = CourseProgress & {
    slug: string;
    title: string;
    batch: string;
    modules: CourseModuleOutline[];
    /** The first lesson not yet completed, or the last one when everything is done. */
    resumeLessonId: string | null;
};

export type LessonDetail = {
    id: string;
    title: string;
    type: LessonKind;
    minutes: number | null;
    moduleName: string;
    /** Markdown for a text lesson. */
    body: string;
    /** The YouTube embed address for a video lesson, or the other website's address for a link lesson. */
    url: string;
    completed: boolean;
};
