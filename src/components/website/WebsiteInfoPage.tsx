import { Markdown } from "@/components/Markdown";
import type { PublicBook } from "@/lib/website/types";
import { listPeople } from "@/server/services/public/community";
import { listBooks, listMagazines } from "@/server/services/public/publications";
import { getLegalDocument, getSiteSettings } from "@/server/services/public/site";
import { ArrowRight, BookOpen, ExternalLink, Globe2, GraduationCap, Heart, Leaf, Mail, MapPin, Phone, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BulkRequest } from "./WebsiteForms";
import { WebsiteIntro } from "./WebsiteUi";

function BookShelf({ books, catalogUrl }: { books: PublicBook[]; catalogUrl: string }) {
    const languages = [...new Set(books.map((book) => book.language))].sort((a, b) => (a === "English" ? -1 : b === "English" ? 1 : a.localeCompare(b)));
    return <>{languages.map((language) => <section className="web-section web-container" key={language}>
        <div className="web-section-heading"><div><p className="web-eyebrow">The IBMV reading collection</p><h2>{language} publications</h2></div><p>Original titles and covers from IBMV. Confirm editions, prices, stock and retailer options in the official book catalog.</p></div>
        <div className="web-book-grid">{books.filter((book) => book.language === language).map((book) => {
            const href = book.links[0]?.url ?? catalogUrl;
            return <article className="web-book-card" key={book.id}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${book.title} · view the official book catalog`}><Image src={book.image.src} alt={`${book.title} book cover`} width={book.image.width} height={book.image.height} sizes="(min-width: 1024px) 300px, (min-width: 768px) 40vw, 85vw" /></a>
                <div><span className="web-eyebrow">{book.language} · IBMV</span><h3>{book.title}</h3><a className="web-text-link" href={href} target="_blank" rel="noopener noreferrer">Official book catalog<ExternalLink size={15} aria-hidden="true" /></a></div>
            </article>;
        })}</div>
    </section>)}</>;
}

async function PeoplePage({ board }: { board: boolean }) {
    const people = await listPeople(board ? "ADVISORY" : "TEAM");
    const placeholders = board ? ["Academic guidance", "Curriculum stewardship", "Educational advisory"] : ["Academic coordination", "Learner support", "Publications & resources"];
    return <>
        <WebsiteIntro eyebrow="People & purpose" title={board ? "Guidance that gives direction." : "Learning is a shared service."} description={board ? "A space to introduce the people who guide the institution's educational mission." : "A space to meet the people behind the learning experience."} />
        <section className="web-section web-container">
            {people.length === 0 ? <p className="web-preview-label">Directory layout preview · Names and biographies await approval</p> : null}
            <div className="web-people-grid">
                {people.length > 0 ? people.map((person) => <article className="web-person" key={person.id}>
                    <span>{person.image ? <Image src={person.image} alt="" width={96} height={96} /> : <Users size={35} aria-hidden="true" />}</span>
                    <p className="web-eyebrow">{person.roleTitle}</p><h2>{person.name}</h2>{person.bio ? <p>{person.bio}</p> : null}
                </article>) : placeholders.map((role) => <article className="web-person" key={role}><span><Users size={35} aria-hidden="true" /></span><p className="web-eyebrow">Role preview</p><h2>{role}</h2><p>Verified team member information and photographs will be published here with approval.</p></article>)}
            </div>
        </section>
    </>;
}

async function LegalPage({ type }: { type: "TERMS" | "PRIVACY" }) {
    const doc = await getLegalDocument(type);
    const privacy = type === "PRIVACY";
    if (doc) {
        return <>
            <WebsiteIntro eyebrow={privacy ? "Privacy" : "Terms"} title={doc.title} description={doc.publishedAt ? `Version ${doc.version} · published ${doc.publishedAt}` : `Version ${doc.version}`} />
            <section className="web-section web-container web-prose web-narrow"><Markdown value={doc.body} /></section>
        </>;
    }
    return <>
        <WebsiteIntro eyebrow="Preview information" title={privacy ? "Your privacy matters." : "A clear understanding."} description="Important boundaries for this public website design preview." />
        <section className="web-section web-container web-prose web-narrow">
            <h2>{privacy ? "Visitor information" : "A design preview, not a live service"}</h2>
            <p>This public portal displays authorized course titles and artwork from the official IBMV website alongside original introductory text. Listings are a snapshot, not live availability. This site does not process payments, enroll learners or issue qualifications. Enrollment and payments take place on the official IBMV website.</p>
            <h2>Forms and external links</h2>
            <p>The publication enquiry form sends your details to the IBMV team so they can reply. Links to the official IBMV website open a separate service with its own terms and privacy practices.</p>
            <h2>Before production</h2>
            <p>An institution-approved privacy policy, retention schedule, contact details and legal terms must replace this notice before launch. This page is not legal advice or an approved institutional policy.</p>
        </section>
    </>;
}

export async function WebsiteInfoPage({ slug }: { slug: string }) {
    const settings = await getSiteSettings();

    if (slug === "books") {
        const books = await listBooks();
        return <>
            <WebsiteIntro eyebrow="Publications" title="A little reading. A lasting impression." description="Explore the English and Hindi publications listed on the official IBMV website." />
            <BookShelf books={books} catalogUrl={settings.links.officialBooks} />
            <section className="web-section web-container"><BulkRequest books={books.map((book) => book.title)} /></section>
        </>;
    }

    if (slug === "e-magazines") {
        const issues = await listMagazines();
        return <>
            <WebsiteIntro eyebrow="Publications" title="Ideas worth returning to." description="A home for the magazine archive, made for discovery and unhurried reading." />
            <section className="web-section web-container">
                {issues.length > 0 ? <div className="web-book-grid">{issues.map((issue) => <article className="web-book-card" key={issue.id}>
                    {issue.cover ? <Image src={issue.cover} alt={`${issue.title} cover`} width={600} height={840} sizes="(min-width: 1024px) 300px, 85vw" /> : null}
                    <div><span className="web-eyebrow">{issue.language}{issue.issueLabel ? ` · ${issue.issueLabel}` : ""}</span><h3>{issue.title}</h3>{issue.url ? <a className="web-text-link" href={issue.url} target="_blank" rel="noopener noreferrer">Read this issue<ExternalLink size={15} aria-hidden="true" /></a> : null}</div>
                </article>)}</div>
                    : <div className="web-empty"><BookOpen size={44} aria-hidden="true" /><h2>The archive is being prepared.</h2><p>No verified magazine issues or download files have been supplied. Issue dates, languages and reading links will appear here when the archive is connected.</p><Link className="web-btn" href="/website/books">Explore the publications space<ArrowRight size={16} aria-hidden="true" /></Link></div>}
            </section>
        </>;
    }

    if (slug === "contact") {
        const { contact } = settings;
        return <>
            <WebsiteIntro eyebrow="Contact" title="A thoughtful conversation starts here." description="Explore the next step in your learning journey with the institution." />
            <section className="web-section web-container web-contact-grid">
                <div className="web-contact-card"><Mail size={28} aria-hidden="true" /><h2>Reach the IBMV team</h2>
                    <p><a href={`mailto:${contact.email}`}>{contact.email}</a><br /><a href={`tel:${contact.phoneDial}`}><Phone size={14} aria-hidden="true" /> {contact.phone}</a></p>
                    {contact.address ? <p><MapPin size={14} aria-hidden="true" /> {contact.address}</p> : null}
                    {contact.mapUrl ? <a className="web-text-link" href={contact.mapUrl} target="_blank" rel="noopener noreferrer">Locate us<ExternalLink size={15} aria-hidden="true" /></a> : null}
                    <a className="web-btn" href={contact.officialContactUrl} target="_blank" rel="noopener noreferrer">Official contact page<ExternalLink size={16} aria-hidden="true" /></a></div>
                <div className="web-contact-card"><Globe2 size={28} aria-hidden="true" /><h2>Plan your next step</h2><p>Browse the IBMV learning collections before making an enquiry. This site does not embed tracking maps.</p><Link className="web-text-link" href="/website/self-study">Find a learning path<ArrowRight size={16} aria-hidden="true" /></Link></div>
            </section>
        </>;
    }

    if (slug === "account") {
        return <>
            <WebsiteIntro eyebrow="Learner access" title="Your learning continues here." description="Choose the official learning platform or sign in to the new student experience." />
            <section className="web-section web-container web-contact-grid">
                <div className="web-contact-card"><ShieldCheck size={28} aria-hidden="true" /><h2>Official IBMV account</h2><p>Existing learners can sign in through the official website. Account creation, password recovery and enrollment are managed there.</p><a className="web-btn" href={settings.links.officialSite} target="_blank" rel="noopener noreferrer">Go to official IBMV<ExternalLink size={16} aria-hidden="true" /></a></div>
                <div className="web-contact-card"><GraduationCap size={28} aria-hidden="true" /><h2>New student portal</h2><p>Sign in to the new student portal with your account, or create one. Course content in the portal is still being connected.</p><Link className="web-btn web-btn-soft" href="/login?next=/student">Sign in<ArrowRight size={16} aria-hidden="true" /></Link></div>
            </section>
        </>;
    }

    if (slug === "privacy" || slug === "terms") return <LegalPage type={slug === "privacy" ? "PRIVACY" : "TERMS"} />;
    if (slug === "our-team" || slug === "our-advisory-board-members") return <PeoplePage board={slug === "our-advisory-board-members"} />;

    const prabhupada = slug === "srila-prabhupada";
    return <>
        <WebsiteIntro eyebrow={prabhupada ? "Our inspiration" : "About the institution"} title={prabhupada ? "A legacy of sharing wisdom." : "Rooted in wisdom. Open to the world."} description={prabhupada ? "Remembering Srila Prabhupada's contribution to making the bhakti tradition accessible around the world." : "ISKCON Bhagavata Mahavidyalaya · A space for shastric learning and reflection."} />
        <section className="web-section web-container web-about-grid">
            <div className="web-about-symbol" aria-hidden="true">{prabhupada ? <Heart size={95} strokeWidth={0.8} /> : <BookOpen size={95} strokeWidth={0.8} />}<span>STUDY · REFLECT · SERVE</span></div>
            <div className="web-prose">
                <h2>{prabhupada ? "Knowledge shared with compassion." : "A meaningful relationship with learning."}</h2>
                <p>{prabhupada ? "A. C. Bhaktivedanta Swami Prabhupada founded the International Society for Krishna Consciousness in 1966. Through his teaching, translations and writing, he introduced readers around the world to the Bhagavad-gita and the bhakti tradition." : "This new public portal brings course discovery, publications and institutional information into a welcoming, connected experience. Its purpose is simple: help a visitor find a thoughtful next step."}</p>
                <p>{prabhupada ? "This original introductory note is not a reproduced biography or quotation. An institution-approved chronology, archival photographs and further reading can be added to develop this section." : "Explore guided pathways, self-paced learning and family study. Academic standards, instructor details, certificates and schedules must be confirmed for each actual offering."}</p>
                <h2>Read with attention. Reflect with care.</h2>
                <p>We have designed the experience around clear information, accessible navigation and respect for each learner&apos;s starting point.</p>
                <div className="web-about-values"><span><Leaf size={19} aria-hidden="true" />Thoughtful practice</span><span><Heart size={19} aria-hidden="true" />A spirit of service</span></div>
                <Link href="/website/bhagavata-mahavidyalaya" className="web-btn">Explore structured learning<ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
        </section>
    </>;
}
