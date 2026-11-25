// Shapes the public website components render; produced by the server services from the database.
export type PublicCollection = {
    slug: string;
    title: string;
    short: string;
    description: string;
    color: string;
};

export type PublicCourse = {
    slug: string;
    title: string;
    summary: string;
    collection: string;
    language: string;
    mode: string;
    duration: string;
    instructor: string;
    color: string;
    officialUrl: string;
    image: { src: string; width: number; height: number };
};

export type PublicCourseDetail = PublicCourse & {
    description: string | null;
    priceLabel: string | null;
    certificateOffered: boolean;
    comingSoon: boolean;
    enrollmentUrl: string | null;
    startDate: string | null;
    endDate: string | null;
    scheduleNote: string | null;
    eligibility: string | null;
    materials: string | null;
    audience: string | null;
    assessmentPlan: string | null;
    requirements: string | null;
    faqs: { question: string; answer: string }[];
};

export type PublicBook = {
    id: string;
    title: string;
    language: string;
    image: { src: string; width: number; height: number };
    links: { format: string; retailer: string; url: string }[];
};

export type PublicTestimonial = { id: string; name: string; image: string | null; excerpt: string; sourceUrl: string | null };

export type PublicVideo = { id: string; youtubeId: string; speaker: string; title: string; image: string };

export type PublicPerson = { id: string; name: string; roleTitle: string; bio: string | null; image: string | null };

export type PublicMagazine = { id: string; title: string; issueLabel: string | null; issueDate: string | null; language: string; cover: string | null; url: string | null };

export type PublicLegalDocument = { title: string; body: string; version: number; publishedAt: string | null };
