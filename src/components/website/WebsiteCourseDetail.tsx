import { Markdown } from "@/components/Markdown";
import { publicFaq } from "@/lib/website/static";
import type { PublicCourseDetail } from "@/lib/website/types";
import { ArrowLeft, BookOpen, CalendarDays, Clock3, ExternalLink, Globe2, GraduationCap, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { WebsiteFaq, WebsiteIntro } from "./WebsiteUi";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const formatDay = (value: string) => dateFormat.format(new Date(`${value}T00:00:00Z`));

export function WebsiteCourseDetail({ course, collectionTitle }: { course: PublicCourseDetail; collectionTitle: string }) {
    const faqs = course.faqs.length ? course.faqs : publicFaq.slice(1);
    const sections = [
        ["Eligibility", course.eligibility],
        ["Course materials", course.materials],
        ["Who it is for", course.audience],
        ["Assessment", course.assessmentPlan],
        ["Requirements", course.requirements],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));
    const schedule = course.startDate && course.endDate ? `${formatDay(course.startDate)} to ${formatDay(course.endDate)}` : course.startDate ? `Starts ${formatDay(course.startDate)}` : null;

    return <>
        <WebsiteIntro eyebrow={collectionTitle} title={course.title} description={course.summary} />
        <section className="web-section web-container web-detail-grid">
            <div><Link href={`/website/${course.collection}`} className="web-text-link"><ArrowLeft size={16} aria-hidden="true" />Back to collection</Link>
                <div className="web-prose">
                    <p className="web-preview-label">From the official IBMV public catalog</p>
                    <h2>A deeper connection with the subject.</h2>
                    <p>Explore {course.title} in the {collectionTitle} collection. The course name, artwork and any listed duration or teaching-team information are taken from the official public listing.</p>
                    <div className="web-course-detail-image"><Image src={course.image.src} alt={`${course.title} · official IBMV course artwork`} width={course.image.width} height={course.image.height} sizes="(min-width: 1024px) 700px, 90vw" loading="eager" /></div>
                    {course.description ? <Markdown value={course.description} /> : null}
                    <h2>About the teaching team</h2>
                    <p>{course.instructor === "Not listed" ? "The homepage listing does not identify a teaching team for this offering." : `Listed on the official website: ${course.instructor}.`} Please use the official course page for the current faculty and course information.</p>
                    {sections.map(([heading, text]) => <div key={heading}><h2>{heading}</h2><Markdown value={text} /></div>)}
                    {course.scheduleNote ? <><h2>Schedule</h2><Markdown value={course.scheduleNote} /></> : null}
                    <h2>Before you begin</h2>
                    <p>Review the official syllabus, language of instruction, prerequisites, current schedule, access period and assessment requirements before enrolling. This local catalog is a design preview, not a live course feed; listed names may refer to earlier cohorts.</p>
                    <a className="web-btn" href={course.officialUrl} target="_blank" rel="noopener noreferrer">Explore the official course<ExternalLink size={16} aria-hidden="true" /></a>
                    <h2>Questions before you begin</h2>
                    <WebsiteFaq items={faqs} />
                </div>
            </div>
            <aside className="web-detail-card"><p className="web-eyebrow">Your learning pathway</p><h2>At a glance</h2>
                <ul>
                    <li><BookOpen size={18} aria-hidden="true" />{course.mode}</li>
                    <li><Clock3 size={18} aria-hidden="true" />{course.duration === "Not listed" ? "Duration: see official page" : `${course.duration} · Listed duration`}</li>
                    <li><Globe2 size={18} aria-hidden="true" />{course.language === "Not listed" ? "Language: confirm with IBMV" : course.language}</li>
                    {course.priceLabel ? <li><Tag size={18} aria-hidden="true" />{course.priceLabel}</li> : null}
                    {schedule ? <li><CalendarDays size={18} aria-hidden="true" />{schedule}</li> : null}
                    <li><GraduationCap size={18} aria-hidden="true" />{course.certificateOffered ? "Certificate offered · confirm criteria on the official page" : "Eligibility & certification: see official page"}</li>
                </ul>
                {course.comingSoon ? <p><strong>Coming soon.</strong> Dates for this offering have not been announced.</p> : null}
                <p>Check current availability and fees with IBMV. Enrollment and payments take place on the official site, not in this preview.</p>
                <a className="web-btn" href={course.enrollmentUrl ?? course.officialUrl} target="_blank" rel="noopener noreferrer">Official course page<ExternalLink size={16} aria-hidden="true" /></a>
            </aside>
        </section>
    </>;
}
