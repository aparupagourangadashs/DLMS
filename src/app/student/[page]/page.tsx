import { MyLearning } from "@/components/student/LearningPages";
import { StudentCalendar } from "@/components/student/StudentCalendar";
import { StudentHelp } from "@/components/student/StudentHelp";
import { StudentAnnouncements, StudentCertificates, StudentCommunities, StudentExams, StudentMemberships, StudentPurchases, StudentReferrals } from "@/components/student/StudentPages";
import { istToday } from "@/lib/ist";
import { studentNav } from "@/lib/student/demo";
import { pageLearner } from "@/server/auth/session";
import { listMyAnnouncements, listMyCourses } from "@/server/services/learner-learning";
import { getSiteSettings } from "@/server/services/public/site";
import { listMySupportRequests } from "@/server/services/support";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Pages that still show sample content; the others below read the learner's own data.
const pages = {
  communities: StudentCommunities,
  memberships: StudentMemberships,
};
const livePages = ["announcements", "calendar", "help", "my-learning", "exams", "certificates", "my-purchases", "memberships", "refer-and-earn"];
type StudentPage = keyof typeof pages;
function isStudentPage(value: string): value is StudentPage { return Object.hasOwn(pages, value); }
export const dynamicParams = false;
export function generateStaticParams() { return [...Object.keys(pages), ...livePages].map((page) => ({ page })); }
export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  return { title: studentNav.find((item) => item.slug === page)?.label ?? "Student portal" };
}
export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (page === "help") {
    const user = await pageLearner();
    const [requests, settings] = await Promise.all([listMySupportRequests(user.id), getSiteSettings()]);
    const { contact, links } = settings;
    return <StudentHelp initialRequests={requests} contact={{ email: contact.email, phone: contact.phone, phoneDial: contact.phoneDial, appUrl: links.app }} />;
  }
  if (page === "calendar") {
    await pageLearner();
    return <StudentCalendar today={istToday()} />;
  }
  if (page === "my-learning") {
    const user = await pageLearner();
    return <MyLearning courses={await listMyCourses(user.id)} />;
  }
  if (page === "announcements") {
    const user = await pageLearner();
    return <StudentAnnouncements initial={await listMyAnnouncements(user.id)} />;
  }
  if (page === "exams") {
    await pageLearner();
    return <StudentExams />;
  }
  if (page === "certificates") {
    await pageLearner();
    return <StudentCertificates />;
  }
  if (page === "my-purchases") {
    await pageLearner();
    return <StudentPurchases />;
  }
  if (page === "memberships") {
    await pageLearner();
    return <StudentMemberships />;
  }
  if (page === "refer-and-earn") {
    await pageLearner();
    return <StudentReferrals />;
  }
  if (!isStudentPage(page)) notFound();
  const Screen = pages[page];
  return <Screen />;
}
