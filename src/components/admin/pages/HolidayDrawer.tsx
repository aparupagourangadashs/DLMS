"use client";

import type { AdminHoliday } from "@/lib/admin/sessions";
import type { FormField } from "@/lib/admin/types";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { formErrors } from "../api-errors";
import { FormDrawer } from "../FormDrawer";

type Props = {
    open: boolean;
    onClose: () => void;
    /** The date the form starts on (IST, YYYY-MM-DD). */
    date: string;
    branches: string[];
    /** Staff tied to branches must name one. */
    branchRequired: boolean;
    onMarked: (holiday: AdminHoliday) => void;
};

/** Marks a day as a holiday: scheduled classes that day are cancelled and learners see it on their calendar. */
export function HolidayDrawer({ open, onClose, date, branches, branchRequired, onMarked }: Props) {
    const fields: FormField[] = [
        { key: "date", label: "Date", type: "date", required: true },
        { key: "reason", label: "Reason", type: "text", required: true, placeholder: "Diwali", help: "Learners see this on their calendar." },
        {
            key: "branch",
            label: "Branch",
            type: "select",
            options: branchRequired ? branches : ["All branches", ...branches],
            required: true,
            help: branchRequired ? "Scheduled sessions of this branch on that day are cancelled." : "All branches cancels the scheduled sessions everywhere on that day.",
        },
    ];

    return (
        <FormDrawer
            open={open}
            title="Mark as Holiday"
            description="Classes scheduled on this day are cancelled and learners see the holiday on their calendar."
            fields={fields}
            initial={{ date, branch: branchRequired ? (branches[0] ?? "") : "All branches" }}
            submitLabel="Mark holiday"
            onClose={onClose}
            onSubmit={async (v) => {
                try {
                    const result = await apiClient.post<{ holiday: AdminHoliday; cancelled: number }>("/api/admin/sessions/holidays", {
                        date: v.date,
                        reason: v.reason,
                        branch: v.branch === "All branches" ? "" : v.branch,
                    });
                    const n = result.data.cancelled;
                    toast.success("Holiday added", { description: n ? `${n} scheduled ${n === 1 ? "session was" : "sessions were"} cancelled.` : "No scheduled sessions were affected." });
                    onMarked(result.data.holiday);
                } catch (caught) {
                    return formErrors(caught);
                }
            }}
        />
    );
}
