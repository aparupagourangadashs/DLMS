import officialCourses from "./official-courses.json" with { type: "json" };

export const collections = [
  { slug: "bhagavata-mahavidyalaya", title: "ISKCON Board of Examination Courses", short: "Structured shastric study", description: "Study the Bhagavad-gita and Srimad-Bhagavatam through Bhakti Shastri, Bhakti Vaibhava and Bhakti Vedanta courses, grounded in Srila Prabhupada's teachings.", color: "plum" },
  { slug: "self-study", title: "Vedvarsity · Self-study Courses", short: "Study at your own pace", description: "Deepen your understanding of Vaishnava literature with self-study courses on the Ramayana, Mahabharata, Gaudiya texts, Sanskrit and devotional practice.", color: "teal" },
  { slug: "ancient-wisdom", title: "Ancient Wisdom", short: "Scripture and daily life", description: "Explore the Bhagavad-gita, yoga, devotion and the nature of the self through focused studies that connect Vedic philosophy with the questions of daily life.", color: "gold" },
  { slug: "kids-parents", title: "Kids & Parents", short: "Learning for the family", description: "Bring spiritual learning into family life through courses on parenting, stories from scripture, Vaishnava songs and Vedic maths for young learners.", color: "rose" },
  { slug: "level-wise", title: "Level Wise Shastric Study", short: "A progressive learning path", description: "Follow a level-wise approach to shastric education, from introductory reading and Sanskrit to correspondence study in Bhakti Shastri and Bhakti Vaibhava.", color: "blue" },
  { slug: "live-classes", title: "Live Classes", short: "Guided online learning", description: "Join scheduled courses on the Bhagavad-gita, Srimad-Bhagavatam and other sacred texts. Explore each offering for its language, teacher and upcoming batch details.", color: "teal" },
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
  { question: "Where should I begin?", answer: "Choose from six collections to match your interests and experience. Vedvarsity and Ancient Wisdom offer self-study subjects; Board of Examination courses and Level Wise Shastric Study provide structured pathways. Check each course for prerequisites." },
  { question: "How do I enroll in a course?", answer: "Open the course details and follow the official IBMV course link to check current batches, fees, eligibility and enrollment. Registration and payments are handled on the official IBMV website, not on this page." },
  { question: "Can I study at my own pace?", answer: "Vedvarsity, Ancient Wisdom and Kids & Parents include self-study courses. Live classes follow a schedule. Confirm access periods, language and study requirements on the official page for your chosen course." },
  { question: "Will I receive a certificate?", answer: "Many IBMV offerings include a certificate, subject to their completion and assessment requirements. Please confirm the certificate details on the official course page before enrolling." },
];
