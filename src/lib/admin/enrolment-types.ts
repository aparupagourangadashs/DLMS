export type EnrolRowResult = {
    line: number;
    email: string;
    name: string;
    batch: string;
    /** ready: would be enrolled (dry run); enrolled: done; skipped: nothing to do; error: needs fixing. */
    status: "ready" | "enrolled" | "skipped" | "error";
    message: string;
    newAccount: boolean;
};

export type EnrolBatchOption = { id: string; name: string; course: string };
