/** A banner as the website and the student portal show it. */
export type PublicBanner = {
    id: string;
    /** Also the image's description for screen readers. */
    name: string;
    description: string;
    imageUrl: string;
    /** Where it leads, or null for a banner without a link. */
    href: string | null;
    /** True for another website; those open in a new tab. */
    external: boolean;
};
