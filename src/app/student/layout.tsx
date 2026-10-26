import type { Metadata } from "next";
import { StudentShell } from "@/components/student/StudentShell";

export const metadata: Metadata = { title: { default: "Student portal", template: "%s · Student · IBMV Learning Platform" } };

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
