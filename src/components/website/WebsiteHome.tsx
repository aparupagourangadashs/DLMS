import { collections, publicBooks, publicCourses, publicFaq } from "@/lib/website/content";
import { ArrowDown, ArrowRight, BookOpen, Compass, ExternalLink, Heart, Layers3, Leaf, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { WebsiteTestimonials } from "./WebsiteCommunity";
import { PublicCourseCard, WebsiteFaq } from "./WebsiteUi";
import { WebsiteVideos } from "./WebsiteVideos";

function HeroArtwork() {
  return <div className="web-hero-artwork" aria-hidden="true">
    <svg className="web-hero-logo-art" viewBox="0 0 640 440" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      {[false, true].map((mirrored) => <g key={String(mirrored)} transform={mirrored ? "translate(640 0) scale(-1 1)" : undefined}>
        <path d="M288 26 C286 111 235 151 226 227 C221 267 234 302 265 329 C290 305 287 260 288 221Z" />
        <path d="M265 329 C208 308 159 276 148 225 C139 183 158 137 145 94 C210 122 257 185 265 246 C270 278 268 307 265 329Z" />
        <path d="M265 329 C205 333 148 319 115 272 C88 234 83 202 68 178 C141 172 224 194 255 250 C269 274 271 304 265 329Z" />
        <path d="M265 329 C215 372 153 369 104 339 C75 321 46 298 18 299 C83 269 153 273 204 296 C229 307 250 319 265 329Z" />
        <path d="M265 329 C222 391 139 387 82 345 C59 328 41 309 18 299" />
        <path d="M265 329 C229 358 171 356 127 330 C98 313 71 298 42 295" />
      </g>)}
      <path d="M288 26 V291 C288 325 352 325 352 291 V26" />
      <path d="M320 315 C283 324 277 369 292 392 C303 408 314 415 320 430 C326 415 337 408 348 392 C363 369 357 324 320 315Z" fill="currentColor" stroke="none" />
    </svg>
    <svg className="web-hero-manuscript" viewBox="0 0 440 250" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <path d="M220 130 C197 111 158 111 115 120 L115 215 C158 206 197 206 220 225 C243 206 282 206 325 215 L325 120 C282 111 243 111 220 130Z" />
      <path d="M220 130 V225 M105 129 L105 226 Q168 211 220 237 Q272 211 335 226 L335 129" />
      {[143, 160, 177, 194].map((y) => <g key={y}><path d={`M132 ${y} Q173 ${y - 7} 201 ${y + 3}`} /><path d={`M239 ${y + 3} Q267 ${y - 7} 308 ${y}`} /></g>)}
      <path d="M220 100 C193 77 191 49 220 18 C249 49 247 77 220 100Z M220 100 C181 101 157 80 153 48 C187 49 210 66 220 100Z M220 100 C259 101 283 80 287 48 C253 49 230 66 220 100Z M220 100 C180 119 146 106 130 82 C165 73 196 80 220 100Z M220 100 C260 119 294 106 310 82 C275 73 244 80 220 100Z" />
      <path d="M49 148 H86 M354 148 H391 M59 158 H79 M361 158 H381" />
      <path d="M63 120 L68 128 L63 136 L58 128Z M377 120 L382 128 L377 136 L372 128Z" />
    </svg>
    <div className="web-hero-art-border" />
  </div>;
}

export function WebsiteHome() {
  return <>
    <section className="web-hero">
      <HeroArtwork />
      <div className="web-container web-hero-grid">
        <div className="web-hero-copy"><p className="web-eyebrow"><span />A college of Vedic studies</p><h1>ISKCON Bhagavata<br /><em>Mahavidyalaya</em></h1><p>Study the Bhagavad-gita, Srimad-Bhagavatam and the teachings of the Vaishnava acharyas. Discover online and onsite learning rooted in Srila Prabhupada&apos;s teachings, from your first introduction to advanced shastric study.</p><div className="web-hero-actions"><Link className="web-btn web-btn-gold" href="/website/bhagavata-mahavidyalaya">Explore courses<ArrowRight size={18} aria-hidden="true" /></Link><Link className="web-text-link" href="/website/iskcon-bhagavata-mahavidyalaya">About the Mahavidyalaya<ArrowRight size={17} aria-hidden="true" /></Link></div><div className="web-hero-values"><a href="https://play.google.com/store/apps/details?id=com.edmingle.iskconbhagavatamahavidyalaya" target="_blank" rel="noopener noreferrer">Get the learner app<ExternalLink size={14} aria-hidden="true" /></a><a href="https://chat.whatsapp.com/JoCb24xIIJ31f9t1KNrh3W" target="_blank" rel="noopener noreferrer">Join on WhatsApp<ExternalLink size={14} aria-hidden="true" /></a><a href="https://t.me/+R3ecNqESCwmxJIJt" target="_blank" rel="noopener noreferrer">Join on Telegram<ExternalLink size={14} aria-hidden="true" /></a></div></div>
      </div>
      <div className="web-container web-hero-bottom"><span>31,500+ learners across online and onsite courses, as reported by IBMV.</span><a href="#learning-paths">Discover your path <ArrowDown size={15} aria-hidden="true" /></a></div>
    </section>
    <nav className="web-home-jump" aria-label="Explore the homepage"><div className="web-container"><span>Explore IBMV</span><a href="#learning-paths"><Compass size={16} aria-hidden="true" />Learning paths</a><a href="#testimonials"><Heart size={16} aria-hidden="true" />Testimonials</a><a href="#videos"><Sparkles size={16} aria-hidden="true" />Videos</a><a href="#publications"><BookOpen size={16} aria-hidden="true" />Publications</a><a href="#magazine"><BookOpen size={16} aria-hidden="true" />E-Magazine</a></div></nav>
    <section id="learning-paths" className="web-section web-container">
      <div className="web-section-heading"><div><p className="web-eyebrow">Six pathways into Vedic education</p><h2>Find your path<br /><em>through the shastras.</em></h2></div><p>Choose structured study, self-paced courses, family learning or live classes. Explore scripture, Sanskrit and devotional practice at a level suited to your experience.</p></div>
      <div className="web-collection-grid">{collections.map((item, index) => { const Icon = [BookOpen, Leaf, Sparkles, Heart, Layers3, Compass][index]; return <Link href={`/website/${item.slug}`} className={`web-collection web-art-${item.color}`} key={item.slug}><span className="web-collection-icon"><Icon size={25} aria-hidden="true" /></span><span className="web-collection-number">0{index + 1}</span><span className="web-eyebrow">{item.short}</span><h3>{item.title}</h3><p>{item.description}</p><span className="web-collection-action">Explore collection<ArrowRight size={18} aria-hidden="true" /></span></Link>; })}</div>
    </section>
    <section className="web-section web-courses-section"><div className="web-container"><div className="web-section-heading"><div><p className="web-eyebrow">ISKCON Board of Examination Courses</p><h2>Go deeper into<br /><em>shastric study.</em></h2></div><div><p>{collections[0].description}</p><Link href="/website/bhagavata-mahavidyalaya" className="web-text-link">Explore structured study<ArrowRight size={17} aria-hidden="true" /></Link></div></div><div className="web-course-grid web-home-course-row">{publicCourses.slice(0, 3).map((course) => <PublicCourseCard course={course} key={course.slug} />)}</div><p className="web-source-note">Confirm current batches, fees and availability on the official course page before enrolling.</p></div></section>
    {collections.slice(1).map((collection) => {
      const courses = publicCourses.filter((course) => course.collection === collection.slug);
      return <section className={`web-section web-collection-showcase web-showcase-${collection.color}`} key={collection.slug}><div className="web-container"><div className="web-section-heading"><div><p className="web-eyebrow">{collection.short}</p><h2>{collection.title}</h2></div><div><p>{collection.description}</p><Link className="web-text-link" href={`/website/${collection.slug}`}>View all {courses.length} courses<ArrowRight size={17} aria-hidden="true" /></Link></div></div><p className="web-swipe-hint">Swipe to explore the courses →</p><div className="web-course-grid web-home-course-row">{courses.slice(0, 3).map((course) => <PublicCourseCard course={course} key={course.slug} />)}</div></div></section>;
    })}
    <WebsiteTestimonials />
    <section className="web-section web-container"><div className="web-launch-panel"><div><p className="web-eyebrow">Bhakti Vedanta · Module 3</p><h2>Study the final cantos<br /><em>of the Bhagavatam.</em></h2><p>Explore the Eleventh and Twelfth Cantos of Srimad-Bhagavatam in Bhakti Vedanta Module 3. Visit the official course page for the schedule, eligibility and enrollment details.</p><a className="web-btn web-btn-gold" href="https://www.ibmedu.org/course-details/BhaktiVedantaModule-3-115238" target="_blank" rel="noopener noreferrer">View official offering<ExternalLink size={16} aria-hidden="true" /></a></div><a href="https://www.ibmedu.org/course-details/BhaktiVedantaModule-3-115238" target="_blank" rel="noopener noreferrer"><Image src="/student-course-launch.jpg" alt="Bhakti Vedanta Module 3 official IBMV banner; opens the official course page" width={1920} height={574} sizes="(min-width: 1024px) 55vw, 90vw" /></a></div></section>
    <section className="web-mission"><div className="web-container web-mission-grid"><div className="web-mission-art" aria-hidden="true"><span /><BookOpen size={100} strokeWidth={0.8} /><span className="web-mission-art-word">STUDY<br />PRACTISE · SHARE</span></div><div><p className="web-eyebrow">Our mission · Sri Govardhan dhama</p><h2>Learn the Bhagavatam.<br /><em>Live its teachings.</em></h2><p>Based in Sri Govardhan dhama, ISKCON Bhagavata Mahavidyalaya brings the study of Srimad-Bhagavatam and the Gaudiya Vaishnava tradition into daily practice. Guided by Srila Prabhupada&apos;s teachings, the institution nurtures a taste for scripture and prepares learners to share that knowledge through teaching and service.</p><Link href="/website/iskcon-bhagavata-mahavidyalaya" className="web-text-link">Discover our educational mission<ArrowRight size={18} aria-hidden="true" /></Link></div></div></section>
    <WebsiteVideos />
    <section id="publications" className="web-section web-container web-reading-grid"><div><p className="web-eyebrow">IBMV publications · English and Hindi</p><h2>Read, reflect<br /><em>and deepen your study.</em></h2><p className="web-body-copy">Explore Srimad Bhagavata Mahapuranam, Sri Damodar Lila and other publications on the personalities, prayers and teachings of the bhakti tradition. Find English and Hindi titles to support your reading and study.</p><Link href="/website/books" className="web-btn">Explore publications<ArrowRight size={17} aria-hidden="true" /></Link></div><Link href="/website/books" className="web-publication-art web-publication-covers" aria-label="Explore books and reading resources">{[publicBooks[0], publicBooks[2]].map((book) => <Image key={book.image} src={book.image} alt={book.title} width={600} height={840} sizes="(min-width: 1024px) 230px, 40vw" />)}</Link></section>
    <section id="magazine" className="web-section web-magazine" aria-labelledby="web-magazine-title"><div className="web-container web-faq-grid"><div><p className="web-eyebrow">Read. Live. Inspire.</p><h2 id="web-magazine-title">Nityam<br /><em>Bhagavata-sevaya</em></h2></div><div><p className="web-body-copy">Return to the wisdom of Srimad-Bhagavatam every fortnight. IBMV&apos;s e-magazine brings its teachings together with insights from Srila Visvanatha Cakravarti Thakura, Srila Bhaktivinoda Thakura, Srila Bhaktisiddhanta Saraswati and Srila Prabhupada.</p><a className="web-btn" href="https://www.ibmedu.org/" target="_blank" rel="noopener noreferrer">Magazine subscriptions on IBMV<ExternalLink size={16} aria-hidden="true" /></a><p className="web-source-note">Subscription requests are handled on the official IBMV website.</p></div></div></section>
    <section className="web-section web-faq-section"><div className="web-container web-faq-grid"><div><p className="web-eyebrow">Planning your studies</p><h2>Questions before<br /><em>you begin?</em></h2><Link href="/website/contact" className="web-text-link">Contact the IBMV team<ArrowRight size={17} aria-hidden="true" /></Link></div><WebsiteFaq items={publicFaq} /></div></section>
  </>;
}
