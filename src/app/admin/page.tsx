import { Dashboard } from "@/components/admin/pages/Dashboard";
import { can } from "@/server/auth/permissions";
import { pageStaff } from "@/server/auth/session";
import { getDashboardOverview } from "@/server/services/dashboard";
import { listHolidayBranches } from "@/server/services/sessions";

export const metadata = { title: "Dashboard" };

export default async function AdminHomePage() {
  const user = await pageStaff();
  const canSeeSessions = can(user.role, "sessions:read");
  const [overview, holidayBranches] = await Promise.all([
    getDashboardOverview(user, { attendance: canSeeSessions, series: can(user.role, "learners:read") && can(user.role, "enrolments:read"), activity: can(user.role, "learners:read") }),
    canSeeSessions ? listHolidayBranches(user) : { branches: [], required: false },
  ]);
  return (
    <Dashboard
      overview={overview}
      canSeeSessions={canSeeSessions}
      canWriteSessions={can(user.role, "sessions:write")}
      branches={holidayBranches.branches}
      branchRequired={holidayBranches.required}
    />
  );
}
