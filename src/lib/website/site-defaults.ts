// Starting values for the editable website settings; stored values override these.
export type SocialLink = { icon: string; label: string; href: string };
export type HeroStat = { value: number; suffix: string; label: string; detail: string };
export type CommunityFigure = { value: string; label: string; color: string };

export type SiteSettings = {
    contact: { email: string; phone: string; phoneDial: string; address: string; mapUrl: string; officialContactUrl: string };
    social: SocialLink[];
    links: {
        donate: string;
        officialSite: string;
        officialBooks: string;
        app: string;
        whatsappCommunity: string;
        telegramCommunity: string;
        videoPlaylist: string;
        testimonialsSource: string;
    };
    hero: { reportedLearners: string; stats: HeroStat[] };
    communityFigures: CommunityFigure[];
};

export const siteSettingKeys = ["contact", "social", "links", "hero", "communityFigures"] as const;
export type SiteSettingKey = (typeof siteSettingKeys)[number];

export const defaultSiteSettings: SiteSettings = {
    contact: {
        email: "info@iskconbm.org",
        phone: "+91 95280 06565",
        phoneDial: "+919528006565",
        address: "",
        mapUrl: "",
        officialContactUrl: "https://www.ibmedu.org/contact",
    },
    social: [
        { icon: "instagram", label: "Instagram", href: "https://www.instagram.com/ibmedu/" },
        { icon: "facebook", label: "Facebook", href: "https://www.facebook.com/ibmedu.org/" },
        { icon: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/iskcon-bhagavata-mahavidyalaya-b160a4250" },
        { icon: "x", label: "X (Twitter)", href: "https://twitter.com/IskconBhagavata" },
        { icon: "whatsapp", label: "WhatsApp", href: "https://wa.me/+919528006565" },
        { icon: "youtube", label: "YouTube", href: "https://www.youtube.com/channel/UCCumR1TKFJMqL0J88tnB53A" },
    ],
    links: {
        donate: "https://donation.ibmedu.org/",
        officialSite: "https://www.ibmedu.org/",
        officialBooks: "https://www.ibmedu.org/books",
        app: "https://play.google.com/store/apps/details?id=com.edmingle.iskconbhagavatamahavidyalaya",
        whatsappCommunity: "https://chat.whatsapp.com/JoCb24xIIJ31f9t1KNrh3W",
        telegramCommunity: "https://t.me/+R3ecNqESCwmxJIJt",
        videoPlaylist: "https://www.youtube.com/playlist?list=PLSoiyHqcjc8QGqsS9wKkSQbutg1E1WEox",
        testimonialsSource: "https://www.ibmedu.org/#testimonial",
    },
    hero: {
        reportedLearners: "31,500+",
        stats: [
            { value: 31500, suffix: "+", label: "Students taught", detail: "Online and onsite courses" },
            { value: 250, suffix: "+", label: "Courses", detail: "Across six collections" },
            { value: 42, suffix: "+", label: "Countries", detail: "Learners worldwide" },
            { value: 100, suffix: "K+", label: "Community", detail: "Members and followers" },
        ],
    },
    communityFigures: [
        { value: "22,291+", label: "Active students", color: "teal" },
        { value: "250+", label: "Courses", color: "gold" },
        { value: "100K+", label: "Community members", color: "blue" },
        { value: "42+", label: "Countries", color: "rose" },
    ],
};
