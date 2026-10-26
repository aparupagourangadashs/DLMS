"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, CalendarDays, Check, FileImage, FileText, Film, FolderOpen, ListChecks, Music, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { cardCycle, palette } from "@/lib/colors";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { DatePicker, DateTimePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { MarkdownEditor } from "./MarkdownEditor";
import type { FormField } from "@/lib/admin/types";
import { isVisible, readItems, validateEditor, type EditorValues } from "@/lib/admin/editor-validation";

const formats: Record<string, string> = {
  Video: ".mp4,.webm", Audio: ".mp3,.wav,.ogg", PDF: ".pdf", Image: ".png,.jpg,.jpeg,.webp",
  Doc: ".doc,.docx", Sheet: ".xls,.xlsx,.csv", Slide: ".ppt,.pptx", "Text/HTML": ".txt,.html",
  Zip: ".zip", "SCORM Zip": ".zip", Epub: ".epub",
};

function LocalFile({ field, value, assetType, change, fileError, error }: {
  field: FormField; value: string; assetType?: string; change: (value: string) => void; fileError: (error: string) => void; error?: string;
}) {
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const accept = formats[assetType ?? ""] ?? field.accept ?? ".png,.jpg,.jpeg,.webp";
  let metadata: { name?: string; size?: number } = {};
  try { metadata = JSON.parse(value || "{}"); } catch { /* Legacy rows have no local file metadata. */ }
  const FileIcon = assetType === "Video" ? Film : assetType === "Audio" ? Music : assetType === "Image" || field.key === "image" ? FileImage : FileText;
  return <div className="space-y-2">
    <div className="min-w-0 space-y-3 rounded-2xl border-2 border-dashed border-accent/30 bg-accent/5 p-3 focus-within:border-accent sm:p-4">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", palette.sky.solid)}><FileIcon className="size-6" aria-hidden="true" /></span>
        <div className="min-w-0"><p className="text-sm font-semibold">Choose a local {assetType?.toLowerCase() ?? "file"}</p><p className="mt-0.5 break-words text-xs text-muted">{accept.split(",").join(" · ")} · up to {field.max ?? 25} MB</p></div>
      </div>
    <input ref={input} id={`f-${field.key}`} type="file" accept={accept} className={`${inputClass} h-auto min-w-0 py-2 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-accent file:px-2 file:py-1.5 file:text-xs file:font-semibold file:text-accent-fg`}
      required={field.required} aria-invalid={!!error} aria-describedby={`f-${field.key}-${error ? "error" : "help"}`} onChange={(e) => {
        const file = e.target.files?.[0];
        setSelected(null); setPreview(""); change(""); fileError("");
        if (!file) return;
        const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
        const mediaKind = assetType === "Video" ? "video/" : assetType === "Audio" ? "audio/" : assetType === "Image" || field.key === "image" ? "image/" : "";
        if (!accept.split(",").includes(extension) || file.size > (field.max ?? 25) * 1024 * 1024 || file.size === 0 || (mediaKind && file.type && !file.type.startsWith(mediaKind))) {
          fileError(`Choose a nonempty ${accept} file up to ${field.max ?? 25} MB.`);
          e.target.value = ""; return;
        }
        setSelected(file);
        setPreview(URL.createObjectURL(file));
        change(JSON.stringify({ name: file.name, size: file.size, type: file.type, localOnly: true }));
      }} />
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted"><FolderOpen className="size-3.5 shrink-0" aria-hidden="true" />Browse from your device · no upload</p>
    </div>
    <p id={`f-${field.key}-help`} className="text-xs text-muted">Local selection only • max {field.max ?? 25} MB. No server upload. Saved demo records retain metadata only; select the file again to preview after closing.</p>
    {metadata.name ? <div className="flex items-start gap-2 rounded-xl border border-border bg-surface-muted p-3"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /><p className="min-w-0 break-all text-sm">{metadata.name}<span className="mt-1 block text-xs text-muted">{Math.ceil((metadata.size ?? 0) / 1024)} KB · local metadata</span></p></div> : null}
    {preview && selected?.type.startsWith("image/") && selected.type !== "image/svg+xml" ?
      // eslint-disable-next-line @next/next/no-img-element -- Browser-local object URLs cannot use the image optimizer.
      <img src={preview} alt="Selected file preview" className="mx-auto max-h-52 max-w-full rounded-xl border border-border bg-surface-muted p-2 object-contain shadow-sm" /> : null}
    {preview && selected?.type.startsWith("video/") ? <video src={preview} controls className="max-h-52 w-full" /> : null}
    {preview && selected?.type.startsWith("audio/") ? <audio src={preview} controls className="w-full" /> : null}
    {selected && !/^(image|video|audio)\//.test(selected.type) ? <p className="text-xs text-muted">Metadata preview only. This document/archive is not rendered, executed or uploaded.</p> : null}
    {metadata.name ? <Button size="sm" variant="soft-danger" onClick={() => { setSelected(null); setPreview(""); change(""); fileError(""); if (input.current) input.current.value = ""; }}><Trash2 className="size-3.5" aria-hidden="true" />Clear selection</Button> : null}
  </div>;
}

export function EditorFields({ fields, values, set, errors, fileError, prefix = "" }: {
  fields: FormField[]; values: EditorValues; set: (key: string, value: string) => void;
  errors: Record<string, string>; fileError: (key: string, error: string) => void; prefix?: string;
}) {
  return <>{fields.filter((f) => isVisible(f, values)).map((f) => {
    const id = `f-${prefix}${f.key}`;
    const common = { id, name: `${prefix}${f.key}`, value: values[f.key] ?? "", required: f.required,
      "aria-invalid": !!errors[f.key], "aria-describedby": errors[f.key] ? `${id}-error` : f.help ? `${id}-help` : undefined };
    let control;
    if (f.type === "repeat") {
      const items = readItems(values[f.key]);
      const update = (next: EditorValues[]) => set(f.key, JSON.stringify(next));
      const RepeatIcon = f.key === "days" ? CalendarDays : ListChecks;
      control = <fieldset id={id} tabIndex={-1} className="min-w-0 space-y-3 rounded-2xl border border-border bg-surface-muted p-2.5 sm:p-3">
        <legend className="px-1 text-sm font-semibold">{f.label} <span className="text-xs font-normal text-muted">({items.length})</span></legend>
        {items.map((item, index) => <div key={index} className="min-w-0 space-y-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3"><span className={cn("rounded-lg p-2", palette[cardCycle[index % cardCycle.length]].tile)}><RepeatIcon className="size-4" aria-hidden="true" /></span><p className="text-sm font-semibold">{index + 1}. {f.label}</p></div>
          <EditorFields fields={f.itemFields ?? []} values={item} errors={errors[f.key] ? validateEditor(f.itemFields ?? [], item) : {}} fileError={fileError} prefix={`${prefix}${f.key}-${index}-`}
            set={(key, v) => update(items.map((row, i) => i === index ? { ...row, [key]: v } : row))} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="soft-danger" aria-label={`Remove ${f.label} ${index + 1}`} onClick={() => update(items.filter((_, i) => i !== index))}><Trash2 className="size-3.5" aria-hidden="true" />Remove</Button>
            {index > 0 ? <Button size="sm" variant="soft-info" aria-label={`Move ${f.label} ${index + 1} up`} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update(next); }}><ArrowUp className="size-3.5" aria-hidden="true" />Move up</Button> : null}
          </div>
        </div>)}
        <Button size="sm" variant="soft-success" className="h-auto min-h-9 max-w-full whitespace-normal py-2 text-left" onClick={() => update([...items, Object.fromEntries((f.itemFields ?? []).map((child) => [child.key, child.defaultValue ?? ""]))])}><Plus className="size-4 shrink-0" aria-hidden="true" />Add {f.label.toLowerCase()}</Button>
      </fieldset>;
    } else if (f.type === "file") {
      control = <LocalFile key={`${id}-${values.type ?? ""}`} field={f} value={values[f.key] ?? ""} error={errors[f.key]} assetType={f.key === "localFile" ? values.type : undefined} change={(v) => set(f.key, v)} fileError={(error) => fileError(f.key, error)} />;
    } else if (f.type === "multiselect") {
      const selected = (values[f.key] ?? "").split("\n").filter(Boolean);
      control = <fieldset id={id} tabIndex={-1} className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-border bg-surface-muted p-2.5">
        <legend className="sr-only">{f.label}</legend>
        {(f.options ?? []).map((option) => <label key={option} className={cn("flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors", selected.includes(option) ? cn("border-accent/30", palette.teal.tile) : "border-transparent bg-surface hover:border-border")}>
          <input type="checkbox" className="size-4 shrink-0 accent-accent" checked={selected.includes(option)} onChange={(e) => set(f.key, (e.target.checked ? [...selected, option] : selected.filter((v) => v !== option)).join("\n"))} /><span className="min-w-0 break-words">{option}</span>
        </label>)}
      </fieldset>;
    } else if (f.type === "select") control = <Select {...common} onValueChange={(value) => set(f.key, value)} placeholder="Select an option" options={[{ value: "", label: "Select an option" }, ...[...new Set([...(f.options ?? []), ...(values[f.key] ? [values[f.key]] : [])])].map((value) => ({ value, label: value }))]} />;
    else if (f.type === "date") control = <DatePicker {...common} onValueChange={(v) => set(f.key, v)} />;
    else if (f.type === "datetime-local") control = <DateTimePicker {...common} onValueChange={(v) => set(f.key, v)} />;
    else if (f.type === "textarea" && f.format === "markdown") control = <MarkdownEditor {...common} label={f.label} placeholder={f.placeholder} onValueChange={(value) => set(f.key, value)} />;
    else if (f.type === "textarea") control = <textarea {...common} rows={4} placeholder={f.placeholder} className={`${inputClass} h-auto py-2`} onChange={(e) => set(f.key, e.target.value)} />;
    else control = <input {...common} type={f.type} min={f.min} max={f.max} step={f.type === "number" ? "any" : undefined} placeholder={f.placeholder} className={inputClass} onChange={(e) => set(f.key, e.target.value)} />;
    return <Field key={f.key} id={id} label={f.label} required={f.required} help={f.help} error={errors[f.key]}>{control}</Field>;
  })}</>;
}
