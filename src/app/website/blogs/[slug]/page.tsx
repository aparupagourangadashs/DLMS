import { BlogArticle } from "@/components/website/WebsiteBlogs";
import { getBlog } from "@/server/services/public/blogs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

// The title and the page both need the article; one lookup serves the request.
const loadBlog = cache(getBlog);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const blog = await loadBlog(slug);
    return blog ? { title: blog.title, description: blog.excerpt || undefined } : { title: "Article not found" };
}

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const blog = await loadBlog(slug);
    if (!blog) notFound();
    return <BlogArticle blog={blog} />;
}
