import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/format";
import { toIst } from "@/lib/ist";
import type { StudentSession } from "@/lib/student/learning-types";
import { CirclePlay, Clock3, ExternalLink } from "lucide-react";

/** IST date, start time and length of a session, from its stored instants. */
export function sessionWhen(session: Pick<StudentSession, "startsAt" | "endsAt">) {
    const start = new Date(session.startsAt);
    const { date, time } = toIst(start);
    return { date, time, minutes: Math.round((new Date(session.endsAt).getTime() - start.getTime()) / 60_000) };
}

/** One class in the learner's day, week or month. The join link is only present when the server says the class can be joined. */
export function StudentSessionItem({ session, showDate }: { session: StudentSession; showDate?: boolean }) {
    const when = sessionWhen(session);
    const cancelled = session.status === "Cancelled";
    const recordingLabel = (title: string, index: number) => (title !== session.title ? `Watch ${title}` : session.recordings.length > 1 ? `Watch recording ${index + 1}` : "Watch recording");
    return (
        <li className={cn("rounded-xl border p-4", cancelled ? "border-red-500/25 bg-red-500/5" : "border-teal-500/20 bg-teal-500/5")}>
            {showDate ? <p className="text-xs font-semibold text-accent">{formatDate(when.date)}</p> : null}
            <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
                <h3 className={cn("font-semibold", cancelled && "line-through")}>{session.title}</h3>
                {session.status !== "Scheduled" ? <Badge tone={cancelled ? "danger" : "success"}>{session.status}</Badge> : null}
            </div>
            <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                <Clock3 className="size-4 shrink-0" aria-hidden="true" />
                {formatTime(`${when.date}T${when.time}`)} IST · {when.minutes} minutes
            </p>
            <p className="mt-1 text-xs text-muted">
                {session.course} · {session.batch}
                {session.instructor ? ` · ${session.instructor}` : ""}
            </p>
            {cancelled && session.cancelReason ? <p className="mt-2 text-sm text-danger">{session.cancelReason}</p> : null}
            {!cancelled && session.topics ? <p className="mt-2 text-sm whitespace-pre-wrap">{session.topics}</p> : null}
            {session.joinUrl ? (
                <a
                    href={session.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:brightness-110"
                >
                    Join class
                    <ExternalLink className="size-4" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                </a>
            ) : null}
            {session.recordings.length > 0 ? (
                <ul aria-label="Recordings" className="mt-3 flex flex-wrap gap-2">
                    {session.recordings.map((recording, index) => (
                        <li key={recording.id}>
                            <a
                                href={recording.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/40 px-4 text-sm font-semibold text-accent hover:bg-accent/5"
                            >
                                <CirclePlay className="size-4" aria-hidden="true" />
                                {recordingLabel(recording.title, index)}
                                <ExternalLink className="size-4" aria-hidden="true" />
                                <span className="sr-only">(opens in a new tab)</span>
                            </a>
                        </li>
                    ))}
                </ul>
            ) : null}
        </li>
    );
}
