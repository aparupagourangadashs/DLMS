import { BlogList } from "@/components/website/WebsiteBlogs";
import { listBlogs } from "@/server/services/public/blogs";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Blog",
    description: "Articles from the IBMV community on learning, practice and the study of the shastras.",
};

export default async function BlogsPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
    const { page } = await searchParams;
    return <BlogList data={await listBlogs(Number(Array.isArray(page) ? page[0] : page))} />;
}
