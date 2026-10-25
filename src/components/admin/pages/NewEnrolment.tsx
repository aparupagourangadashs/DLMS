"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CircleAlert, CircleCheck, FileSpreadsheet, UserPlus, Users, UsersRound } from "lucide-react";
import { batches } from "@/lib/admin/demo-data";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { DemoNotice, PageHeader } from "../PageHeader";

type Mode = "single" | "bulk" | "registration" | "advanced";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const modes: Array<{ value: Mode; label: string; description: string; Icon: typeof UserPlus }> = [
  { value: "single", label: "Single Enrollment", description: "Enrol one learner into a batch by email.", Icon: UserPlus },
  { value: "bulk", label: "Bulk Enrollment", description: "Paste many emails to enrol into one batch.", Icon: Users },
  { value: "registration", label: "Learner Registration", description: "Create a learner account without enrolling.", Icon: UsersRound },
  { value: "advanced", label: "Advanced Bulk Enrollment", description: "Upload a CSV with per-learner batches.", Icon: FileSpreadsheet },
];

export function NewEnrolment({ knownEmails }: { knownEmails: string[] }) {
  const [mode, setMode] = useState<Mode>("single");
  const known = useMemo(() => new Set(knownEmails), [knownEmails]);

  return (
    <>
      <PageHeader title="New Enrolment" description="Add learners to batches individually or in bulk." status="ready" />
      <DemoNotice />

      <fieldset className="mb-6">
        <legend className="sr-only">Enrolment type</legend>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modes.map((m) => (
            <label
              key={m.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-2xl border bg-surface p-4 shadow-card transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                mode === m.value ? "border-accent bg-accent-soft" : "border-border hover:bg-accent-soft/40",
              )}
            >
              <input type="radio" name="mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="sr-only" />
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", mode === m.value ? "bg-accent text-accent-fg" : "bg-surface-muted text-muted")} aria-hidden="true">
                <m.Icon className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{m.label}</span>
                <span className="block text-xs text-muted">{m.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Card className="max-w-3xl p-5">
        {mode === "single" ? <Single key="single" known={known} /> : null}
        {mode === "bulk" ? <Bulk key="bulk" known={known} /> : null}
        {mode === "registration" ? <Registration key="registration" known={known} /> : null}
        {mode === "advanced" ? <Advanced key="advanced" known={known} /> : null}
      </Card>
    </>
  );
}

function BatchSelect({ id, value, onChange, error }: { id: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field id={id} label="Batch" required error={error}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}>
        <option value="">Select a batch…</option>
        {batches.map((b) => (
          <option key={b.name} value={b.name}>
            {b.name} · {b.course}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Single({ known }: { known: Set<string> }) {
  const [email, setEmail] = useState("");
  const [batch, setBatch] = useState("");
  const [step, setStep] = useState<"start" | "new">("start");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const finish = (who: string) => {
    toast.success("Learner enrolled", { description: `${who} → ${batch}` });
    setEmail("");
    setBatch("");
    setName("");
    setStep("start");
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!emailRe.test(email.trim())) errs.email = "Enter a valid email address.";
        if (!batch) errs.batch = "Choose a batch.";
        if (step === "new" && !name.trim()) errs.name = "Name is required for a new learner.";
        setErrors(errs);
        if (Object.keys(errs).length) return;
        if (step === "start" && !known.has(email.trim().toLowerCase())) {
          setStep("new");
          return;
        }
        finish(step === "new" ? name.trim() : email.trim());
      }}
    >
      <h2 className="text-lg font-semibold">Single enrollment</h2>
      <Field id="se-email" label="Learner email" required error={errors.email} help="Try an existing address such as one from the Learners list.">
        <input
          id="se-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setStep("start");
          }}
          className={inputClass}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "se-email-error" : "se-email-help"}
        />
      </Field>
      <BatchSelect id="se-batch" value={batch} onChange={setBatch} error={errors.batch} />
      {step === "new" ? (
        <div className="rounded-xl border border-info/30 bg-info-soft p-4">
          <p className="mb-3 text-sm">
            <strong>No account found</strong> for {email}. Add a name to register and enrol them.
          </p>
          <Field id="se-name" label="Full name" required error={errors.name}>
            <input id="se-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus aria-invalid={errors.name ? true : undefined} />
          </Field>
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" variant="success">
          {step === "new" ? "Register and enrol" : "Proceed"}
        </Button>
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

function Bulk({ known }: { known: Set<string> }) {
  const [text, setText] = useState("");
  const [batch, setBatch] = useState("");
  const [error, setError] = useState("");
  const result = useMemo(() => parseEmails(text), [text]);
  const newCount = result.valid.filter((e) => !known.has(e)).length;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!batch) return setError("Choose a batch.");
        if (!result.valid.length) return setError("Add at least one valid email.");
        toast.success(`${result.valid.length} learners enrolled`, { description: `${newCount} new accounts created · ${batch}` });
        setText("");
        setBatch("");
        setError("");
      }}
    >
      <h2 className="text-lg font-semibold">Bulk enrollment</h2>
      <Field id="be-emails" label="Learner emails" required help="One per line, or separated by commas.">
        <textarea id="be-emails" rows={7} value={text} onChange={(e) => setText(e.target.value)} className={cn(inputClass, "h-auto py-2 font-mono text-xs")} aria-describedby="be-emails-help" />
      </Field>
      <BatchSelect id="be-batch" value={batch} onChange={setBatch} />
      {text.trim() ? (
        <div className="flex flex-wrap gap-2 text-sm" role="status">
          <Badge tone="success">{result.valid.length} valid</Badge>
          <Badge tone="info">{newCount} new accounts</Badge>
          {result.invalid.length ? <Badge tone="danger">{result.invalid.length} invalid</Badge> : null}
          {result.duplicates ? <Badge tone="warning">{result.duplicates} duplicates skipped</Badge> : null}
        </div>
      ) : null}
      {result.invalid.length ? <p className="text-xs text-danger">Invalid: {result.invalid.slice(0, 5).join(", ")}{result.invalid.length > 5 ? "…" : ""}</p> : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" variant="success">
          Enrol {result.valid.length || ""} learners
        </Button>
      </div>
    </form>
  );
}

function Registration({ known }: { known: Set<string> }) {
  const [values, setValues] = useState({ name: "", email: "", phone: "", city: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!values.name.trim()) errs.name = "Name is required.";
        if (!emailRe.test(values.email.trim())) errs.email = "Enter a valid email address.";
        else if (known.has(values.email.trim().toLowerCase())) errs.email = "A learner with this email already exists.";
        if (!/^\+?[\d\s-]{8,}$/.test(values.phone.trim())) errs.phone = "Enter a valid mobile number.";
        setErrors(errs);
        if (Object.keys(errs).length) return;
        toast.success("Learner registered", { description: `${values.name} can now be enrolled into a batch.` });
        setValues({ name: "", email: "", phone: "", city: "" });
      }}
    >
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
        <Button type="submit" variant="success">
          Register learner
        </Button>
      </div>
    </form>
  );
}

type CsvRow = { line: number; email: string; name: string; batch: string; issues: string[] };

function parseCsv(text: string, known: Set<string>): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const idx = (k: string) => header.indexOf(k);
  const batchNames = new Set(batches.map((b) => b.name));
  const seen = new Set<string>();
  return lines.slice(1).map((l, i) => {
    const cells = l.split(",").map((c) => c.trim());
    const email = (cells[idx("email")] ?? "").toLowerCase();
    const name = cells[idx("name")] ?? "";
    const batch = cells[idx("batch")] ?? "";
    const issues: string[] = [];
    if (!emailRe.test(email)) issues.push("Invalid email");
    if (seen.has(email)) issues.push("Duplicate in file");
    if (!batchNames.has(batch)) issues.push("Unknown batch");
    if (!name && !known.has(email)) issues.push("Name needed for new learner");
    seen.add(email);
    return { line: i + 2, email, name, batch, issues };
  });
}

function Advanced({ known }: { known: Set<string> }) {
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const ok = rows?.filter((r) => !r.issues.length) ?? [];
  const sample = `email,name,batch\nnew.learner@example.com,New Learner,${batches[0].name}\nbad-email,Someone,${batches[1].name}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Advanced bulk enrollment</h2>
      <p className="text-sm text-muted">
        Upload a CSV with the columns <code className="rounded bg-surface-muted px-1">email</code>, <code className="rounded bg-surface-muted px-1">name</code> and{" "}
        <code className="rounded bg-surface-muted px-1">batch</code>. Every row is checked before anything is enrolled.
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
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                setError("File is larger than 2 MB.");
                return;
              }
              setError("");
              setFileName(file.name);
              setRows(parseCsv(await file.text(), known));
            }}
          />
        </label>
        <Button
          variant="ghost"
          onClick={() => {
            setFileName("sample.csv");
            setRows(parseCsv(sample, known));
          }}
        >
          Use sample file
        </Button>
        {fileName ? <span className="text-sm text-muted">{fileName}</span> : null}
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {rows ? (
        rows.length === 0 ? (
          <p className="text-sm text-danger" role="alert">
            The file has no data rows.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" role="status">
              <Badge tone="success">{ok.length} ready</Badge>
              {rows.length - ok.length ? <Badge tone="danger">{rows.length - ok.length} need fixing</Badge> : null}
            </div>
            <div className="relative overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Validation results</caption>
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60 text-left text-xs text-muted uppercase">
                    <th scope="col" className="px-3 py-2">Line</th>
                    <th scope="col" className="px-3 py-2">Email</th>
                    <th scope="col" className="px-3 py-2">Name</th>
                    <th scope="col" className="px-3 py-2">Batch</th>
                    <th scope="col" className="px-3 py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.line} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted tabular-nums">{r.line}</td>
                      <td className="px-3 py-2">{r.email || "—"}</td>
                      <td className="px-3 py-2">{r.name || "—"}</td>
                      <td className="px-3 py-2">{r.batch || "—"}</td>
                      <td className="px-3 py-2">
                        {r.issues.length ? (
                          <span className="inline-flex items-center gap-1 text-danger">
                            <CircleAlert className="size-4" aria-hidden="true" />
                            {r.issues.join("; ")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CircleCheck className="size-4" aria-hidden="true" />
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button
                variant="success"
                disabled={!ok.length}
                onClick={() => {
                  toast.success(`${ok.length} learners enrolled`, { description: `${rows.length - ok.length} rows skipped. Fix them and upload again.` });
                  setRows(null);
                  setFileName("");
                }}
              >
                Enrol {ok.length} valid rows
              </Button>
            </div>
          </>
        )
      ) : null}
    </div>
  );
}
