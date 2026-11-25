import { CoursePlayer } from "@/components/student/CoursePlayer";
import { CourseReader } from "@/components/student/LearningPages";
import { courses } from "@/lib/student/demo";
import { pageLearner } from "@/server/auth/session";
import { NotFound } from "@/server/http/errors";
import { getCourseOutline } from "@/server/services/learner-content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ course: string }> }): Promise<Metadata> {
  const { course } = await params;
  return { title: courses.find((item) => item.slug === course)?.title ?? "Course" };
}

// The three sample slugs show the reading previews; any other slug is a real course the learner must be enrolled in.
export default async function Page({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params;
  const sample = courses.find((item) => item.slug === slug);
  if (sample) return <CourseReader key={sample.slug} course={sample} />;
  const user = await pageLearner();
  const outline = await getCourseOutline(user.id, slug).catch((error: unknown) => {
    if (error instanceof NotFound) return null;
    throw error;
  });
  if (!outline) notFound();
  return <CoursePlayer key={outline.slug} initial={outline} />;
}
