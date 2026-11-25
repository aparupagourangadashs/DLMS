import { StudentShell } from "@/components/student/StudentShell";
import { pageLearner } from "@/server/auth/session";
import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Student portal", template: "%s · Student · IBMV Learning Platform" } };

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await pageLearner();
  return <StudentShell userName={user.name}>{children}</StudentShell>;
}
