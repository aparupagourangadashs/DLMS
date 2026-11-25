import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { NotFound, ValidationError } from "@/server/http/errors";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";

export type MyProfileDto = Record<
  "name" | "username" | "dob" | "gender" | "mobile" | "altMobile" | "email" | "permanentAddress" | "state" | "city" | "pincode" | "residentialAddress" | "timezone" | "notifications",
  string
>;

export const timezoneLabels: Record<string, string> = {
  "Asia/Kolkata": "Asia/Kolkata (IST, UTC+05:30)",
  "Europe/London": "Europe/London",
  "America/New_York": "America/New_York",
  "Asia/Dubai": "Asia/Dubai",
};

const genders = ["Female", "Male", "Prefer not to say"] as const;
export const notificationChoices = ["Email and WhatsApp", "Email only", "WhatsApp only", "None"] as const;

const phone = z.string().trim().regex(/^(\+?[\d\s-]{8,20})?$/, "Enter a valid mobile number.");

const timezoneFromLabel = (label: string) => Object.entries(timezoneLabels).find(([, text]) => text === label)?.[0] ?? label;

const schema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(100),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, "Use 3-30 letters, numbers, dots, dashes or underscores."),
  dob: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && Date.parse(v) <= Date.now()), "Enter a valid date of birth."),
  gender: z.string().refine((v) => v === "" || (genders as readonly string[]).includes(v), "Choose one of the listed options."),
  mobile: phone.min(1, "Mobile is required."),
  altMobile: phone,
  permanentAddress: z.string().trim().max(300),
  residentialAddress: z.string().trim().max(300),
  state: z.string().trim().max(80),
  city: z.string().trim().max(80),
  pincode: z.string().trim().regex(/^(\d{6})?$/, "Pincode must be 6 digits."),
  timezone: z.string().transform(timezoneFromLabel).refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid timezone."),
  notifications: z.string().refine((v) => (notificationChoices as readonly string[]).includes(v), "Choose one of the listed options."),
});

type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;

async function load(userId: string) {
  return prisma.user.findFirst({ where: { id: userId, kind: "STAFF" }, include: { staffProfile: true } });
}

function toDto(user: Loaded): MyProfileDto {
  const profile = user.staffProfile;
  const prefs = (profile?.notificationPrefs ?? {}) as { channels?: string };
  const timezone = profile?.timezone ?? "Asia/Kolkata";
  return {
    name: profile?.displayName ?? "",
    username: profile?.username ?? "",
    dob: profile?.dateOfBirth?.toISOString().slice(0, 10) ?? "",
    gender: profile?.gender ?? "",
    mobile: user.phone ?? "",
    altMobile: profile?.alternateMobile ?? "",
    email: user.email,
    permanentAddress: profile?.permanentAddress ?? "",
    state: profile?.state ?? "",
    city: profile?.city ?? "",
    pincode: profile?.pincode ?? "",
    residentialAddress: profile?.residentialAddress ?? "",
    timezone: timezoneLabels[timezone] ?? timezone,
    notifications: prefs.channels ?? "Email and WhatsApp",
  };
}

export async function getMyProfile(userId: string) {
  const user = await load(userId);
  if (!user) throw new NotFound();
  return toDto(user);
}

export async function updateMyProfile(userId: string, input: unknown, ip?: string) {
  const data = parseWith(schema, input);
  const user = await load(userId);
  if (!user) throw new NotFound();

  const taken = await prisma.staffProfile.findFirst({ where: { username: data.username, userId: { not: userId } }, select: { id: true } });
  if (taken) throw new ValidationError({ username: "That username is already taken." });

  await prisma.user.update({
    where: { id: userId },
    data: {
      phone: data.mobile || null,
      staffProfile: {
        update: {
          displayName: data.name,
          username: data.username,
          dateOfBirth: data.dob ? new Date(`${data.dob}T00:00:00Z`) : null,
          gender: data.gender || null,
          alternateMobile: data.altMobile || null,
          permanentAddress: data.permanentAddress || null,
          residentialAddress: data.residentialAddress || null,
          state: data.state || null,
          city: data.city || null,
          pincode: data.pincode || null,
          timezone: data.timezone,
          notificationPrefs: { channels: data.notifications },
        },
      },
    },
  });
  await writeAudit({ actorId: userId, action: "profile.update", entity: "User", entityId: userId, ip });
  return getMyProfile(userId);
}
