"use client";

import { Badge } from "@/components/ui/Badge";
import { BarChart, type ChartType } from "@/components/ui/BarChart";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChartViewSwitch } from "@/components/ui/ChartViewSwitch";
import { DatePicker } from "@/components/ui/DatePicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { TableHeading, TableScroll } from "@/components/ui/Table";
import type { ScreenStatus } from "@/lib/admin/navigation";
import type { ReportColumn, ReportData, ReportMeta, ReportRow } from "@/lib/admin/reports";
import { lastDays } from "@/lib/admin/reports";
import { buildQuery } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { cardCycle, palette, type ColorKey } from "@/lib/colors";
import { formatDate, formatNumber } from "@/lib/format";
import { useDebounced } from "@/lib/use-debounced";
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, CalendarDays, ChartColumn, ChevronLeft, ChevronRight, ClipboardList, Download, FileSearch, FileText, Filter, Hash, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../PageHeader";

type Option = { value: string; label: string };
type Scope = { preset: string; from: string; to: string; branch: string; course: string };

const PAGE_SIZE = 25;
const presets: Option[] = [
    { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" },
    { value: "365", label: "Last 12 months" }, { value: "custom", label: "Choose dates" },
];
const statColors: ColorKey[] = ["blue", "emerald", "violet", "orange"];

const size = (megabytes: number) => (megabytes >= 1024 ? `${formatNumber(Math.round((megabytes / 1024) * 100) / 100)} GB` : `${formatNumber(megabytes)} MB`);

function cellText(column: ReportColumn, value: ReportRow[string]) {
    if (value === null || value === "") return "\u2014";
    if (column.kind === "number") return formatNumber(Number(value));
    if (column.kind === "percent") return `${value}%`;
    if (column.kind === "size") return size(Number(value));
    if (column.kind === "date") return formatDate(String(value));
    return String(value);
}

export function LiveAnalyticsPage({ page, title, description, status, reports, today, branches, courses, canExport }: {
    page: string;
    title: string;
    description: string;
    status: ScreenStatus;
    reports: ReportMeta[];
    today: string;
    branches: Option[];
    courses: Option[];
    canExport: boolean;
}) {
    const [reportKey, setReportKey] = useState(reports.find((report) => !report.waitsFor)?.key ?? reports[0].key);
    const [scope, setScope] = useState<Scope>({ preset: "30", ...lastDays(today, 30), branch: "", course: "" });
    const selected = reports.find((report) => report.key === reportKey) ?? reports[0];
    return (
        <>
            <PageHeader title={title} description={description} status={status} />
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <span className={cn("flex size-9 items-center justify-center rounded-xl", palette.amber.tile)}><ClipboardList className="size-5" aria-hidden="true" /></span>
                Reports<Badge tone="accent">{reports.length}</Badge>
            </h2>
            <ul className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {reports.map((report, index) => {
                    const color = palette[cardCycle[index % cardCycle.length]];
                    const active = report.key === selected.key;
                    return (
                        <li key={report.key} className="min-w-0">
                            <button
                                type="button"
                                aria-pressed={active}
                                disabled={Boolean(report.waitsFor)}
                                onClick={() => setReportKey(report.key)}
                                className={cn(
                                    "relative flex h-full w-full flex-col items-start gap-2 overflow-hidden rounded-2xl border bg-surface p-4 text-left shadow-card transition-colors",
                                    active ? "border-accent ring-2 ring-accent/30" : "border-border",
                                    report.waitsFor ? "cursor-not-allowed opacity-70" : "hover:border-accent/40 hover:bg-accent-soft/30",
                                )}
                            >
                                <span className={cn("absolute inset-x-0 top-0 h-1", color.bar)} aria-hidden="true" />
                                <span className="flex w-full items-start justify-between gap-2">
                                    <span className="break-words font-semibold">{report.title}</span>
                                    {report.waitsFor ? <Badge tone="neutral">Waiting</Badge> : <Badge tone="success">Live data</Badge>}
                                </span>
                                <span className="text-sm leading-relaxed text-muted">{report.description}</span>
                                {report.waitsFor ? <span className="mt-auto text-xs font-medium text-muted">Needs: {report.waitsFor}</span> : null}
                            </button>
                        </li>
                    );
                })}
            </ul>
            <ReportView key={selected.key} page={page} report={selected} today={today} scope={scope} setScope={setScope} branches={branches} courses={courses} canExport={canExport} />
        </>
    );
}

function ReportView({ page, report, today, scope, setScope, branches, courses, canExport }: {
    page: string;
    report: ReportMeta;
    today: string;
    scope: Scope;
    setScope: (next: Scope) => void;
    branches: Option[];
    courses: Option[];
    canExport: boolean;
}) {
    const [recordStatus, setRecordStatus] = useState("");
    const [search, setSearch] = useState("");
    const words = useDebounced(search.trim(), 300);
    const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [chartType, setChartType] = useState<ChartType>("bar");
    const [exporting, setExporting] = useState(false);

    const filters = {
        from: report.filters.range ? scope.from : undefined,
        to: report.filters.range ? scope.to : undefined,
        branch: report.filters.branch ? scope.branch : undefined,
        course: report.filters.course ? scope.course : undefined,
        status: report.filters.status ? recordStatus : undefined,
        q: words,
        sort: sort?.key,
        dir: sort?.dir,
    };
    const url = `/api/admin/analytics/${page}/${report.key}`;
    const result = useApiQuery<ReportData>(url, { ...filters, page: pageNumber, pageSize: PAGE_SIZE });
    const data = result.data;
    const total = result.meta?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const current = Math.min(pageNumber, pages);
    const dateError = report.filters.range && scope.preset === "custom" && scope.to < scope.from;
    const activeFilters = [report.filters.branch && scope.branch, report.filters.course && scope.course, recordStatus, search].filter(Boolean).length;

    const change = (next: Partial<Scope>) => {
        setScope({ ...scope, ...next });
        setPageNumber(1);
    };
    const clear = () => {
        setScope({ ...scope, branch: "", course: "" });
        setRecordStatus("");
        setSearch("");
        setPageNumber(1);
    };
    const choosePreset = (preset: string) => change(preset === "custom" ? { preset } : { preset, ...lastDays(today, Number(preset)) });

    async function exportCsv() {
        setExporting(true);
        try {
            const response = await fetch(`${url}/export${buildQuery(filters)}`, { credentials: "same-origin" });
            if (!response.ok) {
                const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
                toast.error(body?.error?.message ?? "The export did not work. Try again.");
                return;
            }
            const link = document.createElement("a");
            link.href = URL.createObjectURL(await response.blob());
            link.download = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? `${report.key}.csv`;
            document.body.append(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(link.href);
        } catch {
            toast.error("Could not reach the server. Check your connection and try again.");
        } finally {
            setExporting(false);
        }
    }

    const order = sort ?? data?.sort ?? report.defaultSort;
    const toggle = (column: ReportColumn) =>
        setSort({ key: column.key, dir: order.key === column.key ? (order.dir === "asc" ? "desc" : "asc") : column.kind === "number" || column.kind === "percent" || column.kind === "size" ? "desc" : "asc" });
    const first = total === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
    const loading = result.status === "loading";

    return (
        <div aria-busy={loading}>
            <Card className="mb-6 overflow-hidden">
                <CardHeader
                    className="bg-linear-to-r from-sky-50 to-violet-50 dark:from-sky-500/10 dark:to-violet-500/10"
                    title={<span className="flex items-center gap-2.5"><span className={cn("flex size-9 items-center justify-center rounded-xl", palette.sky.solid)}><Filter className="size-4" aria-hidden="true" /></span>{report.title}</span>}
                    description={report.description}
                    actions={<Button variant="soft-info" disabled={activeFilters === 0} onClick={clear}><RotateCcw className="size-4" aria-hidden="true" />Clear filters{activeFilters ? <span className="rounded-full bg-info/10 px-1.5 text-xs">{activeFilters}</span> : null}</Button>}
                />
                <div className="space-y-4 p-5">
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {report.filters.range ? (
                            <Field id="report-period" label="Period">
                                <Select id="report-period" value={scope.preset} onValueChange={choosePreset} options={presets} />
                            </Field>
                        ) : null}
                        {report.filters.range && scope.preset === "custom" ? (
                            <>
                                <Field id="report-from" label="From"><DatePicker id="report-from" value={scope.from} max={today} onValueChange={(value) => value && change({ from: value })} /></Field>
                                <Field id="report-to" label="To" error={dateError ? "The end date cannot be before the start date." : undefined}><DatePicker id="report-to" value={scope.to} max={today} onValueChange={(value) => value && change({ to: value })} /></Field>
                            </>
                        ) : null}
                        {report.filters.branch ? (
                            <Field id="report-branch" label="Branch">
                                <Select id="report-branch" value={scope.branch} onValueChange={(value) => change({ branch: value })} options={[{ value: "", label: "All branches" }, ...branches]} />
                            </Field>
                        ) : null}
                        {report.filters.course ? (
                            <Field id="report-course" label="Course">
                                <Select id="report-course" value={scope.course} onValueChange={(value) => change({ course: value })} options={[{ value: "", label: "All courses" }, ...courses]} />
                            </Field>
                        ) : null}
                        {report.filters.status ? (
                            <Field id="report-status" label="Status">
                                <Select id="report-status" value={recordStatus} onValueChange={(value) => { setRecordStatus(value); setPageNumber(1); }} options={[{ value: "", label: "All statuses" }, ...report.filters.status.map((value) => ({ value, label: value }))]} />
                            </Field>
                        ) : null}
                        <Field id="report-search" label="Search the table">
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted" aria-hidden="true" />
                                <input id="report-search" type="search" className={cn(inputClass, "pl-9")} value={search} onChange={(event) => { setSearch(event.target.value); setPageNumber(1); }} placeholder="Any value in the rows" />
                            </div>
                        </Field>
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                        {report.filters.range ? `Showing ${formatDate(scope.from)} to ${formatDate(scope.to)} (India time). ` : "A snapshot of how things stand now. "}
                        Search narrows the table and the CSV file; the figures and the chart above them follow the other filters.
                    </p>
                </div>
            </Card>

            {result.status === "error" && !data ? (
                <Card className="p-5">
                    <EmptyState icon={<FileSearch />} title="The report could not be loaded" description={result.error?.message} action={<Button variant="soft-info" onClick={result.refetch}>Try again</Button>} />
                </Card>
            ) : !data ? (
                <p role="status" className="p-6 text-center text-sm text-muted">Loading the report…</p>
            ) : (
                <>
                    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {(result.meta?.summary ?? []).map((card, index) => <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} color={statColors[index % statColors.length]} icon={<ChartColumn />} />)}
                    </div>
                    <Card className="mb-6 min-w-0 overflow-hidden">
                        <CardHeader
                            className="bg-linear-to-r from-violet-50 to-sky-50 dark:from-violet-500/10 dark:to-sky-500/10"
                            title={<span className="flex items-center gap-2"><ChartColumn className={cn("size-5 shrink-0", palette.violet.text)} aria-hidden="true" />{data.chart?.title ?? report.title}</span>}
                            actions={data.chart ? <ChartViewSwitch value={chartType} onChange={setChartType} /> : undefined}
                        />
                        <div className="p-5">
                            {data.chart ? (
                                <BarChart
                                    chartType={chartType}
                                    title={data.chart.title}
                                    labels={data.chart.labels}
                                    format={(value) => `${formatNumber(Math.round(value * 100) / 100)}${data.chart?.unit ?? ""}`}
                                    series={[{ label: data.chart.seriesLabel, values: data.chart.values, colorClass: "fill-accent", swatchClass: "bg-accent" }]}
                                />
                            ) : (
                                <EmptyState icon={<FileSearch />} title="Nothing to chart" description="No rows match these filters." />
                            )}
                        </div>
                    </Card>

                    <Card className="min-w-0 overflow-hidden">
                        <CardHeader
                            title={<span className="flex items-center gap-2"><ClipboardList className={cn("size-5 shrink-0", palette.amber.text)} aria-hidden="true" />Rows</span>}
                            description={<span role="status">{total === 0 ? "No rows match these filters." : `Showing ${formatNumber(first)}\u2013${formatNumber(Math.min(total, current * PAGE_SIZE))} of ${formatNumber(total)}`}</span>}
                            actions={canExport ? <Button variant="success" disabled={total === 0 || exporting} onClick={exportCsv}><Download className="size-4" aria-hidden="true" />{exporting ? "Preparing…" : `Export ${formatNumber(total)} ${total === 1 ? "row" : "rows"}`}</Button> : undefined}
                        />
                        {data.truncated ? <p className="border-b border-border bg-gold-soft px-5 py-2 text-xs">This report is long, so only the first 10,000 rows are included. Narrow the filters to see the rest.</p> : null}
                        <TableScroll label={`${report.title} rows`} className="admin-table-card">
                            <table className="admin-data-table">
                                <caption className="sr-only">{report.title}</caption>
                                <thead>
                                    <tr>
                                        {data.columns.map((column) => {
                                            const Icon = column.kind === "date" ? CalendarDays : column.kind === "text" || !column.kind ? FileText : Hash;
                                            const SortIcon = order.key === column.key ? (order.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                                            return (
                                                <th key={column.key} scope="col" aria-sort={order.key === column.key ? (order.dir === "asc" ? "ascending" : "descending") : "none"}>
                                                    <button type="button" className="inline-flex min-h-8 w-full items-center justify-between gap-2 text-left uppercase" onClick={() => toggle(column)}>
                                                        <TableHeading icon={Icon}>{column.label}</TableHeading>
                                                        <SortIcon className="size-3.5 shrink-0" aria-hidden="true" />
                                                    </button>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.rows.map((row, index) => (
                                        <tr key={index}>
                                            {data.columns.map((column) => (
                                                <td key={column.key} className={cn(column.kind && column.kind !== "text" && column.kind !== "date" && "text-right tabular-nums")}>{cellText(column, row[column.key])}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {data.rows.length === 0 ? <tr><td colSpan={data.columns.length} className="p-5 text-center text-muted">Nothing to show for these filters.</td></tr> : null}
                                </tbody>
                            </table>
                        </TableScroll>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4">
                            <Button variant="soft-info" disabled={current <= 1} onClick={() => setPageNumber(current - 1)}><ChevronLeft className="size-4" aria-hidden="true" />Previous</Button>
                            <span className="rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">Page {current} of {pages}</span>
                            <Button variant="soft-violet" disabled={current >= pages} onClick={() => setPageNumber(current + 1)}>Next<ChevronRight className="size-4" aria-hidden="true" /></Button>
                        </div>
                    </Card>
                </>
            )}
            {result.status === "error" && data ? <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-danger"><ArrowRight className="size-4" aria-hidden="true" />{result.error?.message} <button type="button" className="font-semibold underline" onClick={result.refetch}>Try again</button></p> : null}
        </div>
    );
}
