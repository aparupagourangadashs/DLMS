import type { Prisma, PublishStatus, Testimonial } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { ValidationError } from "@/server/http/errors";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { contentResource } from "./content";
import { imageRef, optionalHttpsUrl, optionalInt, statusFromLabel, statusLabels } from "./helpers";

const schema = z.object({
    name: z.string().trim().min(2, "Enter the name.").max(120),
    course: z.string().trim().max(300).default(""),
    city: z.string().trim().max(80).default(""),
    format: z.enum(["Text", "Video"], { error: "Choose Text or Video." }),
    quote: z.string().trim().min(5, "Enter the testimonial.").max(3000),
    imageUrl: imageRef.default(""),
    sourceUrl: optionalHttpsUrl.default(""),
    rating: optionalInt(1, 5).default(null),
    status: z.string().default("Hidden"),
    sortOrder: optionalInt(0, 100_000).default(null),
});

// The screen says "Hidden" for what the database stores as Draft.
const label = (status: PublishStatus) => (status === "DRAFT" ? "Hidden" : statusLabels[status]);

export const testimonialResource = contentResource<
    Testimonial,
    Prisma.TestimonialWhereInput,
    Prisma.TestimonialOrderByWithRelationInput[],
    Prisma.TestimonialUncheckedCreateInput
>({
    key: "marketing/testimonials",
    resource: "testimonials",
    entity: "testimonial",
    hiddenAsDraft: true,
    sortableKeys: ["name", "updatedOn"],
    find: (args) => prisma.testimonial.findMany(args),
    count: (where) => prisma.testimonial.count({ where }),
    counts: async (where) => (await prisma.testimonial.groupBy({ by: ["status"], where, _count: { _all: true } })).map((r) => ({ status: r.status, _count: { _all: r._count._all } })),
    get: (id) => prisma.testimonial.findUnique({ where: { id } }),
    create: (data) => prisma.testimonial.create({ data }),
    update: (id, data) => prisma.testimonial.update({ where: { id }, data }),
    setStatus: (id, status) => prisma.testimonial.update({ where: { id }, data: { status } }),
    remove: async (id) => { await prisma.testimonial.delete({ where: { id } }); },
    filters: (query) => (query.q ? [{ OR: [{ name: { contains: query.q } }, { courseTitle: { contains: query.q } }] }] : []),
    withStatus: (status) => ({ status }),
    and: (parts) => ({ AND: parts }),
    orderBy: (query) => {
        const dir = query.sort?.dir ?? "asc";
        return query.sort?.key === "name" ? [{ name: dir }] : query.sort?.key === "updatedOn" ? [{ updatedAt: dir }] : [{ sortOrder: "asc" }, { createdAt: "asc" }];
    },
    parse: (input, existing) => {
        const parsed = parseWith(schema, input);
        const status = statusFromLabel(parsed.status, true);
        if (!status) throw new ValidationError({ status: "Choose Published or Hidden." });
        return {
            status,
            data: {
                name: parsed.name, courseTitle: parsed.course || null, city: parsed.city || null, format: parsed.format, quote: parsed.quote,
                imageUrl: parsed.imageUrl || null, sourceUrl: parsed.sourceUrl || null, rating: parsed.rating, status, sortOrder: parsed.sortOrder ?? existing?.sortOrder ?? 0,
            },
        };
    },
    toRow: (t) => ({
        id: t.id, name: t.name, city: t.city ?? "", course: t.courseTitle ?? "", format: t.format, rating: t.rating, quote: t.quote,
        imageUrl: t.imageUrl ?? "", sourceUrl: t.sourceUrl ?? "", status: label(t.status), sortOrder: t.sortOrder,
        updatedOn: t.updatedAt.toISOString().slice(0, 10),
    }),
    label: (t) => t.name,
});
