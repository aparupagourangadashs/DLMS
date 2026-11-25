export const lessonTypes = ["Text", "Video", "Link"] as const;

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

/** "5 lessons · 2 videos · 1 link" for the Module Library's Content column. */
export function contentLabel(counts: { total: number; videos: number; links: number }) {
    return [plural(counts.total, "lesson"), ...(counts.videos ? [plural(counts.videos, "video")] : []), ...(counts.links ? [plural(counts.links, "link")] : [])].join(" · ");
}

export const usedInLabel = (courses: number) => (courses === 0 ? "Not used yet" : `Used in ${plural(courses, "course")}`);
