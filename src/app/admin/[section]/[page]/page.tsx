import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListPage } from "@/components/admin/ListPage";
import { AnalyticsPage } from "@/components/admin/pages/AnalyticsPage";
import { ChequeManagement } from "@/components/admin/pages/ChequeManagement";
import { PromotionalTemplates } from "@/components/admin/pages/PromotionalTemplates";
import { PromoCodes } from "@/components/admin/pages/PromoCodes";
import { CommunityPage } from "@/components/admin/pages/CommunityPage";
import { DecisionPage } from "@/components/admin/pages/DecisionPage";
import { MyProfile } from "@/components/admin/pages/MyProfile";
import { NewEnrolment } from "@/components/admin/pages/NewEnrolment";
import { SessionsCalendar } from "@/components/admin/pages/SessionsCalendar";
import {
  CategoriesSettingsPage,
  CustomFieldsSettingsPage,
  GradingSystemSettingsPage,
  InternationalSellingPage,
  LearnerExperiencePage,
  MiscellaneousFeesSettingsPage,
  SubOrganizationsSettingsPage,
  UtilityWalletSettingsPage,
} from "@/components/admin/pages/SettingsPages";
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

  switch (key) {
    case "marketing/promotional-templates":
      return <PromotionalTemplates />;
    case "marketing/promo-codes":
      return <PromoCodes />;
    case "sales/cheque-management":
      return <ChequeManagement />;
    case "settings/international-selling":
      return <InternationalSellingPage />;
    case "settings/learner-experience":
      return <LearnerExperiencePage />;
  }

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
    case "settings/categories":
      return <CategoriesSettingsPage />;
    case "settings/custom-fields":
      return <CustomFieldsSettingsPage />;
    case "settings/sub-organizations":
      return <SubOrganizationsSettingsPage />;
    case "settings/grading-system":
      return <GradingSystemSettingsPage />;
    case "settings/miscellaneous-fees":
      return <MiscellaneousFeesSettingsPage />;
    case "settings/utility-wallet":
      return <UtilityWalletSettingsPage />;
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
