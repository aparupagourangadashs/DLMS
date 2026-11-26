export type AdminSession = {
    id: string;
    batchId: string;
    batch: string;
    course: string;
    title: string;
    /** IST calendar date (YYYY-MM-DD) and start time (HH:mm). */
    date: string;
    time: string;
    durationMin: number;
    startsAt: string;
    endsAt: string;
    instructor: string;
    link: string;
    status: "Scheduled" | "Completed" | "Cancelled";
    cancelReason: string;
    topics: string;
    enrolled: number;
    attended: number;
    /** Learners whose attendance is recorded, present or absent. Zero until attendance has been taken. */
    marked: number;
};

export type AdminHoliday = { id: string; date: string; reason: string; branch: string };

export type SessionRosterEntry = { userId: string; name: string; email: string; regNo: string; mark: "Present" | "Absent" | "Not marked" };

export type SessionRecordingEntry = { id: string; title: string; url: string; status: "Available" | "Processing" | "Failed" };

export type AdminSessionDetail = AdminSession & { roster: SessionRosterEntry[]; canMarkAttendance: boolean; recordings: SessionRecordingEntry[] };
