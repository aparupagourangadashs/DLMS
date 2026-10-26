import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { studentNav } from "@/lib/student/demo";
import { MyLearning } from "@/components/student/LearningPages";
import { StudentCalendar } from "@/components/student/StudentCalendar";
import { StudentAnnouncements, StudentCertificates, StudentCommunities, StudentExams, StudentHelp, StudentMemberships, StudentPurchases, StudentReferrals } from "@/components/student/StudentPages";

const pages = {
  announcements: StudentAnnouncements, calendar: StudentCalendar, certificates: StudentCertificates,
  communities: StudentCommunities, exams: StudentExams, help: StudentHelp, memberships: StudentMemberships,
  "my-learning": MyLearning, "my-purchases": StudentPurchases, "refer-and-earn": StudentReferrals,
};
type StudentPage = keyof typeof pages;
function isStudentPage(value: string): value is StudentPage { return Object.hasOwn(pages, value); }
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(pages).map((page) => ({ page })); }
export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  return { title: studentNav.find((item) => item.slug === page)?.label ?? "Student portal" };
}
export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!isStudentPage(page)) notFound();
  const Screen = pages[page];
  return <Screen />;
}
