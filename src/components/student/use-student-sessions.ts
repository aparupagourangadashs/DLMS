"use client";

import { ApiError, apiClient } from "@/lib/api/client";
import type { StudentSessionsData } from "@/lib/student/learning-types";
import { useCallback, useEffect, useState } from "react";

const REFRESH_MS = 60_000;

type State = { key: string; data: StudentSessionsData | null; error: string };

/**
 * The learner's sessions and holidays between two IST dates (inclusive). A join link only appears shortly before a class,
 * so the data is refreshed every minute while the page is open and visible.
 */
export function useStudentSessions(from: string, to: string, initial?: StudentSessionsData) {
    const key = `${from}|${to}`;
    const [state, setState] = useState<State>({ key: initial ? key : "", data: initial ?? null, error: "" });
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") setTick((n) => n + 1);
        }, REFRESH_MS);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        apiClient
            .get<StudentSessionsData>("/api/student/calendar", { from, to }, { signal: controller.signal })
            .then((result) => setState({ key, data: result.data, error: "" }))
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                setState((prev) => ({ ...prev, key, error: error instanceof ApiError ? error.message : "Could not load your sessions." }));
            });
        return () => controller.abort();
    }, [key, from, to, tick]);

    const refetch = useCallback(() => setTick((n) => n + 1), []);
    const status = state.key !== key ? "loading" : state.error ? "error" : "ready";
    return { data: state.data, status, error: state.error, refetch } as const;
}
