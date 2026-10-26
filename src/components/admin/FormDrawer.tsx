"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Award, CalendarDays, Check, ClipboardList, Eye, FolderOpen, Info, Save, Settings2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { cardCycle, palette } from "@/lib/colors";
import type { CellValue, EditorKind, FormField } from "@/lib/admin/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EditorFields } from "./EditorFields";
import { isVisible, readItems, validateEditor, type EditorValues } from "@/lib/admin/editor-validation";

type Props = {
  open: boolean; title: string; description?: string; fields: FormField[];
  initial?: Record<string, CellValue>; submitLabel: string; onClose: () => void;
  onSubmit: (values: Record<string, CellValue>) => void; steps?: string[]; editor?: EditorKind;
};

export function FormDrawer(props: Props) {
  return <Modal open={props.open} onClose={props.onClose} title={props.title} description={props.description} variant="drawer" size={props.editor ? "lg" : "md"}>
    {props.open ? <FormBody {...props} /> : null}
  </Modal>;
}

function FormBody({ fields, initial, submitLabel, onClose, onSubmit, steps, editor }: Props) {
  const [values, setValues] = useState<EditorValues>(() => {
    const result: EditorValues = {};
    for (const f of fields) {
      const raw = initial?.[f.key];
      result[f.key] = raw === undefined || raw === null ? f.defaultValue ?? "" : Array.isArray(raw) ? raw.join(f.type === "multiselect" ? "\n" : ", ") : String(raw);
    }
    if (editor === "event" && !result.days && initial?.date) {
      const start = String(initial.date);
      const end = new Date(Date.parse(start) + 3600000);
      result.days = JSON.stringify([{ start, end: Number.isFinite(end.getTime()) ? new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "" }]);
    }
    return result;
  });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const heading = useRef<HTMLParagraphElement>(null);
  const EditorIcon = editor === "event" ? CalendarDays : editor === "certificate" ? Award : editor === "asset" ? FolderOpen : ClipboardList;
  const sectionColor = palette[cardCycle[step % cardCycle.length]];
  const stepIcons = [EditorIcon, Settings2, Sparkles];
  const set = (key: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (editor === "asset" && key === "type" && prev.type !== value) next.localFile = "";
      if (editor === "feedback" && key === "template" && prev.template !== value && value !== "Blank") {
        next.questions = JSON.stringify(value === "Session essentials"
          ? [{ prompt: "How useful was this session?", type: "Rating", required: "Yes", options: "" }, { prompt: "What could we improve?", type: "Text", required: "No", options: "" }]
          : [{ prompt: "How would you rate this course?", type: "Rating", required: "Yes", options: "" }, { prompt: "Would you recommend it?", type: "Choice", required: "Yes", options: "Yes\nNo" }]);
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: "" }));
    if (key === "type") setFileErrors({});
  };
  const currentFields = fields.filter((f) => !steps || (f.step ?? 0) === step);
  const last = !steps || step === steps.length - 1;
  const move = (next: number) => { setStep(next); requestAnimationFrame(() => heading.current?.focus()); };
  return <form noValidate className="flex min-w-0 flex-col gap-4" onSubmit={(e) => {
    e.preventDefault();
    const checked = last ? fields : currentFields;
    const errs = { ...validateEditor(checked, values), ...Object.fromEntries(Object.entries(fileErrors).filter(([key, v]) => v && checked.some((f) => f.key === key && isVisible(f, values)))) };
    setErrors(errs);
    const first = fields.find((f) => errs[f.key]);
    if (first) {
      setStep(first.step ?? 0);
      requestAnimationFrame(() => document.getElementById(`f-${first.key}`)?.focus());
      return;
    }
    if (!last) { move(step + 1); return; }
    const output: Record<string, CellValue> = {};
    for (const f of fields) {
      const value = isVisible(f, values) ? (values[f.key] ?? "").trim() : "";
      output[f.key] = f.type === "number" ? value === "" ? null : Number(value) : value;
    }
    if (editor === "event") { output.date = readItems(values.days)[0]?.start ?? ""; output.venue = values.venue || values.platform; }
    if (editor === "batch") { output.duration = `${values.startDate} – ${values.endDate}`; output.module = values.modules.split("\n").join(", "); }
    if (editor === "asset") {
      let file: { name?: string; size?: number } = {};
      try { file = JSON.parse(values.localFile || "{}"); } catch { /* No retained local file. */ }
      output.fileName = file.name ?? values.link;
      output.sizeLabel = file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB (local)` : "Link only";
      output.size = (file.size ?? 0) / 1024 / 1024;
    }
    if (editor === "certificate") {
      output.validity = values.expiry === "After days" ? `${values.expiryDays} days` : values.expiry === "Fixed date" ? `Until ${values.expiryDate}` : "Lifetime";
      output.rule = values.automation === "Manual" ? "Manual issuance (not connected)" : `${values.automation}: ${values.automation === "Course completion" ? values.course : values.exam}; threshold ${values.threshold}% (configuration only)`;
    }
    onSubmit(output);
  }}>
    {editor ? <div className="flex items-start gap-2 rounded-xl border border-border bg-surface-muted p-3 text-xs leading-relaxed text-muted"><Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" /><p>Local demo only. Changes last until this page reloads. No files are uploaded, payments collected, certificates issued or notifications sent.</p></div> : null}
    {steps ? <section aria-label="Editor progress" className="space-y-3">
      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map((label, index) => {
          const color = palette[cardCycle[index % cardCycle.length]];
          const Icon = index < step ? Check : stepIcons[index % stepIcons.length];
          return <li key={label} aria-current={step === index ? "step" : undefined} className={cn("flex min-w-0 items-center gap-2 rounded-xl border p-2.5", step === index ? cn("border-current", color.tile) : "border-border bg-surface")}>
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", index <= step ? color.solid : color.tile)}><Icon className="size-4" aria-hidden="true" /></span>
            <span className="min-w-0 text-xs font-medium text-foreground"><span className={cn("block text-[10px] uppercase tracking-wide", color.text)}>Step {index + 1}{index < step ? " · Complete" : ""}</span>{label}</span>
          </li>;
        })}
      </ol>
      <div role="progressbar" aria-label="Editor step progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of ${steps.length}`} className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className={cn("h-full rounded-full", sectionColor.bar)} style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
    </section> : null}
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className={cn("h-1", sectionColor.bar)} />
      <div className="flex items-center gap-3 border-b border-border bg-surface-muted p-4">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", sectionColor.solid)}><EditorIcon className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0"><p ref={heading} tabIndex={-1} className="text-sm font-semibold" aria-live="polite">{steps ? `Step ${step + 1} of ${steps.length}: ${steps[step]}` : "Details & configuration"}</p><p className="mt-1 text-xs text-muted">Complete required fields marked * to continue.</p></div>
      </div>
      <div className="flex min-w-0 flex-col gap-5 p-3 sm:p-4">
    <EditorFields fields={currentFields} values={values} set={set} errors={{ ...errors, ...Object.fromEntries(Object.entries(fileErrors).filter(([, error]) => error)) }} fileError={(key, error) => setFileErrors((prev) => ({ ...prev, [key]: error }))} />
      </div>
    </section>
    {editor === "feedback" && last ? <section className="rounded-2xl border border-border bg-surface-muted p-4" aria-label="Feedback preview">
      <h3 className="flex items-center gap-2 font-semibold"><span className={cn("rounded-lg p-2", palette.teal.tile)}><Eye className="size-4" aria-hidden="true" /></span>Learner preview</h3>
      {readItems(values.questions).map((q, i) => <div key={i} className="mt-3 break-words rounded-xl border border-border bg-surface p-3 text-sm"><p className="font-medium">{i + 1}. {q.prompt} {q.required === "Yes" ? "*" : ""}</p><p className={cn("mt-2", q.type === "Rating" ? palette.amber.text : "text-muted")}>{q.type === "Rating" ? "1 ☆ · 2 ☆ · 3 ☆ · 4 ☆ · 5 ☆" : q.type === "Choice" ? q.options.split("\n").join(" / ") : "Written answer"}</p></div>)}
    </section> : null}
    {editor === "certificate" && step === 1 ? <section className="space-y-3 rounded-2xl border border-border bg-surface-muted p-3 sm:p-4" aria-label="Certificate preview">
      <h3 className="flex items-center gap-2 font-semibold"><span className={cn("rounded-lg p-2", palette.amber.tile)}><Award className="size-5" aria-hidden="true" /></span>Certificate design preview</h3>
      <p className="text-xs text-muted">Available placeholders: {"{{learner}}, {{course}}, {{date}}, {{serial}}"}. Preview only; PDF generation and issuance are deferred.</p>
      {values.design === "Builder" ? <div className={`break-words rounded-xl border-4 border-accent bg-surface p-4 text-center shadow-card [overflow-wrap:anywhere] sm:p-6 ${values.layout === "Portrait" ? "aspect-[3/4]" : "aspect-[4/3]"}`}>
        <Award className={cn("mx-auto mb-3 size-10", palette.amber.text)} aria-hidden="true" />
        <h3 className="font-serif text-2xl">{values.heading || "Certificate of completion"}</h3><p className="my-4 text-lg">Demo Learner</p>
        <p className="whitespace-pre-wrap text-sm">{(values.body || "").replaceAll("{{learner}}", "Demo Learner").replaceAll("{{course}}", values.course || "Demo Course").replaceAll("{{date}}", "26 October 2026").replaceAll("{{serial}}", `${values.serialPrefix || "CERT"}-0001`)}</p>
        <p className="mt-4 text-xs">{values.signatory}</p>
        {readItems(values.customFields).map((f, i) => <p key={i} className="text-xs">{f.label}: {f.value}</p>)}
      </div> : <p className="text-sm text-muted">Template preview appears with the local file selection. Image/PDF metadata is retained only; PDF templates are not rendered or converted.</p>}
    </section> : null}
    <div className="sticky bottom-0 -mx-5 mt-2 flex flex-wrap justify-end gap-2 border-t border-border bg-surface px-5 pt-3 pb-1">
      <Button variant="soft-danger" onClick={onClose}><X className="size-4" aria-hidden="true" />Cancel</Button>
      {step > 0 ? <Button variant="soft-info" onClick={() => move(step - 1)}><ArrowLeft className="size-4" aria-hidden="true" />Back</Button> : null}
      <Button type="submit" variant={last ? "success" : "gold"}>{last ? <Save className="size-4" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}{last ? editor ? "Save locally" : submitLabel : "Next"}</Button>
    </div>
  </form>;
}
