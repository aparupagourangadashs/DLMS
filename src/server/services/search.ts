import { MIN_QUERY, type SearchGroup, type SearchHit } from "@/lib/admin/search";
import { sourceLabels } from "@/server/admin/resources/leads";
import { can, roleLabels, type Permission } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import "server-only";

const PER_GROUP = 5;

type Viewer = Pick<SessionUser, "role" | "branchIds">;
type Source = { key: string; label: string; section: string; permission: Permission; find: (q: string, viewer: Viewer) => Promise<SearchHit[]> };

// Staff tied to branches reach only their own branches' learners and staff, and their branches' batches plus the unassigned ones.
const isScoped = (viewer: Viewer) => viewer.role !== "SUPER_ADMIN" && viewer.branchIds.length > 0;
const pretty = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
const joined = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" \u00b7 ");
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}\u2026` : text);
/** A list opens with its search box filled in, which puts the record at the top. */
const listLink = (path: string, text: string) => `${path}?q=${encodeURIComponent(text)}`;

const sources: Source[] = [
    {
        key: "learners", label: "Learners", section: "users", permission: "learners:read",
        async find(q, viewer) {
            const rows = await prisma.learnerProfile.findMany({
                where: {
                    AND: [
                        { user: { kind: "LEARNER" } },
                        isScoped(viewer) ? { branchId: { in: viewer.branchIds } } : {},
                        { OR: [{ name: { contains: q } }, { registrationNo: { contains: q } }, { user: { email: { contains: q } } }, { user: { phone: { contains: q } } }] },
                    ],
                },
                select: { userId: true, name: true, registrationNo: true, user: { select: { email: true } } },
                orderBy: { name: "asc" },
                take: PER_GROUP,
            });
            return rows.map((row) => ({ id: row.userId, title: row.name, subtitle: joined(row.registrationNo, row.user.email), href: listLink("/admin/users/learners", row.registrationNo ?? row.user.email) }));
        },
    },
    {
        key: "team", label: "Team", section: "users", permission: "team:read",
        async find(q, viewer) {
            const rows = await prisma.user.findMany({
                where: {
                    AND: [
                        { kind: "STAFF" },
                        isScoped(viewer) ? { staffProfile: { branchId: { in: viewer.branchIds } } } : {},
                        { OR: [{ email: { contains: q } }, { phone: { contains: q } }, { staffProfile: { displayName: { contains: q } } }] },
                    ],
                },
                select: { id: true, email: true, role: true, staffProfile: { select: { displayName: true } } },
                orderBy: { email: "asc" },
                take: PER_GROUP,
            });
            return rows.map((row) => ({ id: row.id, title: row.staffProfile?.displayName ?? row.email, subtitle: joined(roleLabels[row.role], row.email), href: listLink("/admin/users/team", row.email) }));
        },
    },
    {
        key: "courses", label: "Courses", section: "products", permission: "courses:read",
        async find(q) {
            const rows = await prisma.course.findMany({ where: { OR: [{ title: { contains: q } }, { slug: { contains: q } }] }, select: { id: true, title: true, status: true }, orderBy: { title: "asc" }, take: PER_GROUP });
            return rows.map((row) => ({ id: row.id, title: row.title, subtitle: pretty(row.status), href: listLink("/admin/products/courses", row.title) }));
        },
    },
    {
        key: "batches", label: "Batches", section: "learning", permission: "batches:read",
        async find(q, viewer) {
            const rows = await prisma.batch.findMany({
                where: {
                    AND: [
                        isScoped(viewer) ? { OR: [{ branchId: { in: viewer.branchIds } }, { branchId: null }] } : {},
                        { OR: [{ name: { contains: q } }, { course: { title: { contains: q } } }] },
                    ],
                },
                select: { id: true, name: true, status: true, course: { select: { title: true } } },
                orderBy: { name: "asc" },
                take: PER_GROUP,
            });
            return rows.map((row) => ({ id: row.id, title: row.name, subtitle: joined(row.course.title, pretty(row.status)), href: listLink("/admin/learning/batches", row.name) }));
        },
    },
    {
        key: "events", label: "Events", section: "products", permission: "events:read",
        async find(q) {
            const rows = await prisma.event.findMany({ where: { name: { contains: q } }, select: { id: true, name: true, status: true }, orderBy: { name: "asc" }, take: PER_GROUP });
            return rows.map((row) => ({ id: row.id, title: row.name, subtitle: pretty(row.status), href: listLink("/admin/products/events", row.name) }));
        },
    },
    {
        key: "announcements", label: "Announcements", section: "learning", permission: "announcements:read",
        async find(q) {
            const rows = await prisma.announcement.findMany({ where: { title: { contains: q } }, select: { id: true, title: true, status: true }, orderBy: { createdAt: "desc" }, take: PER_GROUP });
            return rows.map((row) => ({ id: row.id, title: row.title, subtitle: pretty(row.status), href: listLink("/admin/learning/announcements", row.title) }));
        },
    },
    {
        key: "blogs", label: "Blog articles", section: "marketing", permission: "blogs:read",
        async find(q) {
            const rows = await prisma.blog.findMany({ where: { OR: [{ title: { contains: q } }, { slug: { contains: q } }] }, select: { id: true, title: true, status: true }, orderBy: { createdAt: "desc" }, take: PER_GROUP });
            return rows.map((row) => ({ id: row.id, title: row.title, subtitle: pretty(row.status), href: listLink("/admin/marketing/blogs", row.title) }));
        },
    },
    {
        key: "leads", label: "Leads", section: "marketing", permission: "leads:read",
        async find(q) {
            const rows = await prisma.lead.findMany({
                where: { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] },
                select: { id: true, name: true, email: true, source: true },
                orderBy: { createdAt: "desc" },
                take: PER_GROUP,
            });
            return rows.map((row) => ({ id: row.id, title: row.name, subtitle: joined(row.email, sourceLabels[row.source]), href: listLink("/admin/marketing/leads", row.email) }));
        },
    },
    {
        key: "support", label: "Support requests", section: "engage", permission: "supportRequests:read",
        async find(q) {
            const rows = await prisma.supportRequest.findMany({
                where: { OR: [{ name: { contains: q } }, { email: { contains: q } }, { message: { contains: q } }] },
                select: { id: true, name: true, message: true },
                orderBy: { createdAt: "desc" },
                take: PER_GROUP,
            });
            return rows.map((row) => ({ id: row.id, title: row.name, subtitle: clip(row.message, 80), href: `/admin/engage/support?open=${encodeURIComponent(row.id)}` }));
        },
    },
    {
        key: "assets", label: "Assets", section: "learning", permission: "assets:read",
        async find(q) {
            const rows = await prisma.asset.findMany({ where: { name: { contains: q } }, select: { id: true, name: true, type: true }, orderBy: { name: "asc" }, take: PER_GROUP });
            return rows.map((row) => ({ id: row.id, title: row.name, subtitle: pretty(row.type), href: listLink("/admin/learning/asset-library", row.name) }));
        },
    },
    {
        key: "modules", label: "Modules", section: "learning", permission: "modules:read",
        async find(q) {
            const rows = await prisma.module.findMany({ where: { name: { contains: q } }, select: { id: true, name: true, status: true }, orderBy: { name: "asc" }, take: PER_GROUP });
            return rows.map((row) => ({ id: row.id, title: row.name, subtitle: pretty(row.status), href: listLink("/admin/learning/module-library", row.name) }));
        },
    },
    {
        key: "banners", label: "Banners", section: "marketing", permission: "banners:read",
        async find(q) {
            const rows = await prisma.banner.findMany({ where: { name: { contains: q } }, select: { id: true, name: true, status: true }, orderBy: { name: "asc" }, take: PER_GROUP });
            return rows.map((row) => ({ id: row.id, title: row.name, subtitle: pretty(row.status), href: listLink("/admin/marketing/marketing-banners", row.name) }));
        },
    },
    {
        key: "testimonials", label: "Testimonials", section: "marketing", permission: "testimonials:read",
        async find(q) {
            const rows = await prisma.testimonial.findMany({ where: { name: { contains: q } }, select: { id: true, name: true, city: true }, orderBy: { name: "asc" }, take: PER_GROUP });
            return rows.map((row) => ({ id: row.id, title: row.name, subtitle: row.city ?? "", href: listLink("/admin/marketing/testimonials", row.name) }));
        },
    },
    {
        key: "books", label: "Books", section: "website", permission: "siteContent:read",
        async find(q) {
            const rows = await prisma.book.findMany({ where: { title: { contains: q } }, select: { id: true, title: true, status: true }, orderBy: { title: "asc" }, take: PER_GROUP });
            return rows.map((row) => ({ id: row.id, title: row.title, subtitle: pretty(row.status), href: listLink("/admin/website/books", row.title) }));
        },
    },
    {
        key: "people", label: "People on the website", section: "website", permission: "siteContent:read",
        async find(q) {
            const rows = await prisma.person.findMany({ where: { name: { contains: q } }, select: { id: true, name: true, group: true }, orderBy: { name: "asc" }, take: PER_GROUP });
            return rows.map((row) => ({ id: row.id, title: row.name, subtitle: pretty(row.group), href: listLink("/admin/website/people", row.name) }));
        },
    },
];

/** Records that match, in groups, from the screens this person may open. A group with no match is left out. */
export async function searchRecords(text: string, viewer: Viewer): Promise<SearchGroup[]> {
    const q = text.trim().slice(0, 100);
    if (q.length < MIN_QUERY) return [];
    const allowed = sources.filter((source) => can(viewer.role, source.permission));
    const found = await Promise.all(allowed.map(async (source) => ({ key: source.key, label: source.label, section: source.section, hits: await source.find(q, viewer) })));
    return found.filter((group) => group.hits.length > 0);
}
