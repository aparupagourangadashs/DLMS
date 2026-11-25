import { StudentHome } from "@/components/student/LearningPages";
import { missingProfileItems, profileCompletion } from "@/lib/student/profile";
import { pageLearner } from "@/server/auth/session";
import { getHomeSummary } from "@/server/services/learner-learning";
import { getLearnerProfile } from "@/server/services/learner-profile";

export default async function Page() {
  const user = await pageLearner();
  const [profile, summary] = await Promise.all([getLearnerProfile(user.id), getHomeSummary(user.id)]);
  return <StudentHome profile={{ name: profile.name, ...profileCompletion(profile), missing: missingProfileItems(profile) }} summary={summary} />;
}
