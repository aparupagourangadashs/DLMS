import type { PublicCourse } from "./types";

// Copy and helpers that do not depend on the database or the course snapshot.
export const institutionLinks = [
    { slug: "iskcon-bhagavata-mahavidyalaya", title: "About IBMV" },
    { slug: "srila-prabhupada", title: "Srila Prabhupada" },
    { slug: "our-advisory-board-members", title: "Advisory Board" },
    { slug: "our-team", title: "Our Team" },
];

export const staticPageSlugs = [
    "books", "e-magazines", "iskcon-bhagavata-mahavidyalaya", "srila-prabhupada",
    "our-advisory-board-members", "our-team", "contact", "account", "terms", "privacy",
] as const;

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
