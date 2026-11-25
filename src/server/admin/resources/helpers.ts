import type { PublishStatus } from "@/generated/prisma/client";
import { ValidationError } from "@/server/http/errors";
import { z } from "zod";

export const statusLabels: Record<PublishStatus, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };

export function statusFromLabel(label: string, hiddenAsDraft = false): PublishStatus | undefined {
    const normalized = hiddenAsDraft && label === "Hidden" ? "Draft" : label;
    return (Object.keys(statusLabels) as PublishStatus[]).find((key) => statusLabels[key] === normalized);
}

export function slugify(text: string, max = 120) {
    return text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, max)
        .replace(/-+$/g, "");
}

const SAFE_PATH = /^\/[A-Za-z0-9_\-./]+$/;

/** Public asset paths (`/website/...`) or https URLs; anything else (including `javascript:`) is rejected. */
export const imageRef = z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || ((SAFE_PATH.test(v) && !v.includes("..") && !v.startsWith("//")) || /^https:\/\/[^\s]+$/.test(v)), "Use a site path such as /website/books/cover.webp or an https:// URL.");

export const httpsUrl = z.string().trim().max(500).refine((v) => /^https:\/\/[^\s]+$/.test(v), "Enter a full https:// URL.");
export const optionalHttpsUrl = z.string().trim().max(500).refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Enter a full https:// URL.");

export const yesNo = z.enum(["Yes", "No", ""]).transform((v) => v === "Yes");

/** Optional integer from a form field that may arrive as "" or a string. */
export const optionalInt = (min: number, max: number) =>
    z
        .union([z.string(), z.number(), z.null()])
        .transform((v) => (v === null || v === "" ? null : Number(v)))
        .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), `Enter a whole number from ${min} to ${max}.`);

export const dateOnly = z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))), "Use a valid date.")
    .transform((v) => (v === "" ? null : new Date(`${v}T00:00:00Z`)));

/** Repeat fields arrive from the form as a JSON string. */
export function parseRepeat<S extends z.ZodType>(value: unknown, item: S, max: number, field: string): z.output<S>[] {
    if (value === undefined || value === null || value === "") return [];
    let raw: unknown = value;
    if (typeof value === "string") {
        try {
            raw = JSON.parse(value);
        } catch {
            throw new ValidationError({ [field]: "Could not read this list." });
        }
    }
    if (!Array.isArray(raw) || raw.length > max) throw new ValidationError({ [field]: `Add at most ${max} items.` });
    const items: z.output<S>[] = [];
    raw.forEach((entry, index) => {
        const parsed = item.safeParse(entry);
        if (!parsed.success) throw new ValidationError({ [field]: `Item ${index + 1}: ${parsed.error.issues[0]?.message ?? "invalid"}` });
        items.push(parsed.data);
    });
    return items;
}

export const isoDay = (date: Date | null) => date?.toISOString().slice(0, 10) ?? "";
