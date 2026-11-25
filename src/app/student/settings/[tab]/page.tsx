import { StudentSettings } from "@/components/student/StudentSettings";
import { pageLearner } from "@/server/auth/session";
import { getLearnerPreferences, getLearnerProfile } from "@/server/services/learner-profile";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamicParams = false;
export function generateStaticParams() { return [{ tab: "profile" }, { tab: "preferences" }]; }
export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  const { tab } = await params;
  return { title: tab === "profile" ? "Profile" : "Preferences" };
}
export default async function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (tab !== "profile" && tab !== "preferences") notFound();
  const user = await pageLearner();
  if (tab === "profile") return <StudentSettings tab="profile" profile={await getLearnerProfile(user.id)} today={new Date().toISOString().slice(0, 10)} />;
  return <StudentSettings tab="preferences" preferences={await getLearnerPreferences(user.id)} />;
}
