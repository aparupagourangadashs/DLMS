"use client";

import { useState } from "react";
import { BadgePercent, CalendarDays, Calculator, EyeOff, Globe2, PencilLine, Search, Smartphone, Ticket, TicketCheck, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { palette } from "@/lib/colors";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { useDemoRecords } from "@/lib/admin/use-demo-records";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { DemoNotice, PageHeader } from "../PageHeader";

type UseType = "Multiple use" | "Single use";
type Promo = { id: string; code: string; type: UseType; start: string; end: string; overallLimit: number; perUserLimit: number; website: boolean; app: boolean; discountType: "Percentage" | "Fixed amount"; discount: number; maxDiscount: number; minSpend: number; appliesTo: string; redemptions: number };
const initial: Promo[] = [
  { id: "promo-1", code: "WELCOME10", type: "Multiple use", start: "2026-10-01", end: "2026-12-31", overallLimit: 100, perUserLimit: 1, website: true, app: true, discountType: "Percentage", discount: 10, maxDiscount: 500, minSpend: 500, appliesTo: "All products", redemptions: 12 },
  { id: "promo-2", code: "DEMOONE", type: "Single use", start: "2026-10-01", end: "2026-11-30", overallLimit: 1, perUserLimit: 1, website: false, app: false, discountType: "Fixed amount", discount: 250, maxDiscount: 0, minSpend: 1000, appliesTo: "Courses", redemptions: 0 },
];
function fresh(type: UseType): Promo {
  return { id: "", code: "", type, start: "2026-10-26", end: "2026-11-26", overallLimit: type === "Single use" ? 1 : 100, perUserLimit: 1, website: true, app: true, discountType: "Percentage", discount: 10, maxDiscount: 0, minSpend: 0, appliesTo: "All products", redemptions: 0 };
}
function validate(promo: Promo) {
  if (!/^[A-Z0-9_-]{3,32}$/.test(promo.code.trim())) return "Code must be 3–32 letters, numbers, hyphens or underscores.";
  if (!promo.start || !promo.end || promo.end < promo.start) return "Choose a start date and an expiry on or after it.";
  if (![promo.overallLimit, promo.perUserLimit].every((value) => Number.isSafeInteger(value) && value >= 1 && value <= 1000000)) return "Usage limits must be whole numbers from 1 to 1,000,000.";
  if (promo.perUserLimit > promo.overallLimit) return "Per-user limit cannot exceed the system-wide limit.";
  if (promo.overallLimit < promo.redemptions) return "System-wide limit cannot be lower than existing demo redemptions.";
  if (promo.type === "Single use" && (promo.overallLimit !== 1 || promo.perUserLimit !== 1)) return "Single-use codes must have both limits set to one.";
  return "";
}

export function PromoCodes() {
  const [records, save] = useDemoRecords("dl-lms-demo-promo-codes-v1", initial);
  const [type, setType] = useState<UseType>("Multiple use");
  const [draft, setDraft] = useState<Promo | null>(null);
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [remove, setRemove] = useState<Promo | null>(null);
  const [order, setOrder] = useState(2499);
  const [previewDate, setPreviewDate] = useState("2026-10-26");
  const [previewPlatform, setPreviewPlatform] = useState("Website");
  const [previewProduct, setPreviewProduct] = useState("Courses");
  const [previousUses, setPreviousUses] = useState(0);
  const shown = records.filter((promo) => promo.type === type && promo.code.toLowerCase().includes(query.toLowerCase()));
  function update(values: Partial<Promo>) { if (draft) { setDraft({ ...draft, ...values }); setError(""); } }
  function edit(promo: Promo) { setDraft({ ...promo }); setStep(1); setError(""); setOrder(2499); setPreviousUses(0); }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const problem = validate(draft);
    if (problem) { setError(problem); return; }
    if (records.some((record) => record.id !== draft.id && record.code === draft.code.trim())) { setError("This code already exists. Choose a unique code across both tabs."); return; }
    if (step === 1) { setStep(2); setError(""); return; }
    if (!Number.isFinite(draft.discount) || draft.discount <= 0 || (draft.discountType === "Percentage" && draft.discount > 100) || draft.discount > 1000000) { setError("Enter a positive discount, at most 100% or ₹1,000,000."); return; }
    if (![draft.minSpend, draft.maxDiscount].every((value) => Number.isFinite(value) && value >= 0 && value <= 1000000)) { setError("Minimum spend and discount cap must be between ₹0 and ₹1,000,000."); return; }
    const next = { ...draft, code: draft.code.trim(), id: draft.id || crypto.randomUUID() };
    save(draft.id ? records.map((record) => record.id === draft.id ? next : record) : [...records, next]);
    setDraft(null);
  }
  const previewProblem = !draft ? "" : !Number.isFinite(order) || order <= 0 ? "Enter a positive example order amount." :
    !Number.isSafeInteger(previousUses) || previousUses < 0 ? "Previous uses must be a non-negative whole number." :
    !previewDate || previewDate < draft.start || previewDate > draft.end ? "Not valid on this example date." :
    draft.redemptions >= draft.overallLimit ? "System-wide usage limit reached." :
    previousUses >= draft.perUserLimit ? "Example learner's usage limit reached." :
    draft.appliesTo !== "All products" && draft.appliesTo !== previewProduct ? "Not applicable to this product type." :
    order < draft.minSpend ? "Below minimum order amount." : "";
  const rawDiscount = draft ? draft.discountType === "Percentage" ? order * draft.discount / 100 : draft.discount : 0;
  const saving = draft && !previewProblem ? Math.round(Math.max(0, Math.min(order, rawDiscount, draft.discountType === "Percentage" && draft.maxDiscount > 0 ? draft.maxDiscount : Infinity)) * 100) / 100 : 0;
  const visible = draft ? previewPlatform === "Website" ? draft.website : draft.app : false;
  return <>
    <PageHeader title="Promo Codes" description="Configure local discount examples, validity, visibility and redemption limits." status="ready" actions={<Button variant="gold" onClick={() => edit(fresh(type))}><BadgePercent className="size-4" aria-hidden="true" />Create Promo Code</Button>} />
    <DemoNotice>Browser-local demo only. Dates are inclusive. Single use means one redemption system-wide. Visibility controls discovery, not eligibility: hidden codes may still be entered manually. No checkout or real redemption is connected. Discount-step rules below are a local proposal; live second-step details were not verified.</DemoNotice>
    <section className="mb-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4" aria-label="Promo code summary"><StatCard label="Multiple-use codes" value={String(records.filter((promo) => promo.type === "Multiple use").length)} color="orange" icon={<Ticket />} /><StatCard label="Single-use codes" value={String(records.filter((promo) => promo.type === "Single use").length)} color="violet" icon={<TicketCheck />} /><StatCard label="Demo redemptions" value={String(records.reduce((total, promo) => total + promo.redemptions, 0))} hint="Fixture count only" color="emerald" icon={<Users />} /><StatCard label="Hidden from storefronts" value={String(records.filter((promo) => !promo.website && !promo.app).length)} hint="Can still be entered" color="slate" icon={<EyeOff />} /></section>
    <Card className="mb-5 overflow-hidden"><CardHeader className="bg-linear-to-r from-orange-50 via-surface to-surface dark:from-orange-500/10" title={<span className="inline-flex items-center gap-3"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", palette.orange.solid)} aria-hidden="true"><BadgePercent className="size-4" /></span>Code catalog</span>} description="Usage type, validity, discoverability and limits." /><div className="grid gap-4 p-4 md:grid-cols-[1fr_minmax(16rem,22rem)] md:items-end"><Tabs label="Promo code type" value={type} onChange={setType} className="min-w-0" items={(["Multiple use", "Single use"] as UseType[]).map((value) => ({ value, label: value, icon: value === "Single use" ? TicketCheck : Ticket, color: value === "Single use" ? "violet" as const : "orange" as const, count: records.filter((promo) => promo.type === value).length }))} /><Field id="promo-search" label="Search code"><div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-accent" aria-hidden="true" /><input id="promo-search" type="search" className={cn(inputClass, "pl-9")} value={query} onChange={(event) => setQuery(event.target.value)} /></div></Field></div></Card>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map((promo) => { const color = palette[promo.type === "Single use" ? "violet" : "orange"]; return <Card key={promo.id} className="relative min-w-0 space-y-3 overflow-hidden p-4"><span className={cn("absolute inset-x-0 top-0 h-1", color.bar)} aria-hidden="true" /><div className="flex items-start gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", color.tile)} aria-hidden="true"><BadgePercent className="size-5" /></span><div className="min-w-0"><h2 className="break-all font-mono text-lg font-semibold">{promo.code}</h2><p className={cn("text-sm font-semibold", color.text)}>{promo.discountType === "Percentage" ? `${promo.discount}%` : formatINR(promo.discount)} off · {promo.appliesTo}</p></div></div><div className="flex flex-wrap gap-1.5"><Badge tone={promo.type === "Single use" ? "accent" : "gold"}>{promo.type}</Badge>{promo.website ? <Badge tone="info"><Globe2 className="size-3" aria-hidden="true" />Website</Badge> : null}{promo.app ? <Badge tone="success"><Smartphone className="size-3" aria-hidden="true" />App</Badge> : null}{!promo.website && !promo.app ? <Badge><EyeOff className="size-3" aria-hidden="true" />Hidden</Badge> : null}</div><dl className="grid gap-2 rounded-xl bg-surface-muted p-3 text-sm"><div><dt className="sr-only">Validity</dt><dd className="flex gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />{promo.start} – {promo.end}</dd></div><div><dt className="sr-only">Usage</dt><dd className="flex gap-2"><Users className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />{promo.redemptions} / {promo.overallLimit} demo redemptions · {promo.perUserLimit} per learner</dd></div><div><dt className="inline font-medium">Minimum spend: </dt><dd className="inline">{formatINR(promo.minSpend)}</dd></div></dl><div className="flex flex-wrap gap-2"><Button size="sm" variant="soft-info" onClick={() => edit(promo)}><PencilLine className="size-3.5" aria-hidden="true" />Edit &amp; simulate</Button><Button size="sm" variant="soft-danger" onClick={() => setRemove(promo)}><Trash2 className="size-3.5" aria-hidden="true" />Delete</Button></div></Card>; })}</div>
    {!shown.length && <Card className="p-6 text-center text-sm"><Search className="mx-auto mb-2 size-6 text-accent" aria-hidden="true" />No matching {type.toLowerCase()} codes.</Card>}
    <Modal open={draft !== null} onClose={() => setDraft(null)} title={`${draft?.id ? "Edit" : "Create"} Promo Code · Step ${step} of 2`} size="lg" variant="drawer">
      {draft && <form onSubmit={submit} className="space-y-4">
        <ol className="grid grid-cols-2 gap-2 text-sm" aria-label="Promo code steps">{["Validity & limits", "Discount & example"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} className={cn("rounded-xl p-3 font-medium", step === index + 1 ? palette.orange.solid : palette.orange.tile)}>{index + 1}. {label}</li>)}</ol>
        {step === 1 ? <>
          <Field id="promo-code" label="Code" required><input id="promo-code" className={inputClass} value={draft.code} required maxLength={32} onChange={(event) => update({ code: event.target.value.toUpperCase() })} /></Field>
          <Field id="promo-type" label="Usage type"><Select id="promo-type" value={draft.type} onValueChange={(value) => update({ type: value as UseType, overallLimit: value === "Single use" ? 1 : 100, perUserLimit: 1 })} options={["Multiple use", "Single use"].map((value) => ({ value, label: value }))} /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field id="promo-start" label="Starts on" required><DatePicker id="promo-start" value={draft.start} onValueChange={(start) => update({ start })} required /></Field><Field id="promo-end" label="Expires on" required><DatePicker id="promo-end" value={draft.end} min={draft.start} onValueChange={(end) => update({ end })} required /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field id="promo-total" label="System-wide limit" required><input id="promo-total" type="number" min={1} max={1000000} step={1} disabled={draft.type === "Single use"} required className={inputClass} value={draft.overallLimit || ""} onChange={(event) => update({ overallLimit: Number(event.target.value) })} /></Field><Field id="promo-user" label="Per-user limit" required><input id="promo-user" type="number" min={1} max={draft.overallLimit} step={1} disabled={draft.type === "Single use"} required className={inputClass} value={draft.perUserLimit || ""} onChange={(event) => update({ perUserLimit: Number(event.target.value) })} /></Field></div>
          <fieldset className={cn("space-y-2 rounded-xl border border-border p-3", palette.sky.tile)}><legend className="text-sm font-semibold">Display code on</legend><label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.website} onChange={(event) => update({ website: event.target.checked })} />Website</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.app} onChange={(event) => update({ app: event.target.checked })} />App</label></fieldset>
        </> : <>
          <Field id="promo-discount-type" label="Discount type"><Select id="promo-discount-type" value={draft.discountType} onValueChange={(value) => update({ discountType: value as Promo["discountType"], maxDiscount: value === "Fixed amount" ? 0 : draft.maxDiscount })} options={["Percentage", "Fixed amount"].map((value) => ({ value, label: value }))} /></Field>
          <Field id="promo-discount" label={draft.discountType === "Percentage" ? "Discount (%)" : "Discount (INR)"} required><input id="promo-discount" type="number" min={0.01} max={draft.discountType === "Percentage" ? 100 : 1000000} step={0.01} required className={inputClass} value={draft.discount || ""} onChange={(event) => update({ discount: Number(event.target.value) })} /></Field>
          {draft.discountType === "Percentage" && <Field id="promo-cap" label="Maximum discount (INR)" help="0 means no cap."><input id="promo-cap" type="number" min={0} max={1000000} step={0.01} required className={inputClass} value={draft.maxDiscount} onChange={(event) => update({ maxDiscount: Number(event.target.value) })} /></Field>}
          <Field id="promo-min" label="Minimum order amount (INR)"><input id="promo-min" type="number" min={0} max={1000000} step={0.01} required className={inputClass} value={draft.minSpend} onChange={(event) => update({ minSpend: Number(event.target.value) })} /></Field>
          <Field id="promo-products" label="Applies to"><Select id="promo-products" value={draft.appliesTo} onValueChange={(value) => update({ appliesTo: value })} options={["All products", "Courses", "Events", "Memberships"].map((value) => ({ value, label: value }))} /></Field>
          <section className="space-y-3 overflow-hidden rounded-xl border border-border bg-background p-4" aria-label="Demo discount calculator"><h3 className={cn("-mx-4 -mt-4 mb-3 flex items-center gap-2 px-4 py-3 font-semibold", palette.emerald.tile)}><Calculator className="size-4" aria-hidden="true" />Example order · no redemption occurs</h3><Field id="promo-order" label="Example order amount (INR)"><input id="promo-order" type="number" min={0.01} max={10000000} step={0.01} className={inputClass} value={order || ""} onChange={(event) => setOrder(Number(event.target.value))} /></Field><Field id="promo-date" label="Example purchase date"><DatePicker id="promo-date" value={previewDate} onValueChange={setPreviewDate} required /></Field><Field id="promo-platform" label="Example storefront"><Select id="promo-platform" value={previewPlatform} onValueChange={setPreviewPlatform} options={["Website", "App"].map((value) => ({ value, label: value }))} /></Field><Field id="promo-preview-product" label="Example product"><Select id="promo-preview-product" value={previewProduct} onValueChange={setPreviewProduct} options={["Courses", "Events", "Memberships"].map((value) => ({ value, label: value }))} /></Field><Field id="promo-used" label="Example learner's previous redemptions"><input id="promo-used" type="number" min={0} step={1} className={inputClass} value={previousUses} onChange={(event) => setPreviousUses(Number(event.target.value))} /></Field><p className="text-sm">{visible ? "Shown" : "Hidden"} on {previewPlatform.toLowerCase()}; manually entering the code is still allowed.</p><p role="status" className={cn("rounded-xl p-3 text-sm font-medium", previewProblem ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>{previewProblem || `Discount ${formatINR(saving)} · Pay ${formatINR(order - saving)} before tax. No stacking or tax rules simulated.`}</p></section>
        </>}
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">{step === 2 && <Button onClick={() => { setStep(1); setError(""); }}>Back</Button>}<Button onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" variant={step === 1 ? "primary" : "success"}><BadgePercent className="size-4" aria-hidden="true" />{step === 1 ? "Next: Discount" : "Save local code"}</Button></div>
      </form>}
    </Modal>
    <Modal open={remove !== null} onClose={() => setRemove(null)} title="Delete local promo code?" footer={<><Button onClick={() => setRemove(null)}>Cancel</Button><Button variant="danger" onClick={() => { save(records.filter((record) => record.id !== remove?.id)); setRemove(null); }}><Trash2 className="size-4" aria-hidden="true" />Delete demo code</Button></>}><p className="text-sm">Delete {remove?.code} from this browser only? Real discounts and analytics fixtures are unaffected.</p></Modal>
  </>;
}
