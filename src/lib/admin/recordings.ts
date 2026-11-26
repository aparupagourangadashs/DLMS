export const recordingStatuses = ["Available", "Processing", "Failed"] as const;

/** How a class is named in the recording form, e.g. "2026-11-26 19:00 · Demo Batch 1 · Demo class 1". */
export function sessionLabel(parts: { date: string; time: string; batch: string; title: string }) {
    return `${parts.date} ${parts.time} · ${parts.batch} · ${parts.title}`;
}
