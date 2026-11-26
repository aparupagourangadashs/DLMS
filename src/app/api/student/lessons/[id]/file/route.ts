import { apiHandler } from "@/server/http/handler";
import { recordDownload, showsInline } from "@/server/services/assets";
import { openLessonFile } from "@/server/services/learner-content";
import { fileResponse } from "@/server/storage/serve";

// Streams a file lesson's file to a learner enrolled in its course, with Range support for audio and video.
export const GET = apiHandler<{ id: string }, "learner">(
    async ({ request, params, user }) => {
        const asset = await openLessonFile(user.id, params.id);
        const range = request.headers.get("range");
        // A seek or a resumed download is not a new download.
        if (!range || /^bytes=0-/.test(range)) await recordDownload(asset.id);
        const download = new URL(request.url).searchParams.get("download") === "1";
        return fileResponse(request, {
            key: asset.storageKey,
            size: asset.sizeBytes,
            mime: asset.mimeType ?? "application/octet-stream",
            fileName: asset.fileName ?? asset.name,
            inline: showsInline(asset.type) && !download,
        });
    },
    { auth: "learner" },
);
