"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TableHeading, TableScroll } from "@/components/ui/Table";
import type { AuditOptions, AuditRow } from "@/lib/admin/audit";
import type { ScreenStatus } from "@/lib/admin/navigation";
import { useApiQuery, useResourceList } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { addDays } from "@/lib/ist";
import { useDebounced } from "@/lib/use-debounced";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, ChevronLeft, ChevronRight, Eye, FileSearch, FileText, Filter, Hash, RotateCcw, Search, UserRound } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../PageHeader";

type Option = { value: string; label: string };
type SortKey = "when" | "action" | "entity";

const PAGE_SIZE = 25;
const presets: Option[] = [
    { value: "1", label: "Today" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" }, { value: "all", label: "All time" }, { value: "custom", label: "Choose dates" },
];

const stamp = (seconds: boolean) =>
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), hour12: true, timeZone: "Asia/Kolkata" });
const shortStamp = stamp(false);
const longStamp = stamp(true);
const shortId = (id: string) => (id.length > 12 ? `${id.slice(0, 8)}\u2026` : id);

function Json({ value }: { value: unknown }) {
    if (value === null || value === undefined) return <span className="text-muted">Not recorded</span>;
    return <pre className="max-h-72 overflow-auto rounded-lg bg-surface-muted p-3 text-xs leading-relaxed break-words whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>;
}

export function AuditLogPage({ title, description, status, today }: { title: string; description: string; status: ScreenStatus; today: string }) {
    const [preset, setPreset] = useState("7");
    const [custom, setCustom] = useState({ from: addDays(today, -6), to: today });
    const [actor, setActor] = useState("");
    const [action, setAction] = useState("");
    const [entity, setEntity] = useState("");
    const [search, setSearch] = useState("");
    const words = useDebounced(search.trim(), 300);
    const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [viewing, setViewing] = useState<AuditRow | null>(null);

    const options = useApiQuery<AuditOptions>("/api/admin/audit/options").data;
    const range = preset === "all" ? {} : preset === "custom" ? custom : { from: addDays(today, 1 - Number(preset)), to: today };
    const dateError = preset === "custom" && custom.to < custom.from;
    const list = useResourceList<AuditRow>(
        "/api/admin/audit",
        { ...range, q: words, "filter.actor": actor, "filter.action": action, "filter.entity": entity, sort: sort?.key, dir: sort?.dir, page: pageNumber, pageSize: PAGE_SIZE },
        { enabled: !dateError },
    );

    const total = list.meta?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const current = Math.min(pageNumber, pages);
    const first = total === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
    const activeFilters = [actor, action, entity, search].filter(Boolean).length;
    const order = sort ?? { key: "when" as const, dir: "desc" as const };

    const filter = (change: () => void) => {
        change();
        setPageNumber(1);
    };
    const toggle = (key: SortKey) => setSort({ key, dir: order.key === key ? (order.dir === "asc" ? "desc" : "asc") : key === "when" ? "desc" : "asc" });
    const clear = () => {
        setActor("");
        setAction("");
        setEntity("");
        setSearch("");
        setPageNumber(1);
    };

    const heading = (key: SortKey, label: string, Icon: typeof CalendarDays) => {
        const SortIcon = order.key === key ? (order.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
        return (
            <th scope="col" aria-sort={order.key === key ? (order.dir === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" className="inline-flex min-h-8 w-full items-center justify-between gap-2 text-left uppercase" onClick={() => toggle(key)}>
                    <TableHeading icon={Icon}>{label}</TableHeading>
                    <SortIcon className="size-3.5 shrink-0" aria-hidden="true" />
                </button>
            </th>
        );
    };

    return (
        <>
            <PageHeader title={title} description={description} status={status} />
            <Card className="mb-6 overflow-hidden">
                <CardHeader
                    title={<span className="flex items-center gap-2"><Filter className="size-5 shrink-0 text-accent" aria-hidden="true" />Filters</span>}
                    description="Every change made in the admin panel, and the sign-in and account actions of learners. Times are in India time."
                    actions={<Button variant="soft-info" disabled={activeFilters === 0} onClick={clear}><RotateCcw className="size-4" aria-hidden="true" />Clear filters{activeFilters ? <span className="rounded-full bg-info/10 px-1.5 text-xs">{activeFilters}</span> : null}</Button>}
                />
                <div className="grid min-w-0 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
                    <Field id="audit-period" label="Period">
                        <Select id="audit-period" value={preset} onValueChange={(value) => filter(() => setPreset(value))} options={presets} />
                    </Field>
                    {preset === "custom" ? (
                        <>
                            <Field id="audit-from" label="From"><DatePicker id="audit-from" value={custom.from} max={today} onValueChange={(value) => value && filter(() => setCustom({ ...custom, from: value }))} /></Field>
                            <Field id="audit-to" label="To" error={dateError ? "The end date cannot be before the start date." : undefined}><DatePicker id="audit-to" value={custom.to} max={today} onValueChange={(value) => value && filter(() => setCustom({ ...custom, to: value }))} /></Field>
                        </>
                    ) : null}
                    <Field id="audit-actor" label="Who">
                        <Select id="audit-actor" value={actor} onValueChange={(value) => filter(() => setActor(value))} options={[{ value: "", label: "Anyone" }, ...(options?.actors ?? [])]} />
                    </Field>
                    <Field id="audit-action" label="What happened">
                        <Select id="audit-action" value={action} onValueChange={(value) => filter(() => setAction(value))} options={[{ value: "", label: "Any action" }, ...(options?.actions ?? [])]} />
                    </Field>
                    <Field id="audit-entity" label="Record type">
                        <Select id="audit-entity" value={entity} onValueChange={(value) => filter(() => setEntity(value))} options={[{ value: "", label: "Any record type" }, ...(options?.entities ?? []).map((value) => ({ value, label: value }))]} />
                    </Field>
                    <Field id="audit-search" label="Search">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted" aria-hidden="true" />
                            <input id="audit-search" type="search" className={cn(inputClass, "pl-9")} value={search} onChange={(event) => filter(() => setSearch(event.target.value))} placeholder="Name, email, record id or address" />
                        </div>
                    </Field>
                </div>
            </Card>

            <Card className="min-w-0 overflow-hidden" aria-busy={list.status === "loading"}>
                <CardHeader
                    title={<span className="flex items-center gap-2"><FileText className="size-5 shrink-0 text-accent" aria-hidden="true" />Events</span>}
                    description={<span role="status">{list.status === "error" ? "The log could not be loaded." : dateError ? "Choose an end date that is not before the start date." : list.rows === undefined ? "Loading the log\u2026" : total === 0 ? "No events match these filters." : `Showing ${formatNumber(first)}\u2013${formatNumber(Math.min(total, current * PAGE_SIZE))} of ${formatNumber(total)}`}</span>}
                />
                {list.status === "error" && list.rows === undefined ? (
                    <div className="p-5">
                        <EmptyState icon={<FileSearch />} title="The audit log could not be loaded" description={list.error?.message} action={<Button variant="soft-info" onClick={list.refetch}>Try again</Button>} />
                    </div>
                ) : (
                    <>
                        <TableScroll label="Audit events" className="admin-table-card">
                            <table className="admin-data-table">
                                <caption className="sr-only">Audit events</caption>
                                <thead>
                                    <tr>
                                        {heading("when", "When", CalendarDays)}
                                        <th scope="col"><TableHeading icon={UserRound}>Who</TableHeading></th>
                                        {heading("action", "What happened", FileText)}
                                        {heading("entity", "Record", Hash)}
                                        <th scope="col"><TableHeading icon={FileText}>Details</TableHeading></th>
                                        <th scope="col"><span className="sr-only">Open</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(list.rows ?? []).map((row) => (
                                        <tr key={row.id}>
                                            <td className="whitespace-nowrap">{shortStamp.format(new Date(row.at))}</td>
                                            <td>
                                                <span className="block font-medium">{row.actorName}</span>
                                                <span className="block text-xs text-muted">{row.actorRole ?? "No account"}</span>
                                            </td>
                                            <td>
                                                <span className="block">{row.label}</span>
                                                <code className="block text-xs text-muted">{row.action}</code>
                                            </td>
                                            <td>
                                                <span className="block">{row.entity}</span>
                                                {row.entityId ? <code className="block text-xs text-muted" title={row.entityId}>{shortId(row.entityId)}</code> : null}
                                            </td>
                                            <td className="max-w-72 min-w-40 whitespace-normal">{row.summary || "\u2014"}</td>
                                            <td>
                                                <Button variant="soft-info" onClick={() => setViewing(row)} aria-label={`View details: ${row.label}, ${shortStamp.format(new Date(row.at))}`}>
                                                    <Eye className="size-4" aria-hidden="true" />View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {list.rows?.length === 0 ? <tr><td colSpan={6} className="p-5 text-center text-muted">Nothing to show for these filters.</td></tr> : null}
                                </tbody>
                            </table>
                        </TableScroll>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4">
                            <Button variant="soft-info" disabled={current <= 1} onClick={() => setPageNumber(current - 1)}><ChevronLeft className="size-4" aria-hidden="true" />Previous</Button>
                            <span className="rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">Page {current} of {pages}</span>
                            <Button variant="soft-violet" disabled={current >= pages} onClick={() => setPageNumber(current + 1)}>Next<ChevronRight className="size-4" aria-hidden="true" /></Button>
                        </div>
                    </>
                )}
            </Card>

            <Modal open={viewing !== null} onClose={() => setViewing(null)} title={viewing?.label ?? ""} description={viewing ? longStamp.format(new Date(viewing.at)) : undefined} variant="drawer" size="lg">
                {viewing ? (
                    <dl className="divide-y divide-border text-sm">
                        <div className="grid grid-cols-5 gap-3 py-3">
                            <dt className="col-span-2 text-muted">Who</dt>
                            <dd className="col-span-3 min-w-0 break-words">
                                <span className="block font-medium">{viewing.actorName}</span>
                                {viewing.actorEmail ? <span className="block text-muted">{viewing.actorEmail}</span> : null}
                                {viewing.actorRole ? <Badge tone="info" className="mt-1">{viewing.actorRole}</Badge> : null}
                            </dd>
                        </div>
                        <div className="grid grid-cols-5 gap-3 py-3">
                            <dt className="col-span-2 text-muted">Action</dt>
                            <dd className="col-span-3 min-w-0 break-words"><code>{viewing.action}</code></dd>
                        </div>
                        <div className="grid grid-cols-5 gap-3 py-3">
                            <dt className="col-span-2 text-muted">Record</dt>
                            <dd className="col-span-3 min-w-0 break-words">
                                {viewing.entity}
                                {viewing.entityId ? <code className="block text-xs text-muted">{viewing.entityId}</code> : null}
                            </dd>
                        </div>
                        <div className="grid grid-cols-5 gap-3 py-3">
                            <dt className="col-span-2 text-muted">Address</dt>
                            <dd className="col-span-3 min-w-0 break-words">{viewing.ip ?? "\u2014"}</dd>
                        </div>
                        <div className="py-3">
                            <dt className="mb-2 text-muted">Before</dt>
                            <dd><Json value={viewing.before} /></dd>
                        </div>
                        <div className="py-3">
                            <dt className="mb-2 text-muted">After</dt>
                            <dd><Json value={viewing.after} /></dd>
                        </div>
                    </dl>
                ) : null}
            </Modal>
        </>
    );
}
