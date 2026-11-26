"use client";

import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { assetExtensions, formatBytes, type UploadedFile } from "@/lib/admin/assets";
import type { FormField } from "@/lib/admin/types";
import { Check, FolderOpen, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

/** Posts the file to the Asset Library and reports progress; resolves with the reference the form keeps. */
function send(file: File, type: string, onProgress: (percent: number) => void) {
    return new Promise<UploadedFile>((resolve, reject) => {
        const body = new FormData();
        body.append("type", type);
        body.append("file", file);
        const request = new XMLHttpRequest();
        request.open("POST", "/api/admin/uploads");
        request.responseType = "json";
        request.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
        };
        request.onerror = () => reject(new Error("The upload could not be sent. Check your connection and try again."));
        request.onload = () => (request.status === 201 ? resolve(request.response.data) : reject(new Error(request.response?.error?.message ?? "The upload failed. Please try again.")));
        request.send(body);
    });
}

function readUploaded(value: string): UploadedFile | null {
    try {
        const parsed = JSON.parse(value || "null") as Partial<UploadedFile> | null;
        return parsed && typeof parsed.id === "string" ? { id: parsed.id, name: String(parsed.name ?? ""), size: Number(parsed.size ?? 0) } : null;
    } catch {
        return null;
    }
}

/** A file field that uploads as soon as a file is chosen. The form keeps `{ id, name, size }` and the server finishes the job on save. */
export function UploadFile({ field, value, assetType, change, fileError, error }: {
    field: FormField;
    value: string;
    /** The asset type chosen in the form, when the field's type follows it. */
    assetType?: string;
    change: (value: string) => void;
    fileError: (error: string) => void;
    error?: string;
}) {
    const typeLabel = field.upload === "asset" ? assetType ?? "" : field.upload ?? "";
    const extensions = assetExtensions[typeLabel] ?? [];
    const maxMb = field.max ?? 25;
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [percent, setPercent] = useState(0);
    const uploaded = readUploaded(value);

    const choose = async (file: File | undefined) => {
        change("");
        fileError("");
        if (!file) return;
        const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
        if (!extensions.includes(extension) || file.size === 0 || file.size > maxMb * 1024 * 1024) {
            fileError(`Choose a ${typeLabel} file (${extensions.join(", ")}) from 1 byte up to ${maxMb} MB.`);
            if (input.current) input.current.value = "";
            return;
        }
        setBusy(true);
        setPercent(0);
        try {
            change(JSON.stringify(await send(file, typeLabel, setPercent)));
        } catch (caught) {
            fileError(caught instanceof Error ? caught.message : "The upload failed. Please try again.");
            if (input.current) input.current.value = "";
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="min-w-0 space-y-3 rounded-2xl border-2 border-dashed border-accent/30 bg-accent/5 p-3 focus-within:border-accent sm:p-4">
                <div className="min-w-0">
                    <p className="text-sm font-semibold">Choose a file{typeLabel ? ` (${typeLabel})` : ""}</p>
                    <p className="mt-0.5 break-words text-xs text-muted">{extensions.join(" · ")} · up to {maxMb} MB</p>
                </div>
                <input
                    ref={input}
                    id={`f-${field.key}`}
                    type="file"
                    accept={extensions.join(",")}
                    disabled={busy || extensions.length === 0}
                    required={field.required && !uploaded}
                    aria-invalid={!!error}
                    aria-describedby={`f-${field.key}-${error ? "error" : "help"}`}
                    className={`${inputClass} h-auto min-w-0 py-2 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-accent file:px-2 file:py-1.5 file:text-xs file:font-semibold file:text-accent-fg`}
                    onChange={(e) => void choose(e.target.files?.[0])}
                />
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted"><FolderOpen className="size-3.5 shrink-0" aria-hidden="true" />The file uploads as soon as you choose it.</p>
            </div>
            {busy ? (
                <div role="status" className="space-y-1">
                    <progress value={percent} max={100} aria-label="Upload progress" className="h-2 w-full" />
                    <p className="text-xs text-muted">Uploading… {percent}%</p>
                </div>
            ) : null}
            <p id={`f-${field.key}-help`} className="text-xs text-muted">The file is added to the Asset Library when you save this form.</p>
            {uploaded && !busy ? (
                <>
                    <div className="flex items-start gap-2 rounded-xl border border-border bg-surface-muted p-3">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                        <p className="min-w-0 break-all text-sm">{uploaded.name}<span className="mt-1 block text-xs text-muted">{formatBytes(uploaded.size)} · uploaded</span></p>
                    </div>
                    <Button size="sm" variant="soft-danger" onClick={() => { change(""); fileError(""); if (input.current) input.current.value = ""; }}>
                        <Trash2 className="size-3.5" aria-hidden="true" />Remove file
                    </Button>
                </>
            ) : null}
        </div>
    );
}
