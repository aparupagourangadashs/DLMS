import { StudentExamTaking } from "@/components/student/StudentPages";
import { pageLearner } from "@/server/auth/session";

export default async function StudentExamPage({ params }: { params: Promise<{ id: string }> }) {
  await pageLearner();
  const { id } = await params;
  return <StudentExamTaking assessmentId={id} />;
}
