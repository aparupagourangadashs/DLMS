import { apiHandler } from "@/server/http/handler";
import { recordBlogView } from "@/server/services/public/blogs";

type Params = { slug: string };

// The article page calls this once per visit; the service ignores a visitor's repeats.
export const POST = apiHandler<Params>(
    async ({ params, ip }) => recordBlogView(params.slug, ip),
    { rateLimit: { key: "blog-view", limit: 120, windowMs: 60 * 60_000 } },
);
