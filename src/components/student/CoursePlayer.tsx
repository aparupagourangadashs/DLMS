"use client";

import { Markdown } from "@/components/Markdown";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ApiError, apiClient } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import type { CourseOutline, CourseProgress, LessonDetail, LessonKind } from "@/lib/student/learning-types";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Circle, CircleCheck, CirclePlay, Clock3, ExternalLink, FileText, Link2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { StudentEmpty, StudentHeading, StudentPanel } from "./StudentUi";

const kindIcon = { Text: FileText, Video: CirclePlay, Link: Link2 } satisfies Record<LessonKind, unknown>;

const lessonTextClass =
    "text-base leading-loose [&_h2]:mt-6 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mt-4 [&_h4]:font-semibold [&_li]:mt-1 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&>*:first-child]:mt-0";

function LessonBody({ lesson }: { lesson: LessonDetail }) {
    if (lesson.type === "Video") {
        return lesson.url ? (
            <div className="space-y-3">
                <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
                    <iframe
                        src={lesson.url}
                        title={lesson.title}
                        className="size-full"
                        loading="lazy"
                        allow="fullscreen; picture-in-picture; encrypted-media"
                        referrerPolicy="strict-origin-when-cross-origin"
                        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                    />
                </div>
                <p className="text-xs text-muted">Watching does not complete the lesson. Mark it complete when you are done.</p>
            </div>
        ) : (
            <p role="alert" className="text-sm text-danger">This video could not be loaded. Please tell your teacher.</p>
        );
    }
    if (lesson.type === "Link") {
        let host = "";
        try {
            host = new URL(lesson.url).hostname;
        } catch {
            host = "";
        }
        return (
            <div className="space-y-3 rounded-xl border border-border bg-accent-soft/40 p-4">
                <p className="text-sm">This lesson is on another website{host ? ` (${host})` : ""}. It opens in a new tab.</p>
                {lesson.url ? (
                    <a href={lesson.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:brightness-110">
                        Open the lesson
                        <ExternalLink className="size-4" aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                    </a>
                ) : null}
            </div>
        );
    }
    return <div className={lessonTextClass}><Markdown value={lesson.body} /></div>;
}

/** The enrolled learner's course: modules and lessons in order, with completion saved per lesson. */
export function CoursePlayer({ initial }: { initial: CourseOutline }) {
    const [outline, setOutline] = useState(initial);
    const [selectedId, setSelectedId] = useState(initial.resumeLessonId);
    const [loaded, setLoaded] = useState<{ id: string | null; lesson: LessonDetail | null; error: string }>({ id: null, lesson: null, error: "" });
    const [completing, setCompleting] = useState(false);
    const heading = useRef<HTMLHeadingElement>(null);

    const flat = useMemo(() => outline.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleName: m.name }))), [outline]);
    const index = flat.findIndex((l) => l.id === selectedId);
    const current = index >= 0 ? flat[index] : null;
    const previous = index > 0 ? flat[index - 1] : null;
    const next = index >= 0 && index < flat.length - 1 ? flat[index + 1] : null;

    useEffect(() => {
        if (!selectedId) return;
        const controller = new AbortController();
        apiClient
            .get<LessonDetail>(`/api/student/lessons/${selectedId}`, undefined, { signal: controller.signal })
            .then((result) => setLoaded({ id: selectedId, lesson: result.data, error: "" }))
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                setLoaded({ id: selectedId, lesson: null, error: error instanceof ApiError ? error.message : "Could not load this lesson." });
            });
        return () => controller.abort();
    }, [selectedId]);

    const lesson = loaded.id === selectedId ? loaded.lesson : null;
    const loadError = loaded.id === selectedId ? loaded.error : "";
    const loading = selectedId !== null && loaded.id !== selectedId;

    const open = (id: string) => {
        setSelectedId(id);
        requestAnimationFrame(() => heading.current?.focus());
    };

    async function complete() {
        if (!current) return;
        setCompleting(true);
        try {
            const result = await apiClient.post<CourseProgress & { lessonId: string }>(`/api/student/lessons/${current.id}/complete`);
            const wasComplete = outline.status === "Completed";
            setOutline((o) => ({
                ...o,
                progressPercent: result.data.progressPercent,
                completedLessons: result.data.completedLessons,
                totalLessons: result.data.totalLessons,
                status: result.data.status,
                modules: o.modules.map((m) => ({ ...m, lessons: m.lessons.map((l) => (l.id === current.id ? { ...l, completed: true } : l)) })),
            }));
            if (result.data.status === "Completed" && !wasComplete) toast.success("Course completed", { description: outline.title });
            else toast.success("Lesson completed");
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Could not save your progress.");
        } finally {
            setCompleting(false);
        }
    }

    return (
        <>
            <Link href="/student/my-learning" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent">
                <ArrowLeft className="size-4" aria-hidden="true" />
                My Learning
            </Link>
            <StudentHeading title={outline.title} description={outline.batch ? `Batch: ${outline.batch}` : "Study at your own pace. Mark each lesson complete when you finish it."} icon={BookOpen} />
            <StudentPanel className="mb-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                        {outline.completedLessons} of {outline.totalLessons} {outline.totalLessons === 1 ? "lesson" : "lessons"} completed
                    </p>
                    <div className="flex items-center gap-2">
                        {outline.status === "Completed" ? <Badge tone="success">Completed</Badge> : null}
                        <strong className="text-accent">{outline.progressPercent}%</strong>
                    </div>
                </div>
                <progress aria-label="Course progress" value={outline.progressPercent} max={100} className="mt-3 h-2.5 w-full accent-teal-600" />
            </StudentPanel>

            {flat.length === 0 ? (
                <StudentEmpty title="No lessons yet" description="Your teachers have not added lessons to this course yet. Check the announcements for updates." icon={BookOpen} />
            ) : (
                <div className="grid items-start gap-5 xl:grid-cols-[18rem_1fr]">
                    <StudentPanel title="Course contents" className="order-2 xl:order-1">
                        <div className="space-y-5">
                            {outline.modules.map((module) => (
                                <section key={module.id} aria-label={module.name}>
                                    <h3 className="text-sm font-semibold">{module.name}</h3>
                                    {module.description ? <p className="mt-1 text-xs text-muted">{module.description}</p> : null}
                                    <ol className="mt-2 space-y-1.5">
                                        {module.lessons.map((item) => {
                                            const Icon = kindIcon[item.type];
                                            return (
                                                <li key={item.id}>
                                                    <button
                                                        type="button"
                                                        aria-current={item.id === selectedId ? "step" : undefined}
                                                        onClick={() => open(item.id)}
                                                        className={cn("flex w-full items-start gap-2 rounded-xl p-2.5 text-left text-sm", item.id === selectedId ? "bg-accent text-accent-fg" : "bg-accent-soft hover:bg-accent/15")}
                                                    >
                                                        {item.completed ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Circle className="mt-0.5 size-4 shrink-0 opacity-60" aria-hidden="true" />}
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block">{item.title}</span>
                                                            <span className="mt-0.5 flex items-center gap-2 text-xs opacity-80">
                                                                <Icon className="size-3.5" aria-hidden="true" />
                                                                {item.type}
                                                                {item.minutes ? <span className="inline-flex items-center gap-1"><Clock3 className="size-3" aria-hidden="true" />{item.minutes} min</span> : null}
                                                                <span className="sr-only">{item.completed ? ", completed" : ", not completed"}</span>
                                                            </span>
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </section>
                            ))}
                        </div>
                    </StudentPanel>

                    <StudentPanel className="order-1 xl:order-2">
                        {current ? (
                            <>
                                <p className="text-xs font-semibold tracking-wider text-accent uppercase">
                                    {current.moduleName} · Lesson {index + 1} of {flat.length}
                                </p>
                                <h2 ref={heading} tabIndex={-1} className="mt-3 font-serif text-3xl font-semibold" aria-live="polite">
                                    {current.title}
                                </h2>
                                <div className="mt-5" aria-busy={loading}>
                                    {loadError ? <p role="alert" className="text-sm text-danger">{loadError}</p> : null}
                                    {loading ? <p role="status" className="text-sm text-muted">Loading the lesson…</p> : null}
                                    {lesson ? <LessonBody lesson={lesson} /> : null}
                                </div>
                                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                                    <Button disabled={!previous} onClick={() => previous && open(previous.id)}>
                                        <ChevronLeft className="size-4" aria-hidden="true" />
                                        Previous
                                    </Button>
                                    {current.completed ? (
                                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
                                            <CircleCheck className="size-5" aria-hidden="true" />
                                            Lesson completed
                                        </span>
                                    ) : (
                                        <Button variant="success" disabled={completing || !lesson} onClick={complete}>
                                            {completing ? "Saving…" : "Mark lesson complete"}
                                        </Button>
                                    )}
                                    <Button variant="soft-success" disabled={!next} onClick={() => next && open(next.id)}>
                                        Next lesson
                                        <ChevronRight className="size-4" aria-hidden="true" />
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <StudentEmpty title="Choose a lesson" description="Pick a lesson from the contents to begin." icon={BookOpen} />
                        )}
                    </StudentPanel>
                </div>
            )}
        </>
    );
}
