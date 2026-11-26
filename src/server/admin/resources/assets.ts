import type { Asset, Prisma } from "@/generated/prisma/client";
import { formatBytes, isLinkType } from "@/lib/admin/assets";
import type { Row } from "@/lib/admin/types";
import { toIst } from "@/lib/ist";
import { youtubeId } from "@/lib/video";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { Conflict, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { assetLabel, assetSummary, assetTypeFromLabel, assetUsage, purgeStaged, releaseFile, unusedAssets, uploadedId, usedAssets } from "@/server/services/assets";
import { labelMap, staffOptions } from "@/server/services/lookups";
import { z } from "zod";
import { optionalHttpsUrl } from "./helpers";

const schema = z.object({
    type: z.string().min(1, "Choose the asset type."),
    name: z.string().trim().min(1, "Enter the asset name.").max(200),
    description: z.string().trim().max(2000).default(""),
    localFile: z.string().default(""),
    link: optionalHttpsUrl.default(""),
});
type Input = z.output<typeof schema>;

const hostOf = (url: string) => {
    try {
        return new URL(url).host;
    } catch {
        return "";
    }
};

function toRow(asset: Asset, uses: number, staff: Map<string, string>): Row {
    const file = asset.sizeBytes === null ? null : { id: asset.id, name: asset.fileName ?? asset.name, size: asset.sizeBytes };
    return {
        id: asset.id,
        name: asset.name,
        fileName: asset.fileName ?? hostOf(asset.url ?? ""),
        description: asset.description ?? "",
        type: assetLabel(asset.type),
        uploadedBy: asset.uploadedById ? staff.get(asset.uploadedById) ?? "" : "",
        uploadedOn: toIst(asset.createdAt).date,
        sizeLabel: asset.sizeBytes === null ? "—" : formatBytes(asset.sizeBytes),
        usage: uses > 0 ? "Used" : "Unused",
        downloads: asset.downloads,
        link: asset.url ?? "",
        localFile: file ? JSON.stringify(file) : "",
    };
}

async function present(asset: Asset): Promise<Row> {
    const [uses, staff] = await Promise.all([assetUsage([asset.id]), staffOptions()]);
    return toRow(asset, uses.get(asset.id) ?? 0, labelMap(staff));
}

async function list(query: ListQuery): Promise<ListResult> {
    await purgeStaged();
    const and: Prisma.AssetWhereInput[] = [{ status: "READY" }];
    if (query.q) and.push({ OR: [{ name: { contains: query.q } }, { fileName: { contains: query.q } }, { description: { contains: query.q } }] });
    if (query.filters.type) {
        const type = assetTypeFromLabel(query.filters.type);
        and.push(type ? { type } : { id: "none" });
    }
    if (query.filters.usage === "Used") and.push(usedAssets);
    if (query.filters.usage === "Unused") and.push(unusedAssets);
    const where: Prisma.AssetWhereInput = { AND: and };
    const dir = query.sort?.dir ?? "desc";
    const [rows, total, staff, summary] = await Promise.all([
        prisma.asset.findMany({ where, orderBy: query.sort?.key === "downloads" ? { downloads: dir } : { createdAt: dir }, skip: query.skip, take: query.take }),
        prisma.asset.count({ where }),
        staffOptions(),
        assetSummary(),
    ]);
    const uses = await assetUsage(rows.map((r) => r.id));
    const names = labelMap(staff);
    return { rows: rows.map((r) => toRow(r, uses.get(r.id) ?? 0, names)), total, summary };
}

async function load(id: string) {
    const asset = await prisma.asset.findFirst({ where: { id, status: "READY" } });
    if (!asset) throw new NotFound();
    return asset;
}

/** The stored address of a link asset: a YouTube watch address, or any https address. */
function linkAddress(label: string, link: string) {
    if (!link) throw new ValidationError({ link: "Enter the address." });
    if (label === "YouTube") {
        const id = youtubeId(link);
        if (!id) throw new ValidationError({ link: "Use a YouTube address such as https://www.youtube.com/watch?v=…" });
        return `https://www.youtube.com/watch?v=${id}`;
    }
    return link;
}

function resolveType(data: Input) {
    const type = assetTypeFromLabel(data.type);
    if (!type) throw new ValidationError({ type: "Choose one of the listed asset types." });
    return type;
}

/** The upload this form just made: staged by this staff member, of the chosen type. */
async function stagedUpload(data: Input, ctx: ResourceContext, type: ReturnType<typeof resolveType>) {
    const id = uploadedId(data.localFile);
    if (!id) throw new ValidationError({ localFile: "Choose a file." });
    const staged = await prisma.asset.findFirst({ where: { id, status: "STAGED", uploadedById: ctx.user.id } });
    if (!staged) throw new ValidationError({ localFile: "This upload expired. Choose the file again." });
    if (staged.type !== type) throw new ValidationError({ type: `The file you uploaded is ${assetLabel(staged.type)}, not ${data.type}. Choose the file again.` });
    return staged;
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const data = parseWith(schema, input);
    const type = resolveType(data);
    let asset: Asset;
    if (isLinkType(data.type)) {
        asset = await prisma.asset.create({
            data: { type, name: data.name, description: data.description || null, status: "READY", url: linkAddress(data.type, data.link), uploadedById: ctx.user.id },
        });
    } else {
        const staged = await stagedUpload(data, ctx, type);
        asset = await prisma.asset.update({ where: { id: staged.id }, data: { name: data.name, description: data.description || null, status: "READY" } });
    }
    await writeAudit({ actorId: ctx.user.id, action: "asset.create", entity: "Asset", entityId: asset.id, after: { name: asset.name, type: data.type }, ip: ctx.ip });
    return present(asset);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const data = parseWith(schema, input);
    const type = resolveType(data);
    if (isLinkType(data.type) !== isLinkType(assetLabel(existing.type))) throw new ValidationError({ type: "A file cannot become a link, or the other way round. Add a new asset instead." });

    let asset: Asset;
    if (isLinkType(data.type)) {
        asset = await prisma.asset.update({ where: { id }, data: { type, name: data.name, description: data.description || null, url: linkAddress(data.type, data.link) } });
    } else {
        if (type !== existing.type) throw new ValidationError({ type: "The type of a file cannot change. Add a new asset instead." });
        const replacement = uploadedId(data.localFile);
        if (replacement && replacement !== id) {
            const staged = await stagedUpload(data, ctx, type);
            asset = await prisma.$transaction(async (tx) => {
                await tx.asset.delete({ where: { id: staged.id } });
                return tx.asset.update({
                    where: { id },
                    data: {
                        name: data.name,
                        description: data.description || null,
                        fileName: staged.fileName,
                        storageKey: staged.storageKey,
                        mimeType: staged.mimeType,
                        sizeBytes: staged.sizeBytes,
                        sha256: staged.sha256,
                    },
                });
            });
            if (existing.storageKey !== staged.storageKey) await releaseFile(existing.storageKey);
        } else {
            asset = await prisma.asset.update({ where: { id }, data: { name: data.name, description: data.description || null } });
        }
    }
    await writeAudit({ actorId: ctx.user.id, action: "asset.update", entity: "Asset", entityId: id, before: { name: existing.name }, after: { name: asset.name }, ip: ctx.ip });
    return present(asset);
}

async function remove(id: string, ctx: ResourceContext) {
    const existing = await load(id);
    const uses = (await assetUsage([id])).get(id) ?? 0;
    if (uses > 0) throw new Conflict(`This asset is used in ${uses} ${uses === 1 ? "place" : "places"} (lessons, banners, events or blogs). Remove it there first.`);
    await prisma.asset.delete({ where: { id } });
    await releaseFile(existing.storageKey);
    await writeAudit({ actorId: ctx.user.id, action: "asset.delete", entity: "Asset", entityId: id, before: { name: existing.name, type: assetLabel(existing.type) }, ip: ctx.ip });
}

export const assetResource: ResourceDef = {
    key: "learning/asset-library",
    resource: "assets",
    sortableKeys: ["uploadedOn", "downloads"],
    list,
    get: async (id) => present(await load(id)),
    create,
    update,
    remove,
};
