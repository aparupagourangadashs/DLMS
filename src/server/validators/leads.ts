import { z } from "zod";

const text = (label: string, max: number) => z.string().trim().min(1, `${label} is required.`).max(max, `Use at most ${max} characters.`);

export const bulkBookEnquirySchema = z.object({
    firstName: text("First name", 60),
    lastName: text("Last name", 60),
    email: z.email("Enter a valid email address.").max(254),
    countryCode: z.string().trim().regex(/^\+\d{1,4}$/, "Use a code such as +91.").default("+91"),
    mobile: z.string().trim().regex(/^[\d\s-]{6,15}$/, "Enter a valid mobile number."),
    address: text("Address", 300),
    city: text("City", 80),
    pincode: z.string().trim().regex(/^[A-Za-z0-9 -]{3,10}$/, "Enter a valid postal code."),
    book: text("Publication", 300),
    quantity: z.coerce.number().int("Enter a whole number.").min(1, "Order at least 1 copy.").max(1000, "For more than 1,000 copies please contact IBMV directly."),
    consent: z.literal(true, { error: "Please agree to be contacted about this request." }),
    // Bots tend to fill every field; humans never see this one. It is checked after validation so bots get no hint.
    website: z.string().max(200).optional().default(""),
    startedAt: z.number().int().optional(),
});

export type BulkBookEnquiryInput = z.infer<typeof bulkBookEnquirySchema>;
