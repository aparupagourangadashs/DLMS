import type { Metadata } from "next";
import { Noto_Serif_Devanagari } from "next/font/google";
import { WebsiteShell } from "@/components/website/WebsiteShell";
import "./website.css";

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

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return <div className={devanagari.variable}><WebsiteShell>{children}</WebsiteShell></div>;
}
