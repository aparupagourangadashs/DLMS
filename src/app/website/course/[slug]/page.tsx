import { WebsiteCourseDetail } from "@/components/website/WebsiteCourseDetail";
import { getCourseDetail, listCollections } from "@/server/services/public/catalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseDetail(slug);
  return { title: course?.title ?? "Course not found", description: course?.summary };
}
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseDetail(slug);
  if (!course) notFound();
  const collection = (await listCollections()).find((item) => item.slug === course.collection);
  return <WebsiteCourseDetail course={course} collectionTitle={collection?.title ?? "Courses"} />;
}
