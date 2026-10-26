import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WebsiteCourseDetail } from "@/components/website/WebsitePages";
import { publicCourses } from "@/lib/website/content";

export const dynamicParams = false;
export function generateStaticParams() { return publicCourses.map((course) => ({ slug: course.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = publicCourses.find((item) => item.slug === slug);
  return { title: course?.title ?? "Course not found", description: course?.summary };
}
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = publicCourses.find((item) => item.slug === slug);
  if (!course) notFound();
  return <WebsiteCourseDetail course={course} />;
}
