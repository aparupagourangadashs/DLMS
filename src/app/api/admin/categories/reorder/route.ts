import { assertCan } from "@/server/auth/assert";
import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { reorderCategories } from "@/server/services/categories";

export const POST = apiHandler<Record<string, never>, "staff">(
    async ({ request, user, ip }) => {
        assertCan(user, "categories", "write");
        return reorderCategories(await readJson(request), { id: user.id, ip });
    },
    { auth: "staff" },
);
