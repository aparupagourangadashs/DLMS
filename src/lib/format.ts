const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("en-IN");

// Demo values are stored as IST wall-clock strings; formatting in UTC keeps server and client output identical.
function toDate(value: string) {
  if (value.length <= 10) return new Date(`${value}T00:00:00Z`);
  return new Date(value.length === 16 ? `${value}:00Z` : `${value}Z`);
}

export function formatDate(value: string) {
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? value : dateFmt.format(d);
}

export function formatTime(value: string) {
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? value : timeFmt.format(d);
}

export function formatDateTime(value: string) {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

export const formatINR = (n: number) => inrFmt.format(n);
export const formatNumber = (n: number) => numFmt.format(n);
