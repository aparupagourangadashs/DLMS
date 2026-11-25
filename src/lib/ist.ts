// India has no daylight saving, so a fixed +05:30 offset is exact. Sessions are stored as UTC instants and entered/shown as IST wall-clock.
const IST_OFFSET_MS = 330 * 60_000;

/** The IST calendar date and time of a UTC instant. */
export function toIst(instant: Date) {
    const iso = new Date(instant.getTime() + IST_OFFSET_MS).toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** The UTC instant for an IST wall-clock date (YYYY-MM-DD) and time (HH:mm). */
export function fromIst(date: string, time: string) {
    return new Date(new Date(`${date}T${time}:00Z`).getTime() - IST_OFFSET_MS);
}

export const istToday = (now = new Date()) => toIst(now).date;

/** Start (inclusive) and end (exclusive) instants of an IST calendar day. */
export function istDayRange(date: string) {
    const start = fromIst(date, "00:00");
    return { start, end: new Date(start.getTime() + 86_400_000) };
}

export const addDays = (date: string, days: number) => new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
