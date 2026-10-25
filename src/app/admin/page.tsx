import { Dashboard } from "@/components/admin/pages/Dashboard";
import { demoSessions } from "@/lib/admin/demo-data";

export const metadata = { title: "Dashboard" };

export default function AdminHomePage() {
  return <Dashboard sessions={demoSessions()} />;
}
