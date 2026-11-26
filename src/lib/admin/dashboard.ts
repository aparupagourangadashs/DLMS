export type AttendanceDay = { date: string; percent: number };

/** Attendance over the last seven IST days, set against the seven days before. */
export type AttendanceSummary = {
    /** Present learners as a share of enrolled learners, over sessions whose attendance was marked. Null when there were none. */
    percent: number | null;
    previousPercent: number | null;
    /** One entry per day that had marked attendance, oldest first. */
    days: AttendanceDay[];
};

/** Eight weekly buckets, oldest first; each starts on a Monday (IST). */
export type EnrolmentSeries = { weekStarts: string[]; signups: number[]; enrolments: number[] };

/** The parts a staff member may not read are null. */
export type DashboardOverview = { today: string; attendance: AttendanceSummary | null; series: EnrolmentSeries | null };
