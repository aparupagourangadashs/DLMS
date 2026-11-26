import { assertCan } from "@/server/auth/assert";
import { AppError, ValidationError } from "@/server/http/errors";
import { apiHandler, created } from "@/server/http/handler";
import { maxUploadBytes, uploadAsset } from "@/server/services/assets";

// Takes one file for the Asset Library form. The file is stored at once but only becomes an asset when the form is saved.
export const POST = apiHandler<Record<string, never>, "staff">(
    async ({ request, user }) => {
        assertCan(user, "assets", "write");
        // Fail before buffering a body that is clearly too large; a little extra allows for the form fields.
        if (Number(request.headers.get("content-length") ?? 0) > maxUploadBytes() + 1_048_576) throw new AppError(413, "TOO_LARGE", `Files can be up to ${Math.round(maxUploadBytes() / 1_048_576)} MB.`);
        const form = await request.formData().catch(() => null);
        const file = form?.get("file");
        if (!form || !(file instanceof File)) throw new ValidationError({ localFile: "Choose a file." });
        return created(await uploadAsset({ file, type: String(form.get("type") ?? "") }, user));
    },
    { auth: "staff" },
);
