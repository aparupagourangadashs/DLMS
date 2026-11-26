import type { AssetType } from "@/generated/prisma/client";
import type { ReportColumn, ReportRow } from "@/lib/admin/reports";
import { formatNumber } from "@/lib/format";
import { sourceLabels } from "@/server/admin/resources/leads";
import { prisma } from "@/server/db";
import { assetLabel } from "@/server/services/assets";
import "server-only";
import { SCAN_LIMIT, dayEnd, dayStart, share, type Runner } from "./shared";

export const leadSources: Runner = async (query) => {
    const groups = await prisma.lead.groupBy({ by: ["source", "stage"], where: { createdAt: { gte: dayStart(query.from), lt: dayEnd(query.to) } }, _count: { _all: true } });
    const rows = (Object.keys(sourceLabels) as Array<keyof typeof sourceLabels>).map((source): ReportRow => {
        const mine = groups.filter((group) => group.source === source);
        const enquiries = mine.reduce((n, group) => n + group._count._all, 0);
        const converted = mine.filter((group) => group.stage === "CONVERTED").reduce((n, group) => n + group._count._all, 0);
        return { source: sourceLabels[source], enquiries, converted, conversion: share(converted, enquiries) };
    });
    const enquiries = rows.reduce((n, row) => n + Number(row.enquiries), 0);
    const converted = rows.reduce((n, row) => n + Number(row.converted), 0);
    const top = [...rows].sort((a, b) => Number(b.enquiries) - Number(a.enquiries))[0];
    const columns: ReportColumn[] = [
        { key: "source", label: "Source" }, { key: "enquiries", label: "Enquiries", kind: "number" },
        { key: "converted", label: "Converted", kind: "number" }, { key: "conversion", label: "Conversion", kind: "percent" },
    ];
    return {
        columns,
        rows,
        summary: [
            { label: "Enquiries", value: formatNumber(enquiries) },
            { label: "Converted", value: formatNumber(converted) },
            { label: "Conversion", value: enquiries ? `${share(converted, enquiries)}%` : "\u2014" },
            { label: "Top source", value: enquiries && top ? String(top.source) : "\u2014" },
        ],
        chart: enquiries ? { title: "Enquiries by source", seriesLabel: "Enquiries", labels: rows.map((row) => String(row.source)), values: rows.map((row) => Number(row.enquiries)) } : null,
    };
};

const megabytes = (bytes: number) => Math.round((bytes / 1_048_576) * 100) / 100;

/** Equal files share one stored copy, so each stored file counts once, under the type of the asset that first added it. */
export const storageConsumption: Runner = async (query) => {
    const found = await prisma.asset.findMany({
        where: { status: "READY", storageKey: { not: null }, sizeBytes: { not: null } },
        select: { type: true, storageKey: true, sizeBytes: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: SCAN_LIMIT + 1,
    });
    const stored = new Map<string, { type: AssetType; bytes: number; createdAt: Date }>();
    for (const asset of found.slice(0, SCAN_LIMIT)) if (asset.storageKey && !stored.has(asset.storageKey)) stored.set(asset.storageKey, { type: asset.type, bytes: asset.sizeBytes ?? 0, createdAt: asset.createdAt });
    const start = dayStart(query.from);
    const end = dayEnd(query.to);
    const byType = new Map<AssetType, { files: number; bytes: number; added: number; addedBytes: number }>();
    for (const file of stored.values()) {
        const entry = byType.get(file.type) ?? { files: 0, bytes: 0, added: 0, addedBytes: 0 };
        entry.files += 1;
        entry.bytes += file.bytes;
        if (file.createdAt >= start && file.createdAt < end) {
            entry.added += 1;
            entry.addedBytes += file.bytes;
        }
        byType.set(file.type, entry);
    }
    const rows = [...byType].map(([type, entry]): ReportRow => ({ type: assetLabel(type), files: entry.files, size: megabytes(entry.bytes), added: entry.added, addedSize: megabytes(entry.addedBytes) }));
    const total = [...byType.values()].reduce((n, entry) => ({ files: n.files + entry.files, bytes: n.bytes + entry.bytes, added: n.added + entry.added, addedBytes: n.addedBytes + entry.addedBytes }), { files: 0, bytes: 0, added: 0, addedBytes: 0 });
    const columns: ReportColumn[] = [
        { key: "type", label: "Asset type" }, { key: "files", label: "Stored files", kind: "number" }, { key: "size", label: "Stored size", kind: "size" },
        { key: "added", label: "Files added in the period", kind: "number" }, { key: "addedSize", label: "Size added in the period", kind: "size" },
    ];
    const size = (bytes: number) => (bytes >= 1_073_741_824 ? `${Math.round((bytes / 1_073_741_824) * 100) / 100} GB` : `${megabytes(bytes)} MB`);
    return {
        columns,
        rows,
        truncated: found.length > SCAN_LIMIT,
        summary: [
            { label: "Stored files", value: formatNumber(total.files) },
            { label: "Stored size", value: size(total.bytes) },
            { label: "Files added", value: formatNumber(total.added) },
            { label: "Size added", value: size(total.addedBytes) },
        ],
        chart: rows.length ? { title: "Stored size by asset type (MB)", seriesLabel: "Stored size (MB)", labels: rows.map((row) => String(row.type)), values: rows.map((row) => Number(row.size)) } : null,
    };
};
