import { AdminAccessProvider } from "@/components/admin/AdminAccess";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { FloatingHelp, MobileNav, Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { roleLabels } from "@/server/auth/permissions";
import { pageStaff } from "@/server/auth/session";
import { ActivityTracker } from "@/components/activity/ActivityTracker";

export const metadata = {
  title: { default: "Admin", template: "%s · Admin · IBMV Learning Platform" },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await pageStaff();
  return (
    <AdminAccessProvider role={user.role}>
      <ActivityTracker />
      <div className="admin-shell flex min-h-dvh">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-accent px-4 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Sidebar />
        <MobileNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={{ name: user.name, email: user.email, roleLabel: roleLabels[user.role] }} />
          <main id="main" tabIndex={-1} className="admin-workspace mx-auto w-full max-w-[1400px] flex-1 px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
        <CommandPalette />
        <FloatingHelp />
      </div>
    </AdminAccessProvider>
  );
}
