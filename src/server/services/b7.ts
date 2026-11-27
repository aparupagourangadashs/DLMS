import { z } from "zod";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { Conflict, Forbidden, NotFound, ValidationError } from "@/server/http/errors";
import type { SessionUser } from "@/server/auth/session";

export async function listCommunitiesForStaff() {
  const rows = await prisma.community.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: { _count: { select: { members: true, posts: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((row) => ({ id: row.id, name: row.name, description: row.description, layout: row.layout, status: row.status, memberCount: row._count.members, postCount: row._count.posts }));
}

export async function listMyCommunities(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, kind: true } });
  if (!user) throw new Forbidden();
  const rows = await prisma.community.findMany({
    where: { status: "ACTIVE", members: { some: { userId, status: "ACTIVE" } } },
    include: { _count: { select: { members: true, posts: { where: { status: "VISIBLE" } } } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((row) => ({ id: row.id, name: row.name, description: row.description, layout: row.layout, memberCount: row._count.members, postCount: row._count.posts }));
}

export async function getCommunityPosts(userId: string, communityId: string, cursor?: string) {
  const member = await prisma.communityMember.findFirst({ where: { communityId, userId, status: "ACTIVE" } });
  if (!member) throw new Forbidden();
  const rows = await prisma.communityPost.findMany({
    where: { communityId, parentId: null, status: "VISIBLE", ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
    include: {
      author: { select: { staffProfile: { select: { displayName: true } }, learnerProfile: { select: { name: true } } } },
      replies: {
        where: { status: "VISIBLE" },
        orderBy: { createdAt: "asc" },
        take: 5,
        include: { author: { select: { staffProfile: { select: { displayName: true } }, learnerProfile: { select: { name: true } } } } },
      },
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 20,
  });
  const nameOf = (author: { staffProfile: { displayName: string } | null; learnerProfile: { name: string } | null }) => author.staffProfile?.displayName ?? author.learnerProfile?.name ?? "Learner";
  return {
    posts: rows.map((post) => ({
      id: post.id,
      body: post.body,
      pinned: post.pinned,
      createdAt: post.createdAt.toISOString(),
      author: nameOf(post.author),
      replies: post.replies.map((reply) => ({ id: reply.id, body: reply.body, pinned: false, createdAt: reply.createdAt.toISOString(), author: nameOf(reply.author) })),
    })),
    nextCursor: rows.length === 20 ? rows[rows.length - 1].createdAt.toISOString() : null,
  };
}

const postSchema = z.object({ body: z.string().trim().min(1).max(5000), parentId: z.string().optional().default("") });

export async function createCommunityPost(userId: string, communityId: string, input: unknown) {
  const data = postSchema.safeParse(input);
  if (!data.success) throw new ValidationError(Object.fromEntries(data.error.issues.map((issue) => [issue.path.join(".") || "_", issue.message])));
  const member = await prisma.communityMember.findFirst({ where: { communityId, userId, status: "ACTIVE" } });
  if (!member) throw new Forbidden();
  if (data.data.parentId) {
    const parent = await prisma.communityPost.findFirst({ where: { id: data.data.parentId, communityId, status: "VISIBLE" } });
    if (!parent) throw new NotFound();
  }
  return prisma.communityPost.create({
    data: { communityId, authorId: userId, parentId: data.data.parentId || null, body: data.data.body },
  });
}

export async function createCommunity(user: SessionUser, ip: string, input: unknown) {
  const parsed = z.object({ name: z.string().trim().min(2).max(200), description: z.string().trim().min(1).max(5000), layout: z.enum(["MESSAGE", "FEED"]).default("MESSAGE") }).safeParse(input);
  if (!parsed.success) throw new ValidationError(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join(".") || "_", issue.message])));
  if (await prisma.community.findUnique({ where: { name: parsed.data.name } })) throw new Conflict("A community with this name already exists.");
  const row = await prisma.community.create({ data: { ...parsed.data, members: { create: { userId: user.id, role: "MODERATOR" } } } });
  await writeAudit({ actorId: user.id, action: "community.create", entity: "Community", entityId: row.id, after: { name: row.name }, ip });
  return row;
}

export async function addCommunityMember(user: SessionUser, ip: string, communityId: string, learnerId: string) {
  const profile = await prisma.learnerProfile.findUnique({ where: { id: learnerId }, select: { userId: true } });
  if (!profile) throw new ValidationError({ learnerId: "Choose an existing learner." });
  const membership = await prisma.communityMember.upsert({
    where: { communityId_userId: { communityId, userId: profile.userId } },
    update: { status: "ACTIVE" },
    create: { communityId, userId: profile.userId, role: "MEMBER" },
  });
  await writeAudit({ actorId: user.id, action: "community.member.add", entity: "Community", entityId: communityId, after: { learnerId }, ip });
  return membership;
}

export async function removeCommunityMember(user: SessionUser, ip: string, communityId: string, memberUserId: string) {
  await prisma.communityMember.update({ where: { communityId_userId: { communityId, userId: memberUserId } }, data: { status: "REMOVED" } });
  await writeAudit({ actorId: user.id, action: "community.member.remove", entity: "Community", entityId: communityId, after: { memberUserId }, ip });
}
