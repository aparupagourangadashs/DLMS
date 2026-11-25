import officialCourses from "./official-courses.json" with { type: "json" };
import { filterPublicCourses, institutionLinks, publicFaq, staticPageSlugs } from "./static";
import type { PublicCourse } from "./types";

export const collections = [
  { slug: "bhagavata-mahavidyalaya", title: "ISKCON Board of Examination Courses", short: "Structured shastric study", description: "Study the Bhagavad-gita and Srimad-Bhagavatam through Bhakti Shastri, Bhakti Vaibhava and Bhakti Vedanta courses, grounded in Srila Prabhupada's teachings.", color: "plum" },
  { slug: "self-study", title: "Vedvarsity · Self-study Courses", short: "Study at your own pace", description: "Deepen your understanding of Vaishnava literature with self-study courses on the Ramayana, Mahabharata, Gaudiya texts, Sanskrit and devotional practice.", color: "teal" },
  { slug: "ancient-wisdom", title: "Ancient Wisdom", short: "Scripture and daily life", description: "Explore the Bhagavad-gita, yoga, devotion and the nature of the self through focused studies that connect Vedic philosophy with the questions of daily life.", color: "gold" },
  { slug: "kids-parents", title: "Kids & Parents", short: "Learning for the family", description: "Bring spiritual learning into family life through courses on parenting, stories from scripture, Vaishnava songs and Vedic maths for young learners.", color: "rose" },
  { slug: "level-wise", title: "Level Wise Shastric Study", short: "A progressive learning path", description: "Follow a level-wise approach to shastric education, from introductory reading and Sanskrit to correspondence study in Bhakti Shastri and Bhakti Vaibhava.", color: "blue" },
  { slug: "live-classes", title: "Live Classes", short: "Guided online learning", description: "Join scheduled courses on the Bhagavad-gita, Srimad-Bhagavatam and other sacred texts. Explore each offering for its language, teacher and upcoming batch details.", color: "teal" },
] as const;

export type CollectionSlug = (typeof collections)[number]["slug"];
export type { PublicCourse };

export const publicCourses: PublicCourse[] = officialCourses.map((course) => {
  const collection = collections[course.group];
  if (!collection) throw new Error(`Unknown collection for ${course.title}`);
  const url = new URL(course.officialUrl);
  return {
    slug: url.pathname.replace("/course-details/", "").toLowerCase(),
    title: course.title,
    summary: collection.description,
    collection: collection.slug,
    language: /\bhindi\b|हिंदी|हिन्दी/i.test(course.title) ? "Hindi" : /\benglish\b/i.test(course.title) ? "English" : "Not listed",
    mode: [1, 2, 3].includes(course.group) ? "Self-paced" : collection.title,
    duration: course.duration ?? "Not listed",
    instructor: course.instructor ?? "Not listed",
    color: collection.color,
    officialUrl: course.officialUrl,
    image: { src: course.src, width: course.width, height: course.height },
  };
});

export const publicPages = [
  ...collections.map((item) => item.slug),
  ...staticPageSlugs,
];

export { filterPublicCourses, institutionLinks, publicFaq };

export const publicBooks = [
  { title: "SRIMAD BHAGAVATA MAHAPURANAM - Vol 1", language: "English", image: "/website/books/vol1.webp" },
  { title: "SRIMAD BHAGAVATA MAHAPURANAM - Vol 2", language: "English", image: "/website/books/vol2.webp" },
  { title: "Sri Damodar Lila", language: "English", image: "/website/books/shridamodarlila.webp" },
  { title: "Yayaati Charitra", language: "Hindi", image: "/website/books/yayaati.webp" },
  { title: "Bhakti Yog", language: "Hindi", image: "/website/books/bhaktiyog.webp" },
  { title: "Putna Uddhar", language: "Hindi", image: "/website/books/putna.webp" },
  { title: "Bhishma Stuti", language: "Hindi", image: "/website/books/bhisma.webp" },
  { title: "Grihastho ke Sadachar", language: "Hindi", image: "/website/books/gahestu.webp" },
  { title: "Ajamil Upakhyan", language: "Hindi", image: "/website/books/ajamil.webp" },
];
