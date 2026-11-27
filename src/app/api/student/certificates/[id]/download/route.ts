import { getSessionUser } from "@/server/auth/session";
import { errorResponse } from "@/server/http/handler";
import { getCertificateFile } from "@/server/services/learner-certificates";
import { fileResponse } from "@/server/storage/serve";

type Params = { id: string };
export async function GET(request: Request, context: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user || user.kind !== "LEARNER") return new Response("Not found", { status: 404 });
    const { id } = await context.params;
    const asset = await getCertificateFile(user.id, id);
    return fileResponse(request, {
      key: asset.storageKey!,
      size: asset.sizeBytes ?? 0,
      mime: asset.mimeType ?? "image/svg+xml",
      fileName: asset.fileName ?? "certificate.svg",
      inline: false,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
