import { can } from "@/server/auth/permissions";
import { getSessionUser } from "@/server/auth/session";
import { errorResponse } from "@/server/http/handler";
import { findStoredAsset, isPublicAsset, recordDownload, showsInline } from "@/server/services/assets";
import { fileResponse } from "@/server/storage/serve";

// Images are public (they appear on the website). Every other file needs a staff session with access to assets;
// learners reach files through the lessons that use them.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const asset = await findStoredAsset(id);
        if (!asset) return new Response("Not found", { status: 404 });
        const open = isPublicAsset(asset.type);
        if (!open) {
            const user = await getSessionUser();
            if (!user || user.kind !== "STAFF" || !can(user.role, "assets:read")) return new Response("Not found", { status: 404 });
        }
        const range = request.headers.get("range");
        // A seek or a resumed download is not a new download.
        if (!open && (!range || /^bytes=0-/.test(range)) && request.method === "GET") await recordDownload(asset.id);
        const download = new URL(request.url).searchParams.get("download") === "1";
        return fileResponse(request, {
            key: asset.storageKey,
            size: asset.sizeBytes,
            mime: asset.mimeType ?? "application/octet-stream",
            fileName: asset.fileName ?? asset.name,
            inline: showsInline(asset.type) && !download,
            publicCache: open && asset.sha256 ? { etag: asset.sha256 } : undefined,
        });
    } catch (error) {
        return errorResponse(error);
    }
}

export { GET as HEAD };

