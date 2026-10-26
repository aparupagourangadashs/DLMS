import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { courses } from "@/lib/student/demo";
import { CourseReader } from "@/components/student/LearningPages";

export const dynamicParams = false;
export function generateStaticParams() { return courses.map((course) => ({ course: course.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ course: string }> }): Promise<Metadata> {
  const { course } = await params;
  return { title: courses.find((item) => item.slug === course)?.title ?? "Course preview" };
}
export default async function Page({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params;
  const course = courses.find((item) => item.slug === slug);
  if (!course) notFound();
  return <CourseReader key={course.slug} course={course} />;
}
