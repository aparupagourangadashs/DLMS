import type { FormField } from "./types";

export type EditorValues = Record<string, string>;
export const isVisible = (field: FormField, values: EditorValues) =>
  !field.showWhen || field.showWhen.values.includes(values[field.showWhen.key] ?? "");

export function readItems(value?: string): EditorValues[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((v) => v && typeof v === "object") : [];
  } catch { return []; }
}

export function validateEditor(fields: FormField[], values: EditorValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields.filter((field) => isVisible(field, values))) {
    const v = (values[f.key] ?? "").trim();
    if (f.required && !v) errors[f.key] = `${f.label} is required.`;
    else if (f.type === "repeat") {
      const items = readItems(v);
      if (items.length < (f.minItems ?? 0)) errors[f.key] = `Add at least ${f.minItems} ${f.label.toLowerCase()}.`;
      else if (items.some((item) => Object.keys(validateEditor(f.itemFields ?? [], item)).length)) errors[f.key] = `Complete all required ${f.label.toLowerCase()} fields with valid values.`;
    } else if (f.type === "multiselect" && f.required && v === "[]") errors[f.key] = `Choose ${f.label.toLowerCase()}.`;
    else if (v && f.type === "number" && (!Number.isFinite(Number(v)) || (f.min !== undefined && Number(v) < f.min) || (f.max !== undefined && Number(v) > f.max))) errors[f.key] = `Enter a number${f.min !== undefined ? ` ≥ ${f.min}` : ""}${f.max !== undefined ? ` and ≤ ${f.max}` : ""}.`;
    else if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[f.key] = "Enter a valid email address.";
    else if (v && f.type === "url" && !/^https?:\/\/[^\s]+$/i.test(v)) errors[f.key] = "Enter an http:// or https:// link.";
    else if (v && f.type === "tel" && !/^\+?[\d\s-]{8,}$/.test(v)) errors[f.key] = "Enter a valid phone number.";
    else if (v && (f.type === "date" || f.type === "datetime-local") && !Number.isFinite(Date.parse(v))) errors[f.key] = "Choose a valid date.";
  }
  if (values.startDate && values.endDate && values.endDate < values.startDate) errors.endDate = "End date must not precede the start date.";
  if (values.additionalManagers?.split("\n").includes(values.manager)) errors.additionalManagers = "The primary manager cannot also be an additional manager.";
  if (values.days) {
    const days = readItems(values.days);
    if (days.some((d) => d.start && d.end && d.end <= d.start)) errors.days = "Every event day must end after it starts.";
    if (days.some((d, i) => i > 0 && d.start < days[i - 1].end)) errors.days = "Event days must be chronological and must not overlap.";
  }
  if (values.questions && readItems(values.questions).some((q) => q.type === "Choice" && (q.options ?? "").split("\n").filter((v) => v.trim()).length < 2)) errors.questions = "Choice questions need at least two options on separate lines.";
  return errors;
}
