import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentSettings } from "@/components/student/StudentSettings";

export const dynamicParams = false;
export function generateStaticParams() { return [{ tab: "profile" }, { tab: "preferences" }]; }
export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  const { tab } = await params;
  return { title: tab === "profile" ? "Profile" : "Preferences" };
}
export default async function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (tab !== "profile" && tab !== "preferences") notFound();
  return <StudentSettings tab={tab} />;
}
