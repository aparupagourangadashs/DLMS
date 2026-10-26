import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WebsiteCatalog } from "@/components/website/WebsiteCatalog";
import { WebsiteInfoPage } from "@/components/website/WebsitePages";
import { collections, publicPages } from "@/lib/website/content";

export const dynamicParams = false;
export function generateStaticParams() { return publicPages.map((page) => ({ page })); }
export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  return { title: collections.find((item) => item.slug === page)?.title ?? page.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ") };
}
export default async function PublicPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!publicPages.includes(page)) notFound();
  const collection = collections.find((item) => item.slug === page);
  return collection ? <WebsiteCatalog key={page} slug={collection.slug} /> : <WebsiteInfoPage slug={page} />;
}
