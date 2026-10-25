import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListPage } from "@/components/admin/ListPage";
import { AnalyticsPage } from "@/components/admin/pages/AnalyticsPage";
import { CommunityPage } from "@/components/admin/pages/CommunityPage";
import { DecisionPage } from "@/components/admin/pages/DecisionPage";
import { MyProfile } from "@/components/admin/pages/MyProfile";
import { NewEnrolment } from "@/components/admin/pages/NewEnrolment";
import { SessionsCalendar } from "@/components/admin/pages/SessionsCalendar";
import { SystemNotifications } from "@/components/admin/pages/SystemNotifications";
import { analytics } from "@/lib/admin/analytics";
import { demoCommunities } from "@/lib/admin/community";
import { decisions } from "@/lib/admin/decisions";
import { demoSessions } from "@/lib/admin/demo-data";
import { getListConfig } from "@/lib/admin/list-configs";
import { adminNav, findPage } from "@/lib/admin/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return adminNav.filter((s) => s.slug !== "home").flatMap((s) => s.pages.map((p) => ({ section: s.slug, page: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/admin/[section]/[page]">): Promise<Metadata> {
  const { section, page } = await params;
  return { title: findPage(section, page)?.page.label ?? "Not found" };
}

export default async function AdminSectionPage({ params }: PageProps<"/admin/[section]/[page]">) {
  const { section, page } = await params;
  const found = findPage(section, page);
  if (!found || section === "home") notFound();
  const key = `${section}/${page}`;

  if (found.page.status === "decision" && decisions[key]) {
    return <DecisionPage section={found.section} page={found.page} info={decisions[key]} />;
  }

  switch (key) {
    case "learning/sessions":
      return <SessionsCalendar sessions={demoSessions()} />;
    case "users/new-enrolment": {
      const learners = getListConfig("users/learners");
      return <NewEnrolment knownEmails={(learners?.rows ?? []).map((r) => String(r.email))} />;
    }
    case "engage/community":
      return <CommunityPage communities={demoCommunities()} />;
    case "settings/my-profile":
      return <MyProfile />;
    case "settings/system-notifications":
      return <SystemNotifications />;
  }

  if (section === "analytics" && analytics[page]) {
    return <AnalyticsPage title={found.page.label} description={found.page.description} status={found.page.status} data={analytics[page]} />;
  }

  const config = getListConfig(key);
  if (config) return <ListPage pageKey={key} status={found.page.status} config={config} />;

  notFound();
}
