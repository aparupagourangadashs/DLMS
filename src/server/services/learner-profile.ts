import type { Prisma } from "@/generated/prisma/client";
import type { LearnerPreferencesDto, LearnerProfileDto } from "@/lib/student/profile";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { NotFound, ValidationError } from "@/server/http/errors";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";

const phone = z.string().trim().regex(/^(\+?[\d\s-]{6,20})?$/, "Enter a valid phone number.");

const realDate = (value: string) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

// Every field is optional so a PATCH can update one group; a field that is present must be valid.
export const learnerProfileSchema = z
    .object({
        name: z.string().trim().min(2, "Enter your name.").max(100),
        username: z
            .string()
            .trim()
            .toLowerCase()
            .refine((v) => v === "" || /^[a-z0-9._-]{3,30}$/.test(v), "Use 3-30 letters, numbers, dots, dashes or underscores."),
        dob: z.string().trim().refine((v) => v === "" || (realDate(v) && v >= "1900-01-01" && v <= new Date().toISOString().slice(0, 10)), "Enter a valid date of birth."),
        gender: z.enum(["", "female", "male", "other"], { error: "Choose one of the listed options." }),
        parentName: z.string().trim().max(100),
        parentEmail: z.string().trim().max(254).refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address."),
        parentPhone: phone,
        standard: z.string().trim().max(40),
        mobile: phone,
        alternate: phone,
        address: z.string().trim().max(300),
        city: z.string().trim().max(80),
        state: z.string().trim().max(80),
        pincode: z.string().trim().regex(/^([A-Za-z0-9][A-Za-z0-9 -]{2,9})?$/, "Enter a valid postal code."),
        permanent: z.string().trim().max(300),
        source: z.enum(["", "website", "friend", "other"], { error: "Choose one of the listed options." }),
        customFields: z.record(z.string(), z.string()).optional(),
    })
    .partial();

const userInclude = { learnerProfile: true } satisfies Prisma.UserInclude;
type LearnerUser = Prisma.UserGetPayload<{ include: typeof userInclude }>;

async function load(userId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, kind: "LEARNER" }, include: userInclude });
    if (!user?.learnerProfile) throw new NotFound();
    return user as LearnerUser & { learnerProfile: NonNullable<LearnerUser["learnerProfile"]> };
}

export function toLearnerProfileDto(user: LearnerUser & { learnerProfile: NonNullable<LearnerUser["learnerProfile"]> }): LearnerProfileDto {
    const p = user.learnerProfile;
    return {
        registrationNo: p.registrationNo ?? "",
        name: p.name,
        username: p.username ?? "",
        dob: p.dateOfBirth?.toISOString().slice(0, 10) ?? "",
        gender: p.gender ?? "",
        parentName: p.parentName ?? "",
        parentEmail: p.parentEmail ?? "",
        parentPhone: p.parentPhone ?? "",
        standard: p.standard ?? "",
        mobile: user.phone ?? "",
        alternate: p.alternateMobile ?? "",
        email: user.email,
        address: p.residentialAddress ?? "",
        city: p.city ?? "",
        state: p.state ?? "",
        pincode: p.pincode ?? "",
        permanent: p.permanentAddress ?? "",
        source: p.studentSource ?? "",
    };
}

export async function getLearnerProfile(userId: string): Promise<LearnerProfileDto> {
    return toLearnerProfileDto(await load(userId));
}

/** The learner's own edit. Email and registration number are read-only here: email is the sign-in identity. */
export async function updateLearnerProfile(userId: string, input: unknown, ip?: string): Promise<LearnerProfileDto> {
    const data = parseWith(learnerProfileSchema, input);
    const user = await load(userId);

    if (data.username) {
        const taken = await prisma.learnerProfile.findFirst({ where: { username: data.username, userId: { not: userId } }, select: { id: true } });
        if (taken) throw new ValidationError({ username: "That username is already taken." });
    }

    const orNull = (value: string | undefined) => (value === undefined ? undefined : value || null);
    const profile: Prisma.LearnerProfileUpdateInput = {
        ...(data.name !== undefined ? { name: data.name } : {}),
        username: orNull(data.username),
        dateOfBirth: data.dob === undefined ? undefined : data.dob ? new Date(`${data.dob}T00:00:00Z`) : null,
        gender: orNull(data.gender),
        parentName: orNull(data.parentName),
        parentEmail: data.parentEmail === undefined ? undefined : data.parentEmail ? data.parentEmail.toLowerCase() : null,
        parentPhone: orNull(data.parentPhone),
        standard: orNull(data.standard),
        alternateMobile: orNull(data.alternate),
        residentialAddress: orNull(data.address),
        permanentAddress: orNull(data.permanent),
        city: orNull(data.city),
        state: orNull(data.state),
        pincode: orNull(data.pincode),
        studentSource: orNull(data.source),
    };

    await prisma.user.update({
        where: { id: userId },
        data: { ...(data.mobile !== undefined ? { phone: data.mobile || null } : {}), learnerProfile: { update: profile } },
    });
    if (data.customFields) {
        const fields = await prisma.customField.findMany({ where: { entity: "LEARNER", placement: "SIGNUP" }, orderBy: { sortOrder: "asc" } });
        for (const field of fields) {
            const value = data.customFields[field.id] ?? "";
            if (field.required && !value.trim()) throw new ValidationError({ [`customFields.${field.id}`]: `${field.label} is required.` });
            if (field.type === "Email" && value && !z.email().safeParse(value).success) throw new ValidationError({ [`customFields.${field.id}`]: "Enter a valid email address." });
            await prisma.customFieldValue.upsert({
                where: { fieldId_entityId: { fieldId: field.id, entityId: user.learnerProfile.id } },
                create: { fieldId: field.id, entityId: user.learnerProfile.id, value },
                update: { value },
            });
        }
    }
    // Field names only: the values are personal data and stay out of the audit log.
    await writeAudit({ actorId: userId, action: "profile.update", entity: "User", entityId: userId, after: { fields: Object.keys(data) }, ip });
    return getLearnerProfile(userId);
}

const validTimezone = (value: string) => {
    try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
    } catch {
        return false;
    }
};

const preferencesSchema = z.object({
    timezone: z.string().trim().refine(validTimezone, "Choose a valid timezone."),
    timezoneAuto: z.boolean(),
    sessionReminder1Hour: z.boolean(),
    sessionReminder1Day: z.boolean(),
    sessionReminderStart: z.boolean(),
    promotional: z.boolean(),
    whatsapp: z.boolean(),
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
});

export async function getLearnerPreferences(userId: string): Promise<LearnerPreferencesDto> {
    const user = await load(userId);
    const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
    return {
        timezone: user.learnerProfile.timezone,
        timezoneAuto: user.learnerProfile.timezoneAuto,
        sessionReminder1Hour: prefs?.sessionReminder1Hour ?? true,
        sessionReminder1Day: prefs?.sessionReminder1Day ?? false,
        sessionReminderStart: prefs?.sessionReminderStart ?? false,
        promotional: prefs?.promotional ?? false,
        whatsapp: prefs?.whatsapp ?? false,
        email: prefs?.email ?? true,
        sms: prefs?.sms ?? false,
        push: prefs?.push ?? false,
    };
}

/** Saves the consent record that every campaign and reminder sender must check. */
export async function saveLearnerPreferences(userId: string, input: unknown, ip?: string): Promise<LearnerPreferencesDto> {
    const { timezone, timezoneAuto, ...flags } = parseWith(preferencesSchema, input);
    const before = await getLearnerPreferences(userId);
    await prisma.$transaction([
        prisma.learnerProfile.update({ where: { userId }, data: { timezone, timezoneAuto } }),
        prisma.notificationPreference.upsert({ where: { userId }, create: { userId, ...flags }, update: flags }),
    ]);
    const after = await getLearnerPreferences(userId);
    const changed = (Object.keys(after) as Array<keyof LearnerPreferencesDto>).filter((key) => before[key] !== after[key]);
    await writeAudit({ actorId: userId, action: "preferences.update", entity: "User", entityId: userId, before: pick(before, changed), after: pick(after, changed), ip });
    return after;
}

function pick<T extends object>(source: T, keys: Array<keyof T>) {
    return Object.fromEntries(keys.map((key) => [key, source[key]]));
}
