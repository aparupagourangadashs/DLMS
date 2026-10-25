import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpArticle } from "@/components/admin/help/HelpArticle";
import { buildHelp, helpKeys } from "@/lib/admin/help";
import { findPage } from "@/lib/admin/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return helpKeys();
}

export async function generateMetadata({ params }: PageProps<"/admin/help/[section]/[page]">): Promise<Metadata> {
  const { section, page } = await params;
  const found = findPage(section, page);
  return { title: found ? `Help: ${found.page.label}` : "Help" };
}

export default async function HelpArticlePage({ params }: PageProps<"/admin/help/[section]/[page]">) {
  const { section, page } = await params;
  const data = buildHelp(section, page);
  if (!data) notFound();
  return <HelpArticle data={data} />;
}
