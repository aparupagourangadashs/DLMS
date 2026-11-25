"use client";

import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { palette } from "@/lib/colors";
import { formatDate } from "@/lib/format";
import { courseBanners, courses, formatDay, progress, type Course } from "@/lib/student/demo";
import type { HomeSummary, StudentCourse } from "@/lib/student/learning-types";
import { istDate, istDateTime } from "@/lib/student/when";
import { ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, GraduationCap, PartyPopper, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StudentAvatar } from "./StudentAvatar";
import { StudentSessionItem } from "./StudentSessionItem";
import { StudentEmpty, StudentHeading, StudentPanel } from "./StudentUi";
import { useStudentSessions } from "./use-student-sessions";

export function CourseCard({ course }: { course: Course }) {
  const percent = progress(course);
  return (
    <article className="student-course-card flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div data-course-color={course.color} className="student-course-cover flex min-h-36 items-center justify-between gap-3 p-5">
        <span className="student-course-symbol"><BookOpen className="student-duotone-icon size-9" strokeWidth={1.6} aria-hidden="true" /></span><Badge tone={percent === 100 ? "success" : "neutral"}>{percent === 100 ? "Completed" : "Active learning"}</Badge>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">{course.stream} · Sample course</p>
        <h3 className="mt-2 font-serif text-xl font-semibold">{course.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{course.description}</p>
        <div className="mt-5 flex items-center justify-between gap-2 text-xs text-muted"><span>{course.completed} / {course.lessons.length} lessons</span><span>{percent}%</span></div>
        <progress aria-label={`${course.title} sample progress`} value={percent} max={100} className="mt-2 h-2 w-full overflow-hidden rounded-full accent-teal-600" />
        <Link href={`/student/learning/${course.slug}`} className="mt-5 flex min-h-11 items-center justify-between rounded-xl bg-accent-soft px-4 text-sm font-semibold text-accent hover:bg-accent/15">{percent === 100 ? "Review course" : "Open course preview"}<ArrowRight className="size-4" aria-hidden="true" /></Link>
      </div>
    </article>
  );
}

const coverColors = ["teal", "violet", "sky"] as const;

/** One of the learner's own enrolments, linking to the course player when it has lessons. */
export function EnrolledCourseCard({ course, index }: { course: StudentCourse; index: number }) {
  const tone = course.status === "Active" ? "success" : course.status === "Completed" ? "info" : "neutral";
  const canOpen = course.status !== "Expired" && course.lessons > 0;
  const action = course.status === "Completed" ? "Review course" : course.completedLessons > 0 ? "Continue course" : "Start course";
  return (
    <article className="student-course-card flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div data-course-color={coverColors[index % coverColors.length]} className="student-course-cover flex min-h-28 items-center justify-between gap-3 p-5">
        <span className="student-course-symbol"><BookOpen className="student-duotone-icon size-9" strokeWidth={1.6} aria-hidden="true" /></span><Badge tone={tone}>{course.status}</Badge>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">{course.collection}</p>
        <h3 className="mt-2 font-serif text-xl font-semibold">{course.title}</h3>
        <dl className="mt-3 flex-1 space-y-1 text-sm text-muted">
          {course.batch ? <div className="flex gap-2"><dt className="font-medium text-foreground">Batch</dt><dd className="min-w-0">{course.batch}</dd></div> : null}
          <div className="flex gap-2"><dt className="font-medium text-foreground">Enrolled</dt><dd>{formatDate(istDate(course.enrolledAt))}</dd></div>
          {course.accessEndsAt ? <div className="flex gap-2"><dt className="font-medium text-foreground">{course.status === "Expired" ? "Access ended" : "Access until"}</dt><dd>{formatDate(course.accessEndsAt)}</dd></div> : null}
        </dl>
        <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted"><span>{course.lessons > 0 ? `${course.completedLessons} of ${course.lessons} lessons` : "Progress"}</span><span>{course.progressPercent}%</span></div>
        <progress aria-label={`${course.title} progress`} value={course.progressPercent} max={100} className="mt-2 h-2 w-full overflow-hidden rounded-full accent-teal-600" />
        {canOpen ? <Link href={`/student/learning/${course.slug}`} className="mt-5 flex min-h-11 items-center justify-between rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:brightness-110">{action}<ArrowRight className="size-4" aria-hidden="true" /></Link> : <p className="mt-5 text-xs text-muted">{course.status === "Expired" ? "Your access to this course has ended." : "Lessons appear here once your teachers publish them."}</p>}
        {course.officialUrl ? <a href={course.officialUrl} target="_blank" rel="noopener noreferrer" className={`flex min-h-11 items-center justify-between rounded-xl px-4 text-sm font-semibold text-accent hover:bg-accent/15 ${canOpen ? "mt-2" : "mt-3 bg-accent-soft"}`}>Course details on IBMV<ExternalLink className="size-4" aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span></a> : null}
      </div>
    </article>
  );
}

export type HomeProfile = { name: string; percent: number; completed: number; total: number; missing: string[] };

export function StudentHome({ profile, summary }: { profile: HomeProfile; summary: HomeSummary }) {
  const [featured, setFeatured] = useState(0);
  const live = useStudentSessions(summary.today, summary.today, { sessions: summary.todaysSessions, holidays: summary.todaysHolidays });
  const banner = courseBanners[featured];
  const splitBanner = banner.width / banner.height < courseBanners[0].width / courseBanners[0].height;
  const slideCount = courseBanners.length;
  const todaySessions = live.data?.sessions ?? summary.todaysSessions;
  const todayHolidays = live.data?.holidays ?? summary.todaysHolidays;
  return (
    <>
      <StudentHeading title="Welcome to your learning space" description="A little study, a thoughtful question, a step forward." icon={GraduationCap} />
      <div className="mb-6 grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
        <div className="min-w-0 space-y-5">
          <section aria-label="Latest course launches" aria-roledescription="carousel" className="student-featured rounded-2xl p-5 sm:p-8">
            <p className="relative text-xs font-semibold tracking-wider text-amber-200 uppercase">Featured courses &amp; latest launches · IBMV</p>
            <div className="relative" aria-live="polite" aria-atomic="true">
              <a href={banner.href} target="_blank" rel="noopener noreferrer" aria-label={`${banner.title} — opens on IBMV in a new tab`} className="relative mt-4 block aspect-[1920/574] overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
                {splitBanner ? <>
                  <Image src={banner.image} fill sizes="(min-width: 1280px) 60vw, 100vw" alt="" aria-hidden="true" className="scale-110 object-cover blur-xl" />
                  <span className="student-banner-details absolute inset-y-0 left-0 flex w-[47%] flex-col justify-center gap-1 p-2 sm:gap-2 sm:p-5">
                    <span className="hidden text-[10px] font-semibold tracking-wider text-gold uppercase sm:block">IBMV course</span>
                    <span className="font-serif text-sm leading-tight font-semibold text-white sm:text-2xl">Bhakti Shastri</span>
                    <span className="text-xs font-medium text-gold sm:text-sm">English</span>
                    <span className="hidden text-xs leading-relaxed text-white/90 sm:block">{banner.description}</span>
                  </span>
                  <span className="absolute inset-y-0 right-0 w-[53.15%]"><Image src={banner.image} fill sizes="(min-width: 1280px) 32vw, 54vw" loading="eager" alt={banner.alt} className="object-contain object-right" /></span>
                </> : <Image src={banner.image} fill sizes="(min-width: 1280px) 60vw, 100vw" loading="eager" alt={banner.alt} className="object-cover object-top" />}
              </a>
            </div>
            <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3">
              <a href={banner.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold px-4 text-sm font-semibold text-foreground hover:bg-gold-soft">{banner.action}<ArrowRight className="size-4" aria-hidden="true" /></a>
              <div className="flex items-center gap-2">
                <Button aria-label="Previous featured course" onClick={() => setFeatured((featured + slideCount - 1) % slideCount)}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
                <span className="text-xs text-white/90">{featured + 1} / {slideCount}</span>
                <Button aria-label="Next featured course" onClick={() => setFeatured((featured + 1) % slideCount)}><ChevronRight className="size-4" aria-hidden="true" /></Button>
              </div>
            </div>
            <div className="relative mt-4 flex flex-wrap gap-1" role="group" aria-label="Choose a course launch">
              {Array.from({ length: slideCount }, (_, index) => <button key={index} type="button" aria-label={`Show course launch ${index + 1}`} aria-pressed={featured === index} onClick={() => setFeatured(index)} className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-gold"><span className={cn("h-2 rounded-full transition-all", featured === index ? "w-6 bg-gold" : "w-2 bg-white/50")} aria-hidden="true" /></button>)}
            </div>
          </section>
          <StudentPanel title="Today's Classes">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">{formatDay(summary.today)} · Asia/Kolkata (IST)</p><Link href="/student/calendar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent"><CalendarDays className="size-4" aria-hidden="true" />Calendar</Link></div>
            {todayHolidays.map((holiday) => <p key={holiday.reason} className="mb-4 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold-soft px-3 py-2 text-sm"><PartyPopper className="size-4 shrink-0 text-gold-strong" aria-hidden="true" />Holiday today: {holiday.reason}</p>)}
            {todaySessions.length ? <ul className="space-y-3">{todaySessions.map((session) => <StudentSessionItem key={session.id} session={session} />)}</ul> : <StudentEmpty title="No classes today" description="Your day has room for independent study. Open the calendar to see what is coming up." icon={CalendarDays} />}
            <p className="mt-3 text-xs text-muted">Join links appear 15 minutes before a class starts.</p>
            {live.status === "error" ? <p role="status" className="mt-2 text-xs text-muted">Could not refresh just now. This page will try again shortly.</p> : null}
          </StudentPanel>
        </div>
        <div className="min-w-0 space-y-5">
          <StudentPanel title="Your profile">
            <div className="mb-4 flex items-center gap-3"><StudentAvatar /><div><p className="font-semibold">{profile.name}</p><p className="text-xs text-muted">Make your learning space yours</p></div></div>
            <div className="flex items-end justify-between gap-2"><span className="text-sm font-medium">Profile completion</span><strong className="text-2xl text-accent">{profile.percent}%</strong></div>
            <progress aria-label="Profile completion" value={profile.percent} max={100} className="my-3 h-2.5 w-full accent-accent" />
            <p className="text-xs leading-relaxed text-muted">{profile.completed} of {profile.total} profile details provided. This is a guide to help IBMV reach you, not an enrolment requirement.</p>
            <ul className="my-4 space-y-2">{profile.missing.map((label) => <li key={label} className="flex items-center gap-2 text-xs text-muted"><span className="size-1.5 rounded-full bg-gold-strong" aria-hidden="true" />Add {label.toLowerCase()}</li>)}</ul>
            <LinkButton href="/student/settings/profile" variant="soft-info">{profile.percent === 100 ? "Review your profile" : "Complete your profile"}<ArrowRight className="size-4" aria-hidden="true" /></LinkButton>
          </StudentPanel>
          <StudentPanel title="At a glance">
            <p className="mb-3 text-xs text-muted">{summary.unreadAnnouncements ? `${summary.unreadAnnouncements} unread ${summary.unreadAnnouncements === 1 ? "announcement" : "announcements"}` : "You are all caught up."}</p>
            {summary.latestAnnouncements.length ? <ul className="space-y-3">{summary.latestAnnouncements.map((item) => <li key={item.id}><Link href="/student/announcements" className="flex min-h-11 items-start gap-3 rounded-xl bg-accent-soft/60 p-3 hover:bg-accent-soft"><Bell className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" /><span className="min-w-0"><span className="block text-sm font-medium">{item.title}</span><span className="mt-1 block text-xs text-muted">{item.tags[0] ?? "General"} · {istDateTime(item.publishedAt)}</span></span></Link></li>)}</ul> : <p className="text-sm text-muted">No announcements yet.</p>}
            <Link href="/student/announcements" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent">View all announcements</Link>
          </StudentPanel>
        </div>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[{ label: "Active courses", value: summary.activeCourses, Icon: BookOpen, color: "teal" }, { label: "Completed courses", value: summary.completedCourses, Icon: CheckCircle2, color: "violet" }, { label: "Classes this week", value: summary.sessionsThisWeek, Icon: CalendarDays, color: "sky" }].map(({ label, value, Icon, color }) => (
          <div key={label} data-stat-color={color} className="student-summary-card flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"><span className={cn("rounded-xl p-3", color === "teal" ? palette.teal.solid : color === "violet" ? palette.violet.solid : palette.sky.solid)}><Icon className="student-duotone-icon size-5" aria-hidden="true" /></span><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted">{label}</p></div></div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-2xl font-semibold">Continue learning</h2><Link href="/student/my-learning" className="text-sm font-semibold text-accent hover:underline">See all courses</Link></div>
      <div className="grid gap-5 md:grid-cols-2">{summary.continueLearning.map((course, index) => <EnrolledCourseCard key={course.enrolmentId} course={course} index={index} />)}</div>
      {summary.continueLearning.length === 0 ? <><StudentEmpty title="No active courses yet" description="When IBMV enrols you in a batch, your course appears here together with its classes and announcements." icon={BookOpen} /><p className="mt-3 text-center text-sm text-muted">Looking for a course? <Link href="/website" className="font-semibold text-accent hover:underline">Explore the IBMV courses</Link>.</p></> : null}
    </>
  );
}

const learningTabs = [{ value: "Active", label: "Active Learning", color: "teal" }, { value: "Completed", label: "Completed Learning", color: "violet" }, { value: "Expired", label: "Expired Access", color: "sky" }] as const;

export function MyLearning({ courses: enrolled }: { courses: StudentCourse[] }) {
  const [tab, setTab] = useState<StudentCourse["status"]>("Active");
  const [collection, setCollection] = useState("all");
  const [search, setSearch] = useState("");
  const collections = useMemo(() => [...new Set(enrolled.map((c) => c.collection))].sort(), [enrolled]);
  const filtered = enrolled.filter((c) => c.status === tab && (collection === "all" || c.collection === collection) && `${c.title} ${c.batch}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <>
      <StudentHeading title="My Learning" description="The courses IBMV has enrolled you in, at your pace. Open a course to study its lessons and track your progress." icon={BookOpen} />
      <StudentPanel className="mb-6">
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <Field id="course-search" label="Search your courses"><input id="course-search" className={inputClass} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by course or batch name" /></Field>
          <Field id="course-collection" label="Collection"><Select id="course-collection" value={collection} onValueChange={setCollection} options={[{ value: "all", label: "All collections" }, ...collections.map((name) => ({ value: name, label: name }))]} /></Field>
        </div>
        <Tabs className="flex-wrap" label="Learning status" value={tab} onChange={setTab} items={learningTabs.map((item) => ({ ...item, label: `${item.label} (${enrolled.filter((c) => c.status === item.value).length})` }))} />
      </StudentPanel>
      <p role="status" className="mb-4 text-sm text-muted">{filtered.length} {filtered.length === 1 ? "course" : "courses"} found</p>
      {filtered.length ? <div className="grid gap-5 md:grid-cols-2">{filtered.map((course, index) => <EnrolledCourseCard key={course.enrolmentId} course={course} index={index} />)}</div> : enrolled.length === 0 ? <StudentEmpty title="You are not enrolled in a course yet" description="When IBMV enrols you in a batch, the course appears here together with its classes and announcements." icon={BookOpen} /> : <StudentEmpty title="No matching courses" description="Try a different collection, search term or learning status." icon={Search} />}
      <section aria-labelledby="sample-previews" className="mt-10">
        <h2 id="sample-previews" className="font-serif text-2xl font-semibold">Preview the reading experience</h2>
        <p className="mt-1 mb-4 text-sm text-muted">Original sample courses that show how lessons will read. They are not your enrolments and do not record progress.</p>
        <div className="grid gap-5 md:grid-cols-2">{courses.map((course) => <CourseCard key={course.slug} course={course} />)}</div>
      </section>
    </>
  );
}

export function CourseReader({ course }: { course: Course }) {
  const [selected, setSelected] = useState(Math.min(course.completed, course.lessons.length - 1));
  const lesson = course.lessons[selected];
  return (
    <>
      <Link href="/student/my-learning" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent"><ArrowLeft className="size-4" aria-hidden="true" />My Learning</Link>
      <StudentHeading title={course.title} description="Original sample reading content. Opening lessons does not mark them complete or issue a certificate." icon={BookOpen} />
      <div className="grid items-start gap-5 xl:grid-cols-[15rem_1fr]">
        <StudentPanel title="Course contents">
          <ol className="space-y-2">{course.lessons.map((item, index) => <li key={item.title}><button type="button" aria-current={selected === index ? "step" : undefined} onClick={() => setSelected(index)} className={cn("flex w-full items-start gap-2 rounded-xl p-3 text-left text-sm", selected === index ? "bg-accent text-accent-fg" : "bg-accent-soft hover:bg-accent/15")}><span className="shrink-0 font-semibold">{index + 1}.</span><span>{item.title}<span className="mt-1 block text-xs opacity-80">{item.minutes} min reading</span></span></button></li>)}</ol>
          <p className="mt-4 text-xs leading-relaxed text-muted">Reading preview only. Video, downloads, notes and assessment submissions await confirmed requirements and authorized content.</p>
        </StudentPanel>
        <StudentPanel>
          <p className="text-xs font-semibold tracking-wider text-accent uppercase">Lesson {selected + 1} of {course.lessons.length} · Preview</p>
          <h2 tabIndex={-1} className="mt-3 font-serif text-3xl font-semibold" aria-live="polite">{lesson.title}</h2>
          <div className="mt-5 space-y-5 text-base leading-loose">{lesson.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-5">
            <Button disabled={selected === 0} onClick={() => setSelected(selected - 1)}><ChevronLeft className="size-4" aria-hidden="true" />Previous</Button>
            <Button disabled={selected === course.lessons.length - 1} variant="soft-success" onClick={() => setSelected(selected + 1)}>Next lesson<ChevronRight className="size-4" aria-hidden="true" /></Button>
          </div>
        </StudentPanel>
      </div>
    </>
  );
}
