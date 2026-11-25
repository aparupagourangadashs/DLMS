import { apiHandler } from "@/server/http/handler";
import { rateLimit } from "@/server/http/rate-limit";
import { parseJsonBody } from "@/server/http/validate";
import { createBulkBookEnquiry } from "@/server/services/leads";
import { bulkBookEnquirySchema } from "@/server/validators/leads";

export const POST = apiHandler(
    async ({ request, ip }) => {
        const input = await parseJsonBody(request, bulkBookEnquirySchema);
        rateLimit(`bulk-books-email:${input.email.toLowerCase()}`, 3, 60 * 60_000);
        await createBulkBookEnquiry(input, ip);
        // Same reply whether the request was stored or discarded as automated.
        return Response.json({ data: { message: "Thank you. Your request was received and the IBMV team will contact you." } }, { status: 201 });
    },
    { rateLimit: { key: "bulk-books", limit: 8, windowMs: 60 * 60_000 } },
);
