import { writeAudit } from "@/server/audit";
import { normalizeEmail } from "@/server/auth/tokens";
import { prisma } from "@/server/db";
import { ValidationError } from "@/server/http/errors";
import { sendEmail } from "@/server/notify/email";
import { notifyStaff } from "@/server/services/notifications";
import { getSiteSettings } from "@/server/services/public/site";
import type { BulkBookEnquiryInput } from "@/server/validators/leads";

const MIN_FILL_MS = 2_500;
const MAX_FILL_MS = 24 * 60 * 60_000;

/** Stores a bulk-book enquiry as a lead. Returns false when it was silently discarded as likely automated. */
export async function createBulkBookEnquiry(input: BulkBookEnquiryInput, ip?: string, now = Date.now()) {
    const looksAutomated =
        input.website.trim() !== "" ||
        (input.startedAt !== undefined && (now - input.startedAt < MIN_FILL_MS || now - input.startedAt > MAX_FILL_MS));
    if (looksAutomated) return false;

    const book = await prisma.book.findFirst({ where: { title: input.book, status: "PUBLISHED" }, select: { title: true } });
    if (!book) throw new ValidationError({ book: "Choose a publication from the list." });

    const email = normalizeEmail(input.email);
    const lead = await prisma.lead.create({
        data: {
            name: `${input.firstName} ${input.lastName}`.trim(),
            email,
            phone: `${input.countryCode} ${input.mobile}`,
            city: input.city,
            source: "BULK_BOOK",
            interest: `${book.title} (bulk, ${input.quantity} copies)`,
            consent: true,
            bulkBook: {
                create: { bookTitle: book.title, quantity: input.quantity, address: input.address, city: input.city, pincode: input.pincode, countryCode: input.countryCode },
            },
        },
    });
    await writeAudit({ action: "lead.create", entity: "Lead", entityId: lead.id, after: { source: "BULK_BOOK", book: book.title, quantity: input.quantity }, ip });
    await notifyStaff("leads:write", { kind: "lead.new", title: `New bulk book enquiry from ${lead.name}`, body: `${input.quantity} copies of ${book.title}`, href: `/admin/marketing/leads?q=${encodeURIComponent(email)}` });

    const { contact } = await getSiteSettings();
    await sendEmail({
        to: email,
        subject: "We received your publication request",
        text: `Hello ${input.firstName},\n\nThank you for your request for ${input.quantity} copies of "${book.title}". The IBMV team will contact you with availability and next steps.\n\nIBMV`,
    });
    await sendEmail({
        to: contact.email,
        subject: "New bulk book enquiry",
        text: `${lead.name} <${email}> asked about ${input.quantity} copies of "${book.title}". Open Marketing > Leads in the admin to follow up.`,
    });
    return true;
}
