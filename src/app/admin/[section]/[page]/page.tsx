import { ListPage } from "@/components/admin/ListPage";
import { AnalyticsPage } from "@/components/admin/pages/AnalyticsPage";
import { CategoriesPage } from "@/components/admin/pages/CategoriesPage";
import { ChequeManagement } from "@/components/admin/pages/ChequeManagement";
import { CommunityPage } from "@/components/admin/pages/CommunityPage";
import { DecisionPage } from "@/components/admin/pages/DecisionPage";
import { MyProfile } from "@/components/admin/pages/MyProfile";
import { NewEnrolment } from "@/components/admin/pages/NewEnrolment";
import { PromoCodes } from "@/components/admin/pages/PromoCodes";
import { PromotionalTemplates } from "@/components/admin/pages/PromotionalTemplates";
import { SessionsCalendar } from "@/components/admin/pages/SessionsCalendar";
import {
  CustomFieldsSettingsPage,
  GradingSystemSettingsPage,
  InternationalSellingPage,
  LearnerExperiencePage,
  MiscellaneousFeesSettingsPage,
  UtilityWalletSettingsPage,
} from "@/components/admin/pages/SettingsPages";
import { SiteSettingsPage } from "@/components/admin/pages/SiteSettingsPage";
import { SubOrganizationsPage } from "@/components/admin/pages/SubOrganizations";
import { SupportInbox } from "@/components/admin/pages/SupportInbox";
import { SystemNotifications } from "@/components/admin/pages/SystemNotifications";
import { analytics } from "@/lib/admin/analytics";
import { demoCommunities } from "@/lib/admin/community";
import { withOptions } from "@/lib/admin/config-options";
import { decisions } from "@/lib/admin/decisions";
import { getListConfig } from "@/lib/admin/list-configs";
import { adminNav, findPage } from "@/lib/admin/navigation";
import { canViewPage } from "@/lib/admin/page-permissions";
import { istToday } from "@/lib/ist";
import { getResource, resourceKeys } from "@/server/admin/resources";
import { can } from "@/server/auth/permissions";
import { pageStaff } from "@/server/auth/session";
import { listEnrolBatches } from "@/server/services/enrolments";
import { getMyProfile } from "@/server/services/profile";
import { getSiteSettings } from "@/server/services/public/site";
import { listHolidayBranches } from "@/server/services/sessions";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

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
  const user = await pageStaff();
  if (!canViewPage(user.role, section, page)) redirect("/access-denied");
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
    case "learning/sessions": {
      const holidayBranches = await listHolidayBranches(user);
      return <SessionsCalendar today={istToday()} batches={await listEnrolBatches(user)} branches={holidayBranches.branches} branchRequired={holidayBranches.required} canWrite={can(user.role, "sessions:write")} />;
    }
    case "users/new-enrolment":
      return <NewEnrolment batches={await listEnrolBatches(user)} />;
    case "engage/support":
      return <SupportInbox currentUserId={user.id} canWrite={can(user.role, "supportRequests:write")} status={found.page.status} />;
    case "engage/community":
      return <CommunityPage communities={demoCommunities()} />;
    case "settings/my-profile":
      return <MyProfile initial={await getMyProfile(user.id)} />;
    case "settings/categories":
      return <CategoriesPage />;
    case "website/site-settings":
      return <SiteSettingsPage initial={await getSiteSettings()} />;
    case "settings/custom-fields":
      return <CustomFieldsSettingsPage />;
    case "settings/sub-organizations":
      return <SubOrganizationsPage />;
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
  if (config) {
    // Migrated screens load rows from the API; the fixture rows are not sent to the browser.
    const remote = resourceKeys().includes(key);
    if (remote) {
      const options = (await getResource(key).options?.()) ?? {};
      return <ListPage pageKey={key} status={found.page.status} config={withOptions({ ...config, rows: [] }, options)} remote />;
    }
    return <ListPage pageKey={key} status={found.page.status} config={config} remote={false} />;
  }

  notFound();
}
