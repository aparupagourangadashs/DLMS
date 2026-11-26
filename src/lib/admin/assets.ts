/** Asset types as the Asset Library names them, with what each accepts. Shared by the form and the server. */
export const assetTypeLabels = ["Video", "Audio", "PDF", "YouTube", "Image", "Doc", "Sheet", "Slide", "Text/HTML", "Zip", "SCORM Zip", "Link/Embed", "Epub"] as const;
export type AssetTypeLabel = (typeof assetTypeLabels)[number];

export const linkAssetTypes: readonly AssetTypeLabel[] = ["YouTube", "Link/Embed"];
export const isLinkType = (label: string) => (linkAssetTypes as readonly string[]).includes(label);
export const fileAssetTypes = assetTypeLabels.filter((label) => !isLinkType(label));

/** Lower-case extensions, with the dot, each file type accepts. */
export const assetExtensions: Record<string, string[]> = {
    Video: [".mp4", ".webm"],
    Audio: [".mp3", ".wav", ".ogg"],
    PDF: [".pdf"],
    Image: [".png", ".jpg", ".jpeg", ".webp"],
    Doc: [".doc", ".docx"],
    Sheet: [".xls", ".xlsx", ".csv"],
    Slide: [".ppt", ".pptx"],
    "Text/HTML": [".txt", ".html"],
    Zip: [".zip"],
    "SCORM Zip": [".zip"],
    Epub: [".epub"],
};

export const IMAGE_EXTENSIONS = assetExtensions.Image;

export function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value >= 100 || Number.isInteger(value) ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** What an uploaded form field holds once its file is on the server. */
export type UploadedFile = { id: string; name: string; size: number };
