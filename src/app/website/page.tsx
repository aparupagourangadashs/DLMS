import { WebsiteHome } from "@/components/website/WebsiteHome";
import { listCollections, listCourses } from "@/server/services/public/catalog";
import { listTestimonials, listVideos } from "@/server/services/public/community";
import { listBooks } from "@/server/services/public/publications";
import { getSiteSettings } from "@/server/services/public/site";

export const metadata = {
    title: "ISKCON Bhagavata Mahavidyalaya",
    description: "A college of Vedic studies in Sri Govardhan dhama. Explore IBMV's shastric courses, self-study learning, live classes and publications, rooted in Srila Prabhupada's teachings.",
};

export default async function WebsiteHomePage() {
    const [collections, courses, books, testimonials, videos, settings] = await Promise.all([
        listCollections(), listCourses(), listBooks(), listTestimonials(), listVideos(), getSiteSettings(),
    ]);
    return <WebsiteHome collections={collections} courses={courses} books={books} testimonials={testimonials} videos={videos} settings={settings} />;
}
