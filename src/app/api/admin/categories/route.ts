import { assertCan } from "@/server/auth/assert";
import { apiHandler, created } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { createCategory, listCategoryTree } from "@/server/services/categories";

export const GET = apiHandler<Record<string, never>, "staff">(
    async ({ user }) => {
        assertCan(user, "categories", "read");
        return listCategoryTree();
    },
    { auth: "staff" },
);

export const POST = apiHandler<Record<string, never>, "staff">(
    async ({ request, user, ip }) => {
        assertCan(user, "categories", "write");
        return created(await createCategory(await readJson(request), { id: user.id, ip }));
    },
    { auth: "staff" },
);
