import { WebsiteShell } from "@/components/website/WebsiteShell";
import { hasPublishedBlogs } from "@/server/services/public/blogs";
import { listCollections } from "@/server/services/public/catalog";
import { getSiteSettings } from "@/server/services/public/site";
import type { Metadata } from "next";
import { Noto_Serif_Devanagari } from "next/font/google";
import "./website.css";

// Content is edited in the admin and must show immediately; caching with tag revalidation comes in B9.
export const dynamic = "force-dynamic";

const devanagari = Noto_Serif_Devanagari({
  variable: "--font-web-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "IBMV · A lifetime of learning", template: "%s · IBMV" },
  description: "Explore the IBMV public website design preview: thoughtful learning pathways, publications and institutional information.",
  robots: { index: false, follow: false },
};

export default async function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const [collections, settings, hasBlogs] = await Promise.all([listCollections(), getSiteSettings(), hasPublishedBlogs()]);
  return <div className={devanagari.variable}><WebsiteShell collections={collections} settings={settings} hasBlogs={hasBlogs}>{children}</WebsiteShell></div>;
}
