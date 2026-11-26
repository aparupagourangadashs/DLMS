/** Filter values for people who have no staff account: learners acting on their own data, and visitors or the system. */
export const ACTOR_LEARNERS = "__learners";
export const ACTOR_SYSTEM = "__system";

export type AuditRow = {
    id: string;
    /** The moment the event happened, as an ISO instant. */
    at: string;
    actorId: string | null;
    actorName: string;
    actorEmail: string | null;
    actorRole: string | null;
    action: string;
    label: string;
    entity: string;
    entityId: string | null;
    ip: string | null;
    summary: string;
    before: unknown;
    after: unknown;
};

export type AuditOptions = {
    actions: Array<{ value: string; label: string }>;
    entities: string[];
    actors: Array<{ value: string; label: string }>;
};

const labels: Record<string, string> = {
    export: "List exported",
    "settings.website": "Website settings changed",
    "support.create": "Support request sent",
    "support.reply": "Support reply sent",
    "learner.password_reset": "Password reset link sent",
    "user.password_reset": "Password reset",
    "user.password_change": "Password changed",
    "profile.update": "Profile updated",
    "preferences.update": "Preferences updated",
    "attendance.mark": "Attendance marked",
    "team.create": "Team member added",
    "team.update": "Team member updated",
    "enrolment.create": "Learner enrolled",
};

const verbs: Record<string, string> = {
    create: "created",
    update: "updated",
    delete: "deleted",
    archive: "archived",
    restore: "restored",
    register: "registered",
    cancel: "cancelled",
    reorder: "reordered",
    mark: "marked",
    reply: "replied to",
    publish: "published",
    unpublish: "unpublished",
    reschedule: "rescheduled",
    status: "status changed",
    stage: "stage changed",
};

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** A readable name for an action code such as `batch.create`. */
export function describeAction(action: string) {
    const known = labels[action];
    if (known) return known;
    const [subject, ...rest] = action.split(".");
    const noun = capitalise(subject.replace(/_/g, " "));
    const verb = rest.join(" ");
    return verb ? `${noun} ${verbs[verb] ?? verb.replace(/_/g, " ")}` : noun;
}

const pairs = (value: unknown): Array<[string, unknown]> => (value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value) : []);

function show(value: unknown) {
    if (value === null || value === undefined) return "none";
    if (typeof value === "string") return value === "" ? "empty" : value.length > 40 ? `${value.slice(0, 40)}…` : value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "item" : "items"}`;
    return "…";
}

/** A one-line account of what changed: the new values, with the old ones beside any that were replaced. */
export function summarizeChange(before: unknown, after: unknown, max = 3) {
    const was = new Map(pairs(before));
    const now = pairs(after);
    const parts = (now.length > 0 ? now : pairs(before)).map(([key, value]) => {
        const name = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
        const changed = now.length > 0 && was.has(key) && JSON.stringify(was.get(key)) !== JSON.stringify(value);
        return changed ? `${name}: ${show(was.get(key))} \u2192 ${show(value)}` : `${name}: ${show(value)}`;
    });
    const shown = parts.slice(0, max).join(" \u00b7 ");
    return parts.length > max ? `${shown} \u00b7 +${parts.length - max} more` : shown;
}
