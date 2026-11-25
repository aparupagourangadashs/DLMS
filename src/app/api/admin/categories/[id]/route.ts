import { assertCan } from "@/server/auth/assert";
import { apiHandler, noContent } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { deleteCategory, updateCategory } from "@/server/services/categories";

export const PATCH = apiHandler<{ id: string }, "staff">(
    async ({ request, params, user, ip }) => {
        assertCan(user, "categories", "write");
        return updateCategory(params.id, await readJson(request), { id: user.id, ip });
    },
    { auth: "staff" },
);

export const DELETE = apiHandler<{ id: string }, "staff">(
    async ({ params, user, ip }) => {
        assertCan(user, "categories", "delete");
        await deleteCategory(params.id, { id: user.id, ip });
        return noContent();
    },
    { auth: "staff" },
);
