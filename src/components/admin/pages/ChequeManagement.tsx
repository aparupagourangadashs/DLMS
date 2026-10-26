"use client";

import { useState } from "react";
import { Banknote, Building2, CalendarDays, CircleCheck, Clock3, Download, FileText, History, Landmark, RefreshCw, Search, UserRound, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { palette } from "@/lib/colors";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { useDemoRecords } from "@/lib/admin/use-demo-records";
import { downloadDemoCsv } from "@/lib/admin/demo-csv";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field, inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TableHeading, TableScroll } from "@/components/ui/Table";
import { DemoNotice, PageHeader } from "../PageHeader";

type Status = "Pending" | "Deposited" | "Cleared" | "Bounced";
type Cheque = { id: string; student: string; parent: string; bank: string; number: string; date: string; amount: number; status: Status; remark: string; history: string[] };
const initial: Cheque[] = [
  { id: "cheque-1", student: "Demo Learner A", parent: "Demo Parent A", bank: "Demo National Bank", number: "DEMO-1001", date: "2026-10-24", amount: 2499, status: "Pending", remark: "Awaiting demo deposit", history: ["2026-10-24 · Pending · Sample record"] },
  { id: "cheque-2", student: "Demo Learner B", parent: "Demo Parent B", bank: "Demo City Bank", number: "DEMO-1002", date: "2026-10-20", amount: 1499, status: "Deposited", remark: "Demo deposit recorded", history: ["2026-10-20 · Deposited · Sample record"] },
  { id: "cheque-3", student: "Demo Learner C", parent: "Demo Parent C", bank: "Demo National Bank", number: "DEMO-1003", date: "2026-10-16", amount: 999, status: "Cleared", remark: "Synthetic clearance", history: ["2026-10-16 · Cleared · Sample record"] },
  { id: "cheque-4", student: "Demo Learner D", parent: "Demo Parent D", bank: "Demo Co-operative Bank", number: "DEMO-1004", date: "2026-10-05", amount: 499, status: "Bounced", remark: "Demo insufficient funds", history: ["2026-10-05 · Bounced · Sample record"] },
];
const statusTone = { Pending: "warning", Deposited: "info", Cleared: "success", Bounced: "danger" } as const;
const statusColor = { Pending: "amber", Deposited: "sky", Cleared: "emerald", Bounced: "rose" } as const;
const statusIcon = { Pending: Clock3, Deposited: Landmark, Cleared: CircleCheck, Bounced: XCircle };
const nextStatuses: Record<Status, Status[]> = { Pending: ["Deposited"], Deposited: ["Cleared", "Bounced"], Cleared: [], Bounced: ["Deposited"] };

export function ChequeManagement() {
  const [records, save] = useDemoRecords("dl-lms-demo-cheques-v1", initial);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [bank, setBank] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Cheque | null>(null);
  const [next, setNext] = useState<Status>("Deposited");
  const [remark, setRemark] = useState("");
  const [error, setError] = useState("");
  const invalidDates = !!(from && to && from > to);
  const rows = invalidDates ? [] : records.filter((cheque) => (!status || cheque.status === status) && (!bank || cheque.bank === bank) &&
    (!from || cheque.date >= from) && (!to || cheque.date <= to) &&
    `${cheque.student} ${cheque.parent} ${cheque.bank} ${cheque.number} ${cheque.remark}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (!nextStatuses[selected.status].includes(next)) { setError("Choose a permitted demo status transition."); return; }
    if (!remark.trim()) { setError("Add a remark explaining this demo status change."); return; }
    const updated: Cheque = { ...selected, status: next, remark: remark.trim(), history: [...selected.history, `${new Date().toISOString()} · ${next} · ${remark.trim()} (local demo)`] };
    save(records.map((cheque) => cheque.id === updated.id ? updated : cheque));
    setSelected(null);
  }
  return <>
    <PageHeader title="Cheque Management" description="Filter synthetic cheque records and explore a local status workflow." status="ready" actions={<Button variant="soft-success" disabled={!rows.length || invalidDates} onClick={() => downloadDemoCsv("demo-cheques.csv", ["Dataset", "Cheque date", "Student", "Parent", "Bank", "Cheque", "Amount (INR)", "Status", "Remark"], rows.map((cheque) => ["SYNTHETIC DEMO", cheque.date, cheque.student, cheque.parent, cheque.bank, cheque.number, cheque.amount, cheque.status, cheque.remark]))}><Download className="size-4" aria-hidden="true" />Export filtered CSV</Button>} />
    <DemoNotice>Browser-local demo only. The observed live list and filters are represented, but operational actions were not verified. The status flow below is a proposal: Pending → Deposited → Cleared / Bounced; a bounced cheque can be re-deposited. No bank, ledger, enrollment or real payment is changed.</DemoNotice>
    <section className="mb-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4" aria-label="Cheque status summary">{(["Pending", "Deposited", "Cleared", "Bounced"] as Status[]).map((value) => { const Icon = statusIcon[value]; const matching = records.filter((cheque) => cheque.status === value); return <StatCard key={value} label={value} value={String(matching.length)} hint={`${formatINR(matching.reduce((total, cheque) => total + cheque.amount, 0))} face value`} tone={statusTone[value]} color={statusColor[value]} icon={<Icon />} />; })}</section>
    <Card className="mb-4 overflow-hidden"><CardHeader className="bg-linear-to-r from-emerald-50 via-surface to-surface dark:from-emerald-500/10" title={<span className="inline-flex items-center gap-3"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", palette.emerald.solid)} aria-hidden="true"><Search className="size-4" /></span>Find cheques</span>} description="Search and filter by status, bank and cheque date." /><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      <Field id="cheque-search" label="Search student, parent, bank, cheque or remark"><div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-accent" aria-hidden="true" /><input id="cheque-search" type="search" className={cn(inputClass, "pl-9")} value={search} onChange={(event) => setSearch(event.target.value)} /></div></Field>
      <Field id="cheque-status" label="Status"><Select id="cheque-status" value={status} onValueChange={setStatus} options={["", "Pending", "Deposited", "Cleared", "Bounced"].map((value) => ({ value, label: value || "All statuses" }))} /></Field>
      <Field id="cheque-bank" label="Bank"><Select id="cheque-bank" value={bank} onValueChange={setBank} options={[{ value: "", label: "All banks" }, ...Array.from(new Set(records.map((cheque) => cheque.bank))).map((value) => ({ value, label: value }))]} /></Field>
      <Field id="cheque-from" label="Cheque date from"><DatePicker id="cheque-from" value={from} onValueChange={setFrom} /></Field>
      <Field id="cheque-to" label="Cheque date through"><DatePicker id="cheque-to" value={to} min={from} onValueChange={setTo} /></Field>
      <div className="flex items-end"><Button variant="soft-warning" onClick={() => { setSearch(""); setStatus(""); setBank(""); setFrom(""); setTo(""); }}><RefreshCw className="size-4" aria-hidden="true" />Clear filters</Button></div>
    </div></Card>
    {invalidDates && <p role="alert" className="mb-3 text-sm text-danger">End date must be on or after start date.</p>}
    <p role="status" className="mb-3 text-sm text-muted">{rows.length} matching demo cheques · {formatINR(rows.reduce((total, cheque) => total + cheque.amount, 0))} face value (not collected revenue)</p>
    <TableScroll label="Demo cheques" className="admin-table-card rounded-xl border border-border bg-surface">
      <table className="admin-data-table"><caption className="sr-only">Synthetic cheque register</caption><thead><tr>{([[CalendarDays, "Date"], [UserRound, "Student"], [UserRound, "Parent"], [Building2, "Bank / cheque"], [Banknote, "Amount"], [CircleCheck, "Status"], [FileText, "Remark"], [History, "Demo actions"]] as const).map(([Icon, column]) => <th scope="col" key={column}><TableHeading icon={Icon}>{column}</TableHeading></th>)}</tr></thead><tbody>{rows.map((cheque) => <tr key={cheque.id}><td>{cheque.date}</td><td><span className="inline-flex items-center gap-2 font-medium"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs", palette.teal.tile)} aria-hidden="true">{cheque.student.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>{cheque.student}</span></td><td>{cheque.parent}</td><td>{cheque.bank}<br /><span className="font-mono text-xs text-muted">{cheque.number}</span></td><td className="font-semibold tabular-nums">{formatINR(cheque.amount)}</td><td><Badge tone={statusTone[cheque.status]}>{(() => { const Icon = statusIcon[cheque.status]; return <Icon className="size-3" aria-hidden="true" />; })()}{cheque.status}</Badge></td><td>{cheque.remark}</td><td><Button size="sm" variant={nextStatuses[cheque.status].length ? "soft-success" : "soft-info"} onClick={() => { setSelected(cheque); setNext(nextStatuses[cheque.status][0] ?? cheque.status); setRemark(""); setError(""); }}><History className="size-3.5" aria-hidden="true" />{nextStatuses[cheque.status].length ? "Update demo status" : "View demo history"}</Button></td></tr>)}{!rows.length && <tr><td colSpan={8} className="p-5 text-center">No demo cheques match. Clear or adjust the filters.</td></tr>}</tbody></table>
    </TableScroll>
    <Modal open={selected !== null} onClose={() => setSelected(null)} title={`${selected?.number ?? ""} · Demo status`} variant="drawer">
      {selected && <><div className={cn("mb-4 rounded-2xl p-4 text-sm", palette[statusColor[selected.status]].tile)}><p className="font-semibold">{selected.student} · {formatINR(selected.amount)}</p><p className="mt-2">Currently <Badge tone={statusTone[selected.status]}>{selected.status}</Badge></p></div><h3 className="mb-2 flex items-center gap-2 font-semibold"><History className="size-4 text-info" aria-hidden="true" />Local demo history</h3><ul className="mb-5 space-y-2 text-sm text-muted">{selected.history.map((entry, i) => <li key={i} className="break-words rounded-xl border border-border bg-surface-muted p-3">{entry}</li>)}</ul>
        {nextStatuses[selected.status].length ? <form onSubmit={submit} className="space-y-4"><Field id="cheque-next-status" label="Next demo status"><Select id="cheque-next-status" value={next} onValueChange={(value) => setNext(value as Status)} options={nextStatuses[selected.status].map((value) => ({ value, label: value }))} /></Field><Field id="cheque-remark" label="Reason / remark" required><textarea id="cheque-remark" className={`${inputClass} h-24 py-3`} required maxLength={500} value={remark} onChange={(event) => { setRemark(event.target.value); setError(""); }} /></Field>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<p className="text-xs text-muted">This updates the browser demo only. It does not deposit, settle, reverse or re-present a cheque.</p><div className="flex flex-wrap justify-end gap-2"><Button onClick={() => setSelected(null)}>Cancel</Button><Button type="submit" variant="success"><CircleCheck className="size-4" aria-hidden="true" />Save demo status</Button></div></form> : <p className="text-sm">Cleared is final in this proposed demo flow. No real settlement has occurred.</p>}</>}
    </Modal>
  </>;
}
