import officialCourses from "./official-courses.json" with { type: "json" };

export const collections = [
  { slug: "bhagavata-mahavidyalaya", title: "ISKCON Board of Examination", short: "Structured study", description: "Explore the pathway of systematic shastric learning.", color: "plum" },
  { slug: "self-study", title: "Vedvarsity · Self-study Courses", short: "At your own pace", description: "Make a little space for learning, wherever life takes you.", color: "teal" },
  { slug: "ancient-wisdom", title: "Ancient Wisdom", short: "Ideas for everyday life", description: "Bring thoughtful questions to timeless themes.", color: "gold" },
  { slug: "kids-parents", title: "Kids & Parents", short: "Grow together", description: "Discover meaningful ways to read and reflect as a family.", color: "rose" },
  { slug: "level-wise", title: "Level Wise Shastric Study", short: "One step at a time", description: "Build a foundation before moving to deeper study.", color: "blue" },
  { slug: "live-classes", title: "Live Classes", short: "Learn in good company", description: "A place for guided learning and thoughtful conversation.", color: "teal" },
] as const;

export type CollectionSlug = (typeof collections)[number]["slug"];
export type PublicCourse = {
  slug: string; title: string; summary: string; collection: CollectionSlug;
  language: string; mode: string; duration: string; instructor: string;
  color: string; officialUrl: string;
  image: { src: string; width: number; height: number };
};

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
  "books", "e-magazines", "iskcon-bhagavata-mahavidyalaya", "srila-prabhupada",
  "our-advisory-board-members", "our-team", "contact", "account", "terms", "privacy",
];

export const institutionLinks = [
  { slug: "iskcon-bhagavata-mahavidyalaya", title: "About IBMV" },
  { slug: "srila-prabhupada", title: "Srila Prabhupada" },
  { slug: "our-advisory-board-members", title: "Advisory Board" },
  { slug: "our-team", title: "Our Team" },
];

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

export function filterPublicCourses(items: PublicCourse[], filters: { query: string; language: string; format: string; teacher: string }) {
  const query = filters.query.trim().toLocaleLowerCase("en");
  return items.filter((course) =>
    (!query || `${course.title} ${course.summary} ${course.instructor}`.toLocaleLowerCase("en").includes(query))
    && (filters.language === "all" || course.language === filters.language)
    && (filters.format === "all" || course.mode === filters.format)
    && (filters.teacher === "all" || course.instructor === filters.teacher));
}

export const publicFaq = [
  { question: "Where should I begin?", answer: "Explore the six collections and choose a subject and learning format that feels approachable. Course names and artwork come from IBMV's public website; use each official course link to confirm the current offering." },
  { question: "Can I enroll or pay on this website?", answer: "Not in this preview. Official course links are identified as external. Checkout, eligibility checks and payment confirmation must be connected before enrollment is available here." },
  { question: "Can I study at my own pace?", answer: "The catalog distinguishes self-paced and guided study formats. Actual access periods and schedules must be confirmed for the selected offering." },
  { question: "Will I receive a certificate?", answer: "Certificate eligibility depends on the official offering and assessment rules. Please check the linked IBMV course page. This design preview does not issue certificates or grant learning access." },
];
