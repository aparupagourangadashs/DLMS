import { apiHandler, created, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { createCommunityPost, getCommunityPosts } from "@/server/services/b7";

type Params = { id: string };
export const GET = apiHandler<Params, "learner">(async ({ request, params, user }) => {
  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
  return ok(await getCommunityPosts(user.id, params.id, cursor ?? undefined));
}, { auth: "learner" });
export const POST = apiHandler<Params, "learner">(async ({ request, params, user }) => {
  return created(await createCommunityPost(user.id, params.id, await readJson(request)));
}, { auth: "learner" });
