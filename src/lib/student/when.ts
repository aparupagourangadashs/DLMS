import { formatDate, formatTime } from "@/lib/format";
import { toIst } from "@/lib/ist";

/** A stored instant as IST wall-clock text, e.g. "12 Oct 2026, 9:30 am IST". */
export function istDateTime(iso: string) {
    const { date, time } = toIst(new Date(iso));
    return `${formatDate(date)}, ${formatTime(`${date}T${time}`)} IST`;
}

/** The IST calendar date of a stored instant. */
export const istDate = (iso: string) => toIst(new Date(iso)).date;
