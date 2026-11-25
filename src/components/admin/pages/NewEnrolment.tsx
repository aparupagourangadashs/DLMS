"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { TableHeading, TableScroll } from "@/components/ui/Table";
import type { EnrolBatchOption, EnrolRowResult } from "@/lib/admin/enrolment-types";
import { ApiError, apiClient } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { palette, type ColorKey } from "@/lib/colors";
import { CircleAlert, CircleCheck, CircleMinus, FileSpreadsheet, Hash, Mail, UserPlus, Users, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../PageHeader";

type Mode = "single" | "bulk" | "registration" | "advanced";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_BYTES = 500 * 1024;

const modes: Array<{ value: Mode; label: string; description: string; Icon: typeof UserPlus; color: ColorKey }> = [
    { value: "single", label: "Single Enrollment", description: "Enrol one learner into a batch by email.", Icon: UserPlus, color: "blue" },
    { value: "bulk", label: "Bulk Enrollment", description: "Paste many emails to enrol into one batch.", Icon: Users, color: "violet" },
    { value: "registration", label: "Learner Registration", description: "Create a learner account without enrolling.", Icon: UsersRound, color: "teal" },
    { value: "advanced", label: "Advanced Bulk Enrollment", description: "Upload a CSV with per-learner batches.", Icon: FileSpreadsheet, color: "emerald" },
];

type Summary = { total: number; ready: number; enrolled: number; skipped: number; errors: number; newAccounts: number };
type BulkResponse = { results: EnrolRowResult[]; summary: Summary };

export function NewEnrolment({ batches }: { batches: EnrolBatchOption[] }) {
    const [mode, setMode] = useState<Mode>("single");
    const selectedMode = modes.find((m) => m.value === mode)!;

    return (
        <>
            <PageHeader title="New Enrolment" description="Add learners to batches individually or in bulk. New email addresses get an account and a link to choose a password." status="ready" />

            <fieldset className="mb-6">
                <legend className="sr-only">Enrolment type</legend>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {modes.map((m) => {
                        const c = palette[m.color];
                        const selected = mode === m.value;
                        return (
                            <label
                                key={m.value}
                                className={cn(
                                    "relative flex cursor-pointer gap-3 overflow-hidden rounded-2xl border bg-surface p-4 shadow-card transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                                    selected ? "border-transparent ring-2 ring-current shadow-lg" : "border-border hover:-translate-y-0.5 hover:shadow-md",
                                    selected && c.text,
                                )}
                            >
                                <span className={cn("absolute inset-x-0 top-0 h-1", c.bar)} aria-hidden="true" />
                                <input type="radio" name="mode" value={m.value} checked={selected} onChange={() => setMode(m.value)} className="sr-only" />
                                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", selected ? c.solid : c.tile)} aria-hidden="true">
                                    <m.Icon className="size-5" />
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold text-foreground">{m.label}</span>
                                    <span className="block text-xs text-muted">{m.description}</span>
                                </span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            <Card className="min-w-0 overflow-hidden">
                <div className={cn("h-1", palette[selectedMode.color].bar)} />
                <div className="admin-feature-banner rounded-none border-0 border-b border-border">
                    <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", palette[selectedMode.color].solid)} aria-hidden="true"><selectedMode.Icon className="size-6" /></span>
                    <div className="min-w-0"><h2 className="font-semibold">{selectedMode.label}</h2><p className="mt-1 text-sm text-muted">{selectedMode.description}</p></div>
                </div>
                <div className="p-5">
                    {batches.length === 0 && mode !== "registration" ? (
                        <p role="status" className="rounded-xl border border-gold/40 bg-gold-soft p-4 text-sm">There are no active batches yet. Create a batch under Learning &gt; Batches, then come back to enrol learners.</p>
                    ) : mode === "single" ? <Single key="single" batches={batches} />
                        : mode === "bulk" ? <Bulk key="bulk" batches={batches} />
                            : mode === "advanced" ? <Advanced key="advanced" batches={batches} />
                                : null}
                    {mode === "registration" ? <Registration key="registration" /> : null}
                </div>
            </Card>
        </>
    );
}

function BatchSelect({ id, value, onChange, batches, error }: { id: string; value: string; onChange: (v: string) => void; batches: EnrolBatchOption[]; error?: string }) {
    return (
        <Field id={id} label="Batch" required error={error}>
            <Select id={id} value={value} onValueChange={onChange} placeholder="Select a batch" required icon={Users} options={[{ value: "", label: "Select a batch" }, ...batches.map((b) => ({ value: b.id, label: `${b.name} · ${b.course}` }))]} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />
        </Field>
    );
}

const failure = (error: unknown) => (error instanceof ApiError ? error.message : "Something went wrong. Please try again.");

function Single({ batches }: { batches: EnrolBatchOption[] }) {
    const [email, setEmail] = useState("");
    const [batchId, setBatchId] = useState("");
    const [step, setStep] = useState<"start" | "new">("start");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        const errs: Record<string, string> = {};
        if (!emailRe.test(email.trim())) errs.email = "Enter a valid email address.";
        if (!batchId) errs.batch = "Choose a batch.";
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setBusy(true);
        try {
            const result = await apiClient.post<{ status: string; message: string }>("/api/admin/enrolments", { email, batchId, ...(step === "new" ? { name, phone } : {}) });
            if (result.data.status === "skipped") toast.info(result.data.message);
            else toast.success("Learner enrolled", { description: result.data.message });
            setEmail("");
            setBatchId("");
            setName("");
            setPhone("");
            setStep("start");
        } catch (error) {
            if (error instanceof ApiError && error.fields.name && step === "start") {
                setStep("new");
                setErrors({});
            } else if (error instanceof ApiError && Object.keys(error.fields).length > 0) setErrors({ ...error.fields, batch: error.fields.batch ?? "" });
            else toast.error(failure(error));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
            <h2 className="text-lg font-semibold">Single enrollment</h2>
            <Field id="se-email" label="Learner email" required error={errors.email} help="If there is no account for this address you will be asked for a name and the account is created.">
                <input id="se-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setStep("start"); }} className={inputClass} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "se-email-error" : "se-email-help"} />
            </Field>
            <BatchSelect id="se-batch" value={batchId} onChange={setBatchId} batches={batches} error={errors.batch} />
            {step === "new" ? (
                <div className="rounded-xl border border-info/30 bg-info-soft p-4">
                    <p className="mb-3 text-sm"><strong>No account found</strong> for {email}. Add a name to register and enrol them.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field id="se-name" label="Full name" required error={errors.name}>
                            <input id="se-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus aria-invalid={errors.name ? true : undefined} />
                        </Field>
                        <Field id="se-phone" label="Mobile (optional)" error={errors.phone}>
                            <input id="se-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+91 98xxxxxxxx" aria-invalid={errors.phone ? true : undefined} />
                        </Field>
                    </div>
                </div>
            ) : null}
            <div className="flex justify-end">
                <Button type="submit" variant="success" disabled={busy}>{busy ? "Enrolling…" : step === "new" ? "Register and enrol" : "Enrol learner"}</Button>
            </div>
        </form>
    );
}

function parseEmails(text: string) {
    const parts = text.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const seen = new Set<string>();
    const valid: string[] = [];
    const invalid: string[] = [];
    let duplicates = 0;
    for (const p of parts) {
        if (seen.has(p)) duplicates++;
        else if (emailRe.test(p)) valid.push(p);
        else invalid.push(p);
        seen.add(p);
    }
    return { valid, invalid, duplicates };
}

function ResultsTable({ results }: { results: EnrolRowResult[] }) {
    return (
        <TableScroll label="Enrolment results" className="admin-table-card rounded-xl border border-border">
            <table className="admin-data-table">
                <caption className="sr-only">Enrolment results</caption>
                <thead>
                    <tr>
                        <th scope="col"><TableHeading icon={Hash}>Line</TableHeading></th>
                        <th scope="col"><TableHeading icon={Mail}>Email</TableHeading></th>
                        <th scope="col"><TableHeading icon={UserPlus}>Name</TableHeading></th>
                        <th scope="col"><TableHeading icon={Users}>Batch</TableHeading></th>
                        <th scope="col"><TableHeading icon={CircleCheck}>Result</TableHeading></th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((r) => (
                        <tr key={`${r.line}-${r.email}`} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 text-muted tabular-nums">{r.line}</td>
                            <td className="px-3 py-2 break-all">{r.email || "—"}</td>
                            <td className="px-3 py-2">{r.name || "—"}</td>
                            <td className="px-3 py-2">{r.batch || "—"}</td>
                            <td className="px-3 py-2">
                                {r.status === "error" ? (
                                    <span className="inline-flex items-center gap-1 text-danger"><CircleAlert className="size-4 shrink-0" aria-hidden="true" />{r.message}</span>
                                ) : r.status === "skipped" ? (
                                    <span className="inline-flex items-center gap-1 text-muted"><CircleMinus className="size-4 shrink-0" aria-hidden="true" />{r.message}</span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-success"><CircleCheck className="size-4 shrink-0" aria-hidden="true" />{r.message}</span>
                                )}
                                {r.newAccount && r.status !== "error" ? <Badge tone="info" className="ml-2">New account</Badge> : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </TableScroll>
    );
}

function SummaryBadges({ summary, committed }: { summary: Summary; committed: boolean }) {
    return (
        <div className="flex flex-wrap gap-2" role="status">
            <Badge tone="success">{committed ? summary.enrolled : summary.ready} {committed ? "enrolled" : "ready"}</Badge>
            {summary.newAccounts ? <Badge tone="info">{summary.newAccounts} new {summary.newAccounts === 1 ? "account" : "accounts"}</Badge> : null}
            {summary.skipped ? <Badge tone="neutral">{summary.skipped} already enrolled</Badge> : null}
            {summary.errors ? <Badge tone="danger">{summary.errors} need fixing</Badge> : null}
        </div>
    );
}

function downloadResults(results: EnrolRowResult[]) {
    const quote = (value: string | number) => `"${String(/^[=+\-@\t\r]/.test(String(value)) ? `'${value}` : value).replace(/"/g, '""')}"`;
    const lines = [["Line", "Email", "Name", "Batch", "Result", "Message"], ...results.map((r) => [r.line, r.email, r.name, r.batch, r.status, r.message])].map((l) => l.map(quote).join(","));
    const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "enrolment-results.csv";
    link.click();
    URL.revokeObjectURL(url);
}

function Bulk({ batches }: { batches: EnrolBatchOption[] }) {
    const [text, setText] = useState("");
    const [batchId, setBatchId] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [response, setResponse] = useState<{ data: BulkResponse; committed: boolean } | null>(null);
    const counts = parseEmails(text);

    async function run(commit: boolean) {
        if (!batchId) return setError("Choose a batch.");
        if (!counts.valid.length) return setError("Add at least one valid email.");
        setError("");
        setBusy(true);
        try {
            const result = await apiClient.post<BulkResponse>("/api/admin/enrolments/bulk", { mode: "emails", emails: text, batchId, commit });
            setResponse({ data: result.data, committed: commit });
            if (commit) toast.success(`${result.data.summary.enrolled} learners enrolled`, { description: result.data.summary.newAccounts ? `${result.data.summary.newAccounts} new accounts created` : undefined });
        } catch (caught) {
            setError(caught instanceof ApiError ? (caught.fields.emails ?? caught.fields.batchId ?? caught.message) : failure(caught));
        } finally {
            setBusy(false);
        }
    }

    const checked = response && !response.committed ? response.data : null;
    return (
        <form noValidate className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void run(false); }}>
            <h2 className="text-lg font-semibold">Bulk enrollment</h2>
            <Field id="be-emails" label="Learner emails" required help="One per line, or separated by commas. Unknown addresses get an account named from the address; learners can correct their name later.">
                <textarea id="be-emails" rows={7} value={text} onChange={(e) => { setText(e.target.value); setResponse(null); }} className={cn(inputClass, "h-auto py-2 font-mono text-xs")} aria-describedby="be-emails-help" />
            </Field>
            <BatchSelect id="be-batch" value={batchId} onChange={(v) => { setBatchId(v); setResponse(null); }} batches={batches} />
            {text.trim() ? (
                <div className="flex flex-wrap gap-2 text-sm" role="status">
                    <Badge tone="success">{counts.valid.length} valid</Badge>
                    {counts.invalid.length ? <Badge tone="danger">{counts.invalid.length} invalid</Badge> : null}
                    {counts.duplicates ? <Badge tone="warning">{counts.duplicates} duplicates</Badge> : null}
                </div>
            ) : null}
            {counts.invalid.length ? <p className="text-xs text-danger">Invalid: {counts.invalid.slice(0, 5).join(", ")}{counts.invalid.length > 5 ? "…" : ""}</p> : null}
            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
            {response ? (
                <>
                    <SummaryBadges summary={response.data.summary} committed={response.committed} />
                    <ResultsTable results={response.data.results} />
                </>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
                {response?.committed ? <Button onClick={() => downloadResults(response.data.results)}>Download results</Button> : null}
                {checked && checked.summary.ready > 0 ? <Button variant="success" disabled={busy} onClick={() => void run(true)}>{busy ? "Enrolling…" : `Enrol ${checked.summary.ready} ${checked.summary.ready === 1 ? "learner" : "learners"}`}</Button> : null}
                <Button type="submit" variant={checked ? "secondary" : "success"} disabled={busy}>{busy ? "Checking…" : checked ? "Check again" : "Check list"}</Button>
            </div>
        </form>
    );
}

function Registration() {
    const [values, setValues] = useState({ name: "", email: "", phone: "", city: "" });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        const errs: Record<string, string> = {};
        if (!values.name.trim()) errs.name = "Name is required.";
        if (!emailRe.test(values.email.trim())) errs.email = "Enter a valid email address.";
        if (!/^\+?[\d\s-]{8,}$/.test(values.phone.trim())) errs.phone = "Enter a valid mobile number.";
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setBusy(true);
        try {
            await apiClient.post("/api/admin/resources/users/learners", values);
            toast.success("Learner registered", { description: `${values.name} can now be enrolled into a batch. They were emailed a link to choose a password.` });
            setValues({ name: "", email: "", phone: "", city: "" });
        } catch (error) {
            if (error instanceof ApiError && Object.keys(error.fields).length > 0) setErrors(error.fields);
            else toast.error(failure(error));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            <h2 className="text-lg font-semibold sm:col-span-2">Learner registration</h2>
            {(
                [
                    ["name", "Full name", "text", true],
                    ["email", "Email", "email", true],
                    ["phone", "Mobile (with country code)", "tel", true],
                    ["city", "City", "text", false],
                ] as const
            ).map(([k, label, type, required]) => (
                <Field key={k} id={`lr-${k}`} label={label} required={required} error={errors[k]}>
                    <input id={`lr-${k}`} type={type} value={values[k]} onChange={set(k)} className={inputClass} aria-invalid={errors[k] ? true : undefined} aria-describedby={errors[k] ? `lr-${k}-error` : undefined} />
                </Field>
            ))}
            <div className="flex justify-end sm:col-span-2">
                <Button type="submit" variant="success" disabled={busy}>{busy ? "Registering…" : "Register learner"}</Button>
            </div>
        </form>
    );
}

function Advanced({ batches }: { batches: EnrolBatchOption[] }) {
    const [csv, setCsv] = useState("");
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [response, setResponse] = useState<{ data: BulkResponse; committed: boolean } | null>(null);
    const sample = `email,name,batch\nnew.learner@example.com,New Learner,${batches[0]?.name ?? "Batch name"}\nbad-email,Someone,${batches[0]?.name ?? "Batch name"}`;

    async function run(text: string, commit: boolean) {
        setError("");
        setBusy(true);
        try {
            const result = await apiClient.post<BulkResponse>("/api/admin/enrolments/bulk", { mode: "csv", csv: text, commit });
            setResponse({ data: result.data, committed: commit });
            if (commit) toast.success(`${result.data.summary.enrolled} learners enrolled`, { description: result.data.summary.errors ? `${result.data.summary.errors} rows need fixing` : undefined });
        } catch (caught) {
            setResponse(null);
            setError(caught instanceof ApiError ? (caught.fields.csv ?? caught.message) : failure(caught));
        } finally {
            setBusy(false);
        }
    }

    const checked = response && !response.committed ? response.data : null;
    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Advanced bulk enrollment</h2>
            <p className="text-sm text-muted">
                Upload a CSV with the columns <code className="rounded bg-surface-muted px-1">email</code>, <code className="rounded bg-surface-muted px-1">batch</code> and optionally <code className="rounded bg-surface-muted px-1">name</code> (needed for new learners).
                Every row is checked first; nothing is enrolled until you confirm. Up to 500 rows per file.
            </p>
            <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2">
                    <FileSpreadsheet className="size-4" aria-hidden="true" />
                    Choose CSV file
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        className="sr-only"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            if (file.size > MAX_FILE_BYTES) {
                                setError("The file is larger than 500 KB.");
                                return;
                            }
                            const text = await file.text();
                            setFileName(file.name);
                            setCsv(text);
                            await run(text, false);
                        }}
                    />
                </label>
                <Button variant="ghost" disabled={busy} onClick={() => { setFileName("sample.csv"); setCsv(sample); void run(sample, false); }}>Use sample file</Button>
                {fileName ? <span className="text-sm text-muted">{fileName}</span> : null}
            </div>
            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
            {response ? (
                <>
                    <SummaryBadges summary={response.data.summary} committed={response.committed} />
                    <ResultsTable results={response.data.results} />
                </>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
                {response?.committed ? <Button onClick={() => downloadResults(response.data.results)}>Download results</Button> : null}
                {checked && checked.summary.ready > 0 ? <Button variant="success" disabled={busy} onClick={() => void run(csv, true)}>{busy ? "Enrolling…" : `Enrol ${checked.summary.ready} ${checked.summary.ready === 1 ? "learner" : "learners"}`}</Button> : null}
            </div>
        </div>
    );
}
