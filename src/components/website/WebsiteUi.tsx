import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock3, ExternalLink, UserRound } from "lucide-react";
import type { PublicCourse } from "@/lib/website/content";

export function WebsiteIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="web-page-hero"><div className="web-container"><Link className="web-breadcrumb" href="/website">Home / <span>{eyebrow}</span></Link><p className="web-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="web-intro-copy">{description}</p></div></section>;
}

export function PublicCourseCard({ course }: { course: PublicCourse }) {
  return <article className="web-course-card">
    <Link href={`/website/course/${course.slug}`} className={`web-course-art web-course-photo web-art-${course.color}`} aria-label={`Explore ${course.title}`}><Image src={course.image.src} alt={`${course.title} · official IBMV course artwork`} width={course.image.width} height={course.image.height} sizes="(min-width: 1024px) 380px, (min-width: 768px) 45vw, 90vw" /></Link>
    <div className="web-course-body"><div className="web-course-meta"><span>{course.mode}</span>{course.language !== "Not listed" && <span>{course.language}</span>}</div><h3><Link href={`/website/course/${course.slug}`}>{course.title}</Link></h3><div className="web-course-facts">{course.duration !== "Not listed" && <span><Clock3 size={14} aria-hidden="true" />{course.duration}</span>}{course.instructor !== "Not listed" && <span><UserRound size={14} aria-hidden="true" />{course.instructor}</span>}</div><Link className="web-course-link" href={`/website/course/${course.slug}`}>Explore course <ArrowRight size={17} aria-hidden="true" /></Link><a className="web-official-link" href={course.officialUrl} target="_blank" rel="noopener noreferrer">Official course page<ExternalLink size={13} aria-hidden="true" /></a></div>
  </article>;
}

export function WebsiteFaq({ items }: { items: { question: string; answer: string }[] }) {
  return <div className="web-faq">{items.map((item) => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div>;
}
