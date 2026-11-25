// Shared by the server (validation, completion) and the student screens. No server-only imports here.

export type LearnerProfileDto = {
    registrationNo: string;
    name: string;
    username: string;
    dob: string;
    gender: string;
    parentName: string;
    parentEmail: string;
    parentPhone: string;
    standard: string;
    mobile: string;
    alternate: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    permanent: string;
    source: string;
};

export type LearnerPreferencesDto = {
    timezone: string;
    timezoneAuto: boolean;
    sessionReminder1Hour: boolean;
    sessionReminder1Day: boolean;
    sessionReminderStart: boolean;
    promotional: boolean;
    whatsapp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
};

export const genderOptions = [
    { value: "", label: "Prefer not to say" },
    { value: "female", label: "Female" },
    { value: "male", label: "Male" },
    { value: "other", label: "Other" },
];

export const sourceOptions = [
    { value: "", label: "Not specified" },
    { value: "website", label: "Website" },
    { value: "friend", label: "Friend or family" },
    { value: "other", label: "Other" },
];

export const commonTimezones = [
    "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Kathmandu", "Asia/Dhaka", "Asia/Colombo",
    "Asia/Tokyo", "Asia/Hong_Kong", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow", "Africa/Johannesburg",
    "Africa/Nairobi", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto",
    "America/Sao_Paulo", "Australia/Perth", "Australia/Sydney", "Pacific/Auckland", "UTC",
];

export const profileChecklist = [
    { key: "name", label: "Student name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "mobile", label: "Mobile number" },
    { key: "city", label: "City" },
    { key: "address", label: "Residential address" },
] as const;

export function profileCompletion(values: Partial<Record<string, string>>) {
    const completed = profileChecklist.filter(({ key }) => values[key]?.trim()).length;
    return { completed, total: profileChecklist.length, percent: Math.round((completed / profileChecklist.length) * 100) };
}

export function missingProfileItems(values: Partial<Record<string, string>>) {
    return profileChecklist.filter(({ key }) => !values[key]?.trim()).map(({ label }) => label);
}

/**
 * Promotional messages need the promotional switch AND a channel switch; transactional reminders follow their own switches.
 * This is the consent rule every campaign sender must apply.
 */
export function allowedPromotionalChannels(prefs: Pick<LearnerPreferencesDto, "promotional" | "whatsapp" | "email" | "sms" | "push">) {
    if (!prefs.promotional) return [] as Array<"whatsapp" | "email" | "sms" | "push">;
    return (["whatsapp", "email", "sms", "push"] as const).filter((channel) => prefs[channel]);
}

export type SupportRequestDto = {
    id: string;
    message: string;
    status: "Open" | "In progress" | "Resolved";
    createdAt: string;
    replies: Array<{ id: string; body: string; createdAt: string }>;
};
