"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, GraduationCap, Search } from "lucide-react";
import { announcements, calendarDays, courseBanners, courses, demoDate, formatDay, initialStudentProfile, profileChecklist, profileCompletion, progress, sessions, studentToday, type Course } from "@/lib/student/demo";
import { palette } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { StudentEmpty, StudentHeading, StudentPanel } from "./StudentUi";
import { StudentAvatar } from "./StudentAvatar";

function subscribeToDate(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
}

function todaySnapshot() { return studentToday(new Date()); }
function serverDateSnapshot() { return ""; }

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

export function StudentHome() {
  const [featured, setFeatured] = useState(0);
  const today = useSyncExternalStore(subscribeToDate, todaySnapshot, serverDateSnapshot);
  const banner = courseBanners[featured];
  const splitBanner = banner.width / banner.height < courseBanners[0].width / courseBanners[0].height;
  const slideCount = courseBanners.length;
  const completion = profileCompletion(initialStudentProfile);
  const todaySessions = sessions.filter((session) => session.date === today);
  const weekDays = today ? calendarDays(today, "week") : [];
  return (
    <>
      <StudentHeading title="Welcome to your learning space" description="A little study, a thoughtful question, a step forward. Explore your sample learning journey." icon={GraduationCap} />
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">{today ? formatDay(today) : "Loading today's date"} · Asia/Kolkata (IST)</p><Link href="/student/calendar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent"><CalendarDays className="size-4" aria-hidden="true" />Calendar</Link></div>
        <p className="mb-4 text-xs text-muted">Fictional timetable filtered by today&apos;s date. No live class or meeting service is connected.</p>
        {!today ? <p role="status" className="text-sm text-muted">Loading today&apos;s sample schedule…</p> : todaySessions.length ? <ul className="space-y-3">{todaySessions.map((session) => <li key={session.id} className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4"><p className="font-semibold">{session.title}</p><p className="mt-2 flex items-center gap-2 text-xs text-muted"><Clock3 className="size-4" aria-hidden="true" />{session.time} IST · {session.duration} minutes</p><Link href={`/student/learning/${session.course}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent">View course preview<ArrowRight className="ml-2 size-4" aria-hidden="true" /></Link></li>)}</ul> : <StudentEmpty title="No sample classes today" description="Your day has room for independent study. Browse the calendar for the fictional timetable." icon={CalendarDays} />}
        <p className="mt-3 text-xs text-muted">Sample schedule begins {formatDay(demoDate)}. Use Demo dates in the calendar to explore it.</p>
      </StudentPanel>
      </div>
      <div className="min-w-0 space-y-5">
        <StudentPanel title="Your profile">
          <div className="mb-4 flex items-center gap-3"><StudentAvatar /><div><p className="font-semibold">{initialStudentProfile.name}</p><p className="text-xs text-muted">Make your learning space yours</p></div></div>
          <div className="flex items-end justify-between gap-2"><span className="text-sm font-medium">Profile completion</span><strong className="text-2xl text-accent">{completion.percent}%</strong></div>
          <progress aria-label="Sample profile completion" value={completion.percent} max={100} className="my-3 h-2.5 w-full accent-accent" />
          <p className="text-xs leading-relaxed text-muted">{completion.completed} of {completion.total} demo checklist fields provided. This is an illustrative checklist, not an enrollment requirement.</p>
          <ul className="my-4 space-y-2">{profileChecklist.filter(({ key }) => !initialStudentProfile[key]?.trim()).map(({ key, label }) => <li key={key} className="flex items-center gap-2 text-xs text-muted"><span className="size-1.5 rounded-full bg-gold-strong" aria-hidden="true" />Add {label.toLowerCase()}</li>)}</ul>
          <LinkButton href="/student/settings/profile" variant="soft-info">Complete sample profile<ArrowRight className="size-4" aria-hidden="true" /></LinkButton>
          <p className="mt-3 text-xs leading-relaxed text-muted">Profile edits remain on the profile page only. This card resets to the shared fictional baseline.</p>
        </StudentPanel>
        <StudentPanel title="At a glance">
          <p className="mb-3 text-xs text-muted">Sample learning updates, not live notifications.</p>
          <ul className="space-y-3">{announcements.slice(0, 2).map((item) => <li key={item.id}><Link href="/student/announcements" className="flex min-h-11 items-start gap-3 rounded-xl bg-accent-soft/60 p-3 hover:bg-accent-soft"><Bell className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" /><span className="min-w-0"><span className="block text-sm font-medium">{item.title}</span><span className="mt-1 block text-xs text-muted">{item.category} · {item.date}</span></span></Link></li>)}</ul>
          <Link href="/student/announcements" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent">View all announcements</Link>
        </StudentPanel>
      </div>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[{ label: "Active sample courses", value: courses.filter((c) => progress(c) < 100).length, Icon: BookOpen, color: "teal" }, { label: "Completed sample courses", value: courses.filter((c) => progress(c) === 100).length, Icon: CheckCircle2, color: "violet" }, { label: "Sample sessions this week", value: today ? sessions.filter((session) => weekDays.includes(session.date)).length : "—", Icon: CalendarDays, color: "sky" }].map(({ label, value, Icon, color }) => (
          <div key={label} data-stat-color={color} className="student-summary-card flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"><span className={cn("rounded-xl p-3", color === "teal" ? palette.teal.solid : color === "violet" ? palette.violet.solid : palette.sky.solid)}><Icon className="student-duotone-icon size-5" aria-hidden="true" /></span><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted">{label}</p></div></div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-2xl font-semibold">Continue learning</h2><Link href="/student/my-learning" className="text-sm font-semibold text-accent hover:underline">See all courses</Link></div>
      <div className="grid gap-5 md:grid-cols-2">{courses.filter((c) => progress(c) < 100).map((course) => <CourseCard key={course.slug} course={course} />)}</div>
    </>
  );
}

export function MyLearning() {
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [stream, setStream] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = courses.filter((c) => (tab === "completed" ? progress(c) === 100 : progress(c) < 100) && (stream === "all" || c.stream === stream) && `${c.title} ${c.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <>
      <StudentHeading title="My Learning" description="Your courses, at your pace. Sample progress is read-only until learner tracking is connected." icon={BookOpen} />
      <StudentPanel className="mb-6">
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <Field id="course-search" label="Search your courses"><input id="course-search" className={inputClass} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by course name" /></Field>
          <Field id="course-stream" label="Stream"><Select id="course-stream" value={stream} onValueChange={setStream} options={[{ value: "all", label: "All streams" }, { value: "Foundations", label: "Foundations" }, { value: "Practice", label: "Practice" }]} /></Field>
        </div>
        <Tabs className="flex-wrap" label="Learning status" value={tab} onChange={setTab} items={[{ value: "active", label: "Active Learning", color: "teal" }, { value: "completed", label: "Completed Learning", color: "violet" }]} />
      </StudentPanel>
      <p role="status" className="mb-4 text-sm text-muted">{filtered.length} sample courses found</p>
      {filtered.length ? <div className="grid gap-5 md:grid-cols-2">{filtered.map((course) => <CourseCard key={course.slug} course={course} />)}</div> : <StudentEmpty title="No matching courses" description="Try a different stream, search term or learning status." icon={Search} />}
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
