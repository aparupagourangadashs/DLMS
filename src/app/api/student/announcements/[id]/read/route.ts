import { apiHandler, noContent } from "@/server/http/handler";
import { markAnnouncementRead } from "@/server/services/learner-learning";

export const POST = apiHandler<{ id: string }, "learner">(
    async ({ params, user }) => {
        await markAnnouncementRead(user.id, params.id);
        return noContent();
    },
    { auth: "learner" },
);
