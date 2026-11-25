import { WebsiteCatalog } from "@/components/website/WebsiteCatalog";
import { WebsiteInfoPage } from "@/components/website/WebsiteInfoPage";
import { staticPageSlugs } from "@/lib/website/static";
import { listCollections, listCourses } from "@/server/services/public/catalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const titleCase = (slug: string) => slug.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  const collection = (await listCollections()).find((item) => item.slug === page);
  return { title: collection?.title ?? titleCase(page) };
}

export default async function PublicPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const collection = (await listCollections()).find((item) => item.slug === page);
  if (collection) return <WebsiteCatalog key={page} collection={collection} items={await listCourses(page)} />;
  if (!(staticPageSlugs as readonly string[]).includes(page)) notFound();
  return <WebsiteInfoPage slug={page} />;
}
