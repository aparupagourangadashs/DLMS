import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

export const failure = (error: unknown, fallback = "Something went wrong. Please try again.") => (error instanceof ApiError ? error.message : fallback);

/** Form errors from the server, keyed by the form's field names. Other failures are shown as a message. */
export function formErrors(error: unknown, rename: Record<string, string> = {}) {
    if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        if (error.status !== 400) toast.error(error.message);
        return Object.fromEntries(Object.entries(error.fields).map(([key, message]) => [rename[key] ?? key, message]));
    }
    toast.error(failure(error));
    return undefined;
}
