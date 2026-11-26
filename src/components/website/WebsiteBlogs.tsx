import { Markdown } from "@/components/Markdown";
import type { PublicBlog, PublicBlogCard } from "@/lib/blogs";
import { formatDate } from "@/lib/format";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clock3, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BlogViewCounter } from "./BlogViewCounter";
import { WebsiteIntro } from "./WebsiteUi";

function BlogCard({ blog }: { blog: PublicBlogCard }) {
    return <article className="web-article-card">
        <div className="web-article-cover" aria-hidden="true">
            {blog.coverUrl ? <Image src={blog.coverUrl} alt="" fill unoptimized sizes="(min-width: 1024px) 380px, (min-width: 768px) 45vw, 90vw" /> : <BookOpen size={38} strokeWidth={1.2} />}
        </div>
        <div className="web-article-card-body">
            <p className="web-article-meta"><time dateTime={blog.publishedOn}>{formatDate(blog.publishedOn)}</time><span>{blog.minutes} min read</span></p>
            <h2><Link href={`/website/blogs/${blog.slug}`}>{blog.title}</Link></h2>
            {blog.excerpt ? <p>{blog.excerpt}</p> : null}
            {blog.author ? <p className="web-article-author">By {blog.author}</p> : null}
        </div>
    </article>;
}

type ListData = { items: PublicBlogCard[]; total: number; page: number; pages: number };

export function BlogList({ data }: { data: ListData }) {
    const { items, page, pages } = data;
    return <>
        <WebsiteIntro eyebrow="Blog" title="Reflections from IBMV." description="Articles from the IBMV community on learning, practice and the study of the shastras." />
        <section className="web-section web-container">
            {items.length === 0
                ? <div className="web-empty"><BookOpen size={44} aria-hidden="true" /><h2>No articles yet.</h2><p>Articles will appear here once they are published.</p><Link className="web-btn" href="/website">Back to the home page<ArrowRight size={16} aria-hidden="true" /></Link></div>
                : <div className="web-article-grid">{items.map((blog) => <BlogCard key={blog.id} blog={blog} />)}</div>}
            {pages > 1 ? <nav className="web-pagination" aria-label="Blog pages">
                {page > 1 ? <Link href={page === 2 ? "/website/blogs" : `/website/blogs?page=${page - 1}`} rel="prev"><ArrowLeft size={15} aria-hidden="true" />Newer</Link> : <span aria-disabled="true"><ArrowLeft size={15} aria-hidden="true" />Newer</span>}
                <span aria-current="page">Page {page} of {pages}</span>
                {page < pages ? <Link href={`/website/blogs?page=${page + 1}`} rel="next">Older<ArrowRight size={15} aria-hidden="true" /></Link> : <span aria-disabled="true">Older<ArrowRight size={15} aria-hidden="true" /></span>}
            </nav> : null}
        </section>
    </>;
}

export function BlogArticle({ blog }: { blog: PublicBlog }) {
    return <article>
        <section className="web-page-hero web-article-hero">
            <div className="web-container">
                <Link className="web-breadcrumb" href="/website/blogs">Blog / <span>Article</span></Link>
                <h1>{blog.title}</h1>
                <p className="web-article-byline">
                    {blog.author ? <span><UserRound size={14} aria-hidden="true" />{blog.author}</span> : null}
                    <span><CalendarDays size={14} aria-hidden="true" /><time dateTime={blog.publishedOn}>{formatDate(blog.publishedOn)}</time></span>
                    <span><Clock3 size={14} aria-hidden="true" />{blog.minutes} min read</span>
                </p>
            </div>
        </section>
        <section className="web-section web-container web-narrow web-prose web-article-text">
            {blog.coverUrl ? <figure className="web-article-figure"><Image src={blog.coverUrl} alt="" fill unoptimized sizes="(min-width: 900px) 800px, 100vw" /></figure> : null}
            {blog.summary ? <p className="web-article-lead">{blog.summary}</p> : null}
            <Markdown value={blog.body} />
            <Link className="web-text-link" href="/website/blogs"><ArrowLeft size={16} aria-hidden="true" />All articles</Link>
        </section>
        <BlogViewCounter slug={blog.slug} />
    </article>;
}
