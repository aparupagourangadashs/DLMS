/** Choices on the Events form, shared by the form and the server so they cannot drift apart. */
export const eventPlatforms = ["In person", "Zoom", "YouTube Live", "Other online", "Hybrid"] as const;
export const eventCategories = ["Workshop", "Festival", "Retreat", "Quiz", "Other"] as const;
export const membershipLevels = ["Everyone", "Active members", "Premium members"] as const;
export const eventCurrencies = ["INR", "USD", "EUR"] as const;

/** Platforms that need a place, and platforms that need an online link; Hybrid needs both. */
export const needsVenue = (platform: string) => platform === "In person" || platform === "Hybrid";
export const needsLink = (platform: string) => platform !== "In person" && eventPlatforms.includes(platform as (typeof eventPlatforms)[number]);
